/**
 * POST /api/ai/recommendations
 * AI-powered product recommendations with per-client rate limiting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();

  const rate = await checkRateLimit(`recommendations:${getRequestIdentity(request, user?.id)}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many recommendation requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))) } }
    );
  }

  let body: {
    currentProductId?: string;
    currentCategory?: string;
    userInterests?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const currentProductId = typeof body.currentProductId === 'string' ? body.currentProductId.slice(0, 100) : undefined;
  const currentCategory = typeof body.currentCategory === 'string' ? body.currentCategory.slice(0, 100) : undefined;
  const userInterests = Array.isArray(body.userInterests)
    ? body.userInterests
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim().slice(0, 100))
        .filter(Boolean)
        .slice(0, 10)
    : [];

  const supabase = createServiceClient();
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id, name, slug, short_desc, category, tags,
      plans:product_plans(price, billing_period, is_active)
    `)
    .eq('status', 'active')
    .limit(50);

  if (productsError || !products) {
    console.error('[recommendations] product load failed:', productsError?.message);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }

  let purchasedProductIds: string[] = [];
  let purchasedCategories: string[] = [];

  if (user) {
    const { data: orders } = await supabase
      .from('orders')
      .select('product_id, products(category)')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .limit(20);

    if (orders) {
      purchasedProductIds = orders.map((o) => o.product_id).filter((id): id is string => typeof id === 'string');
      purchasedCategories = orders
        .map((o) => (o.products as { category?: string } | null)?.category)
        .filter((value): value is string => typeof value === 'string');
    }
  }

  const candidateProducts = products.filter(
    (p) => p.id !== currentProductId && !purchasedProductIds.includes(p.id)
  );

  if (candidateProducts.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  const productList = candidateProducts.slice(0, 30).map((p) => {
    const activePlans = (p.plans ?? []).filter((pl: { is_active: boolean }) => pl.is_active);
    const lowestPrice = activePlans.length > 0
      ? Math.min(...activePlans.map((pl: { price: number }) => Number(pl.price)))
      : 0;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      description: (p.short_desc ?? '').slice(0, 800),
      tags: (p.tags ?? []).join(', ').slice(0, 400),
      price: Number.isFinite(lowestPrice) ? lowestPrice : 0,
    };
  });

  const contextInfo = [
    currentCategory ? `Current product category: ${currentCategory}` : '',
    purchasedCategories.length > 0 ? `Purchased categories: ${[...new Set(purchasedCategories)].join(', ')}` : '',
    userInterests.length > 0 ? `User interests: ${userInterests.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  const fallback = candidateProducts
    .filter((p) => !currentCategory || p.category === currentCategory)
    .slice(0, 4);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ recommendations: fallback });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a product recommendation ranker. Return only a JSON array containing up to four IDs from the supplied product list.',
        },
        {
          role: 'user',
          content: `Context:\n${contextInfo || 'No specific context'}\nProducts: ${JSON.stringify(productList)}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content?.trim() ?? '[]';
    let rawIds: unknown = [];
    try {
      rawIds = JSON.parse(responseText);
    } catch {
      rawIds = [];
    }

    const validIds = new Set(candidateProducts.map((p) => p.id));
    const recommendedIds = Array.isArray(rawIds)
      ? [...new Set(rawIds.filter((id): id is string => typeof id === 'string' && validIds.has(id)))].slice(0, 4)
      : [];

    const recommendations = recommendedIds.length > 0
      ? recommendedIds
          .map((id) => candidateProducts.find((p) => p.id === id))
          .filter(Boolean)
          .slice(0, 4)
      : fallback;

    return NextResponse.json(
      { recommendations },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.warn('[recommendations] AI ranking failed:', err);
    return NextResponse.json({ recommendations: fallback });
  }
}

