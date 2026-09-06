/**
 * POST /api/ai/store-assistant
 *
 * Public store assistant with strict product grounding, input validation and
 * per-client burst protection. Trusted database writes use the service role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';
import { generateStoreAssistantResponse, type AIMessage } from '@/lib/ai/aiProvider';

const MAX_HISTORY = 10;
const ALLOWED_HISTORY_ROLES = new Set(['user', 'assistant']);

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`store-assistant:${getRequestIdentity(request)}`, {
    limit: 8,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many assistant requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))) } }
    );
  }

  let body: { message?: string; history?: AIMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const history = Array.isArray(body.history) ? body.history : [];
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 });
  if (message.length > 1000) {
    return NextResponse.json({ error: 'Message too long (max 1000 chars)' }, { status: 400 });
  }

  const safeHistory: AIMessage[] = history
    .slice(-MAX_HISTORY)
    .filter((m) =>
      m &&
      typeof m.role === 'string' &&
      ALLOWED_HISTORY_ROLES.has(m.role) &&
      typeof m.content === 'string' &&
      m.content.trim().length > 0
    )
    .map((m) => ({
      role: m.role as AIMessage['role'],
      content: String(m.content).slice(0, 2000),
    }));

  const supabase = createServiceClient();
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id, name, slug, short_desc, description, category,
      plans:product_plans(price, billing_period, is_active)
    `)
    .eq('status', 'active')
    .limit(30);

  if (productsError) {
    console.error('[store-assistant] product load failed:', productsError.message);
    return NextResponse.json({ error: 'Assistant is temporarily unavailable' }, { status: 503 });
  }

  const productList = (products ?? []).map((p) => {
    const activePlans = (p.plans ?? []).filter((pl: { is_active: boolean }) => pl.is_active);
    const lowestPrice = activePlans.length > 0
      ? Math.min(...activePlans.map((pl: { price: number }) => Number(pl.price)))
      : 0;
    return {
      name: p.name,
      description: p.short_desc || p.description || '',
      price: Number.isFinite(lowestPrice) ? lowestPrice : 0,
      slug: p.slug,
    };
  });

  let result;
  try {
    result = await generateStoreAssistantResponse({
      userMessage: message,
      conversationHistory: safeHistory,
      products: productList,
    });
  } catch (err) {
    console.error('[store-assistant] generation failed:', err);
    return NextResponse.json({ error: 'Assistant is temporarily unavailable' }, { status: 502 });
  }

  const { error: historyError } = await supabase.from('ai_generations').insert({
    user_id: null,
    generation_type: 'store_assistant',
    model: result.model,
    input_data: { message },
    output_text: result.text,
    tokens_used: result.tokensUsed,
    duration_ms: result.durationMs,
  });
  if (historyError) {
    console.warn('[store-assistant] Failed to save generation history:', historyError.message);
  }

  return NextResponse.json(
    { success: true, reply: result.text },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
