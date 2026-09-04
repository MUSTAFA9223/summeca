/**
 * POST /api/ai/semantic-search
 * AI-powered semantic product search.
 * Server-side only — API keys never exposed to frontend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  let body: { query?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { query } = body;
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  if (query.length > 200) {
    return NextResponse.json({ error: 'Query too long' }, { status: 400 });
  }

  // Fetch all active products
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id, name, slug, short_desc, description, category, tags,
      plans:product_plans(price, billing_period, is_active)
    `)
    .eq('status', 'active')
    .limit(50);

  if (error || !products) {
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }

  const productList = products.map((p) => {
    const activePlans = (p.plans ?? []).filter((pl: { is_active: boolean }) => pl.is_active);
    const lowestPrice = activePlans.length > 0
      ? Math.min(...activePlans.map((pl: { price: number }) => pl.price))
      : 0;
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      description: `${p.short_desc ?? ''} ${p.description ?? ''}`.trim(),
      tags: (p.tags ?? []).join(', '),
      price: lowestPrice,
    };
  });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a semantic search engine for SUMMECA marketplace.
Given a search query and product list, return the IDs of matching products ordered by relevance.
Consider product names, descriptions, categories, tags, and features.
Return ONLY a JSON array of product IDs. Example: ["id1","id2","id3"]
Return empty array [] if no products match.`,
        },
        {
          role: 'user',
          content: `Search query: "${query.trim()}"\n\nProducts:\n${JSON.stringify(productList, null, 2)}\n\nReturn matching product IDs ordered by relevance.`,
        },
      ],
      max_tokens: 300,
      temperature: 0.1,
    });

    const responseText = completion.choices[0]?.message?.content?.trim() ?? '[]';
    let matchedIds: string[] = [];
    try {
      matchedIds = JSON.parse(responseText);
    } catch {
      matchedIds = [];
    }

    return NextResponse.json({ matchedIds, query: query.trim() });
  } catch {
    return NextResponse.json({ matchedIds: [], query: query.trim() });
  }
}
