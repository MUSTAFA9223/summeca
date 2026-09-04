/**
 * POST /api/ai/recommendations
 * AI-powered product recommendations based on user context.
 * Server-side only — API keys never exposed to frontend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  const supabase = await createClient();

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

  const { currentProductId, currentCategory, userInterests = [] } = body;

  // Fetch all active products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id, name, slug, short_desc, category, tags, metadata,
      plans:product_plans(price, billing_period, is_active)
    `)
    .eq('status', 'active')
    .limit(50);

  if (productsError || !products) {
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }

  // Get user's purchase history if authenticated
  const { data: { user } } = await supabase.auth.getUser();
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
      purchasedProductIds = orders.map((o) => o.product_id).filter(Boolean);
      purchasedCategories = orders
        .map((o) => (o.products as { category?: string } | null)?.category)
        .filter(Boolean) as string[];
    }
  }

  // Filter out current product and already purchased
  const candidateProducts = products.filter(
    (p) => p.id !== currentProductId && !purchasedProductIds.includes(p.id)
  );

  if (candidateProducts.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  // Build context for AI
  const productList = candidateProducts.slice(0, 30).map((p) => {
    const activePlans = (p.plans ?? []).filter((pl: { is_active: boolean }) => pl.is_active);
    const lowestPrice = activePlans.length > 0
      ? Math.min(...activePlans.map((pl: { price: number }) => pl.price))
      : 0;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      description: p.short_desc ?? '',
      tags: (p.tags ?? []).join(', '),
      price: lowestPrice,
    };
  });

  const contextInfo = [
    currentCategory ? `Current product category: ${currentCategory}` : '',
    purchasedCategories.length > 0 ? `User has purchased: ${[...new Set(purchasedCategories)].join(', ')}` : '',
    userInterests.length > 0 ? `User interests: ${userInterests.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a product recommendation engine for SUMMECA, a premium AI & SaaS marketplace.
Given a list of products and user context, return the IDs of the top 4 most relevant products to recommend.
Return ONLY a JSON array of product IDs, nothing else. Example: ["id1","id2","id3","id4"]`,
        },
        {
          role: 'user',
          content: `User context:\n${contextInfo || 'No specific context'}\n\nAvailable products:\n${JSON.stringify(productList, null, 2)}\n\nReturn the top 4 product IDs to recommend.`,
        },
      ],
      max_tokens: 200,
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content?.trim() ?? '[]';
    let recommendedIds: string[] = [];
    try {
      recommendedIds = JSON.parse(responseText);
    } catch {
      // Fallback: return products from same category
      recommendedIds = candidateProducts
        .filter((p) => p.category === currentCategory)
        .slice(0, 4)
        .map((p) => p.id);
    }

    const recommendations = recommendedIds
      .map((id) => candidateProducts.find((p) => p.id === id))
      .filter(Boolean)
      .slice(0, 4);

    return NextResponse.json({ recommendations });
  } catch {
    // Fallback to category-based recommendations
    const fallback = candidateProducts
      .filter((p) => p.category === currentCategory)
      .slice(0, 4);
    return NextResponse.json({ recommendations: fallback });
  }
}
