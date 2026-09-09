/**
 * POST /api/ai/semantic-search
 * Public AI product search with burst protection and result validation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  const rate = await checkRateLimit(`semantic-search:${getRequestIdentity(request)}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many searches. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))) } }
    );
  }

  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (!query) return NextResponse.json({ error: 'query is required' }, { status: 400 });
  if (query.length > 200) return NextResponse.json({ error: 'Query too long' }, { status: 400 });

  const supabase = createServiceClient();
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id, name, slug, short_desc, description, category, tags,
      plans:product_plans(price, billing_period, is_active)
    `)
    .eq('status', 'active')
    .limit(50);

  if (error || !products) {
    console.error('[semantic-search] product load failed:', error?.message);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }

  const productList = products.map((p) => {
    const activePlans = (p.plans ?? []).filter((pl: { is_active: boolean }) => pl.is_active);
    const lowestPrice = activePlans.length > 0
      ? Math.min(...activePlans.map((pl: { price: number }) => Number(pl.price)))
      : 0;
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      description: `${p.short_desc ?? ''} ${p.description ?? ''}`.trim().slice(0, 1500),
      tags: (p.tags ?? []).join(', ').slice(0, 500),
      price: Number.isFinite(lowestPrice) ? lowestPrice : 0,
    };
  });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI search is not configured' }, { status: 503 });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a product search ranker. Return only a JSON array containing IDs from the supplied product list, ordered by relevance. Return [] if nothing matches.',
        },
        {
          role: 'user',
          content: `Search query: ${JSON.stringify(query)}\nProducts: ${JSON.stringify(productList)}`,
        },
      ],
      max_tokens: 300,
      temperature: 0.1,
    });

    const responseText = completion.choices[0]?.message?.content?.trim() ?? '[]';
    let rawIds: unknown = [];
    try {
      rawIds = JSON.parse(responseText);
    } catch {
      rawIds = [];
    }

    const validIds = new Set(productList.map((p) => p.id));
    const matchedIds = Array.isArray(rawIds)
      ? [...new Set(rawIds.filter((id): id is string => typeof id === 'string' && validIds.has(id)))].slice(0, 20)
      : [];

    return NextResponse.json(
      { matchedIds, query },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.warn('[semantic-search] AI ranking failed:', err);
    return NextResponse.json({ matchedIds: [], query });
  }
}

