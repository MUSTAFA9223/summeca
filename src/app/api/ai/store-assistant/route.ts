/**
 * POST /api/ai/store-assistant
 *
 * Customer-facing AI store assistant.
 * Uses product database only — never invents information.
 * No admin role required (public-facing).
 *
 * SECURITY CONTRACT:
 * - API keys NEVER exposed to frontend
 * - Product data fetched server-side from Supabase
 * - Conversation history validated and capped
 * - Usage tracked per session (no auth required for store visitors)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateStoreAssistantResponse, type AIMessage } from '@/lib/ai/aiProvider';

const MAX_HISTORY = 10;

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // ── 1. Parse request ──────────────────────────────────────────────────────
  let body: {
    message?: string;
    history?: AIMessage[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { message, history = [] } = body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  if (message.length > 1000) {
    return NextResponse.json({ error: 'Message too long (max 1000 chars)' }, { status: 400 });
  }

  // ── 2. Fetch active products from database ────────────────────────────────
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id, name, slug, short_desc, description, category,
      plans:product_plans(price, billing_period, is_active)
    `)
    .eq('status', 'active')
    .limit(30);

  if (productsError) {
    return NextResponse.json({ error: 'Failed to load product data' }, { status: 500 });
  }

  const productList = (products ?? []).map((p) => {
    const activePlans = (p.plans ?? []).filter((pl: { is_active: boolean }) => pl.is_active);
    const lowestPrice = activePlans.length > 0
      ? Math.min(...activePlans.map((pl: { price: number }) => pl.price))
      : 0;
    return {
      name: p.name,
      description: p.short_desc || p.description || '',
      price: lowestPrice,
      slug: p.slug,
    };
  });

  // ── 3. Validate and cap conversation history ──────────────────────────────
  const safeHistory: AIMessage[] = (Array.isArray(history) ? history : [])
    .slice(-MAX_HISTORY)
    .filter((m) => m && typeof m.role === 'string' && typeof m.content === 'string')
    .map((m) => ({ role: m.role as AIMessage['role'], content: String(m.content).slice(0, 2000) }));

  // ── 4. Generate response ──────────────────────────────────────────────────
  let result;
  try {
    result = await generateStoreAssistantResponse({
      userMessage: message.trim(),
      conversationHistory: safeHistory,
      products: productList,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Assistant unavailable';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // ── 5. Save to generation history (anonymous) ─────────────────────────────
  await supabase.from('ai_generations').insert({
    user_id: null,
    generation_type: 'store_assistant',
    model: result.model,
    input_data: { message: message.trim() },
    output_text: result.text,
    tokens_used: result.tokensUsed,
    duration_ms: result.durationMs,
  });

  return NextResponse.json({
    success: true,
    reply: result.text,
    tokensUsed: result.tokensUsed,
  });
}
