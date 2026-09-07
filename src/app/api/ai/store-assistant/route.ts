/**
 * POST /api/ai/store-assistant
 *
 * Public store assistant with strict product grounding, input validation and
 * per-client burst protection. The model call is executed directly on the
 * server so the public assistant does not depend on the admin-only AI route.
 */

import { NextRequest, NextResponse } from 'next/server';
import { completion } from '@rocketnew/llm-sdk';
import { createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';

type AIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type StoreProvider = 'OPEN_AI' | 'ANTHROPIC' | 'GEMINI';

const MAX_HISTORY = 10;
const ALLOWED_HISTORY_ROLES = new Set(['user', 'assistant']);

const PROVIDER_KEYS: Record<StoreProvider, string | undefined> = {
  OPEN_AI: process.env.OPENAI_API_KEY,
  ANTHROPIC: process.env.ANTHROPIC_API_KEY,
  GEMINI: process.env.GEMINI_API_KEY,
};

const DEFAULT_MODELS: Record<StoreProvider, string> = {
  OPEN_AI: 'gpt-4.1',
  ANTHROPIC: 'claude-opus-4-5',
  GEMINI: 'gemini-2.5-pro',
};

function resolveProvider(): { provider: StoreProvider; apiKey: string; model: string } | null {
  const configured = process.env.AI_PROVIDER as StoreProvider | undefined;
  const preferred: StoreProvider[] = configured && configured in PROVIDER_KEYS
    ? [configured, 'OPEN_AI', 'GEMINI', 'ANTHROPIC']
    : ['OPEN_AI', 'GEMINI', 'ANTHROPIC'];

  const provider = preferred.find((candidate, index) =>
    preferred.indexOf(candidate) === index && Boolean(PROVIDER_KEYS[candidate])
  );

  if (!provider) return null;

  return {
    provider,
    apiKey: PROVIDER_KEYS[provider]!,
    model: process.env.AI_DEFAULT_MODEL || DEFAULT_MODELS[provider],
  };
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`store-assistant:${getRequestIdentity(request)}`, {
    limit: 8,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many assistant requests. Please try again shortly.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))),
        },
      },
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

  const providerConfig = resolveProvider();
  if (!providerConfig) {
    console.error('[store-assistant] no AI provider API key is configured');
    return NextResponse.json({ error: 'Assistant is not configured yet' }, { status: 503 });
  }

  const productContext = productList
    .map((p) => `- ${p.name}: ${p.description} (Price: $${p.price}, URL: /products/${p.slug})`)
    .join('\n');

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are the customer assistant for SUMMECA, a digital products marketplace.
Help customers find products, answer product questions, and guide purchase decisions.
Reply in the same language the customer uses.

AVAILABLE PRODUCTS:
${productContext || '- No active products are currently available.'}

RULES:
- Only recommend products from the list above.
- Never invent product features, prices, availability, guarantees, or policies.
- If the available data does not answer a question, say that you do not have enough information and direct the customer to SUMMECA support.
- Keep answers concise, friendly and useful.
- Include the product URL when recommending a product.`,
    },
    ...safeHistory,
    { role: 'user', content: message },
  ];

  const startedAt = Date.now();
  let text = '';
  let tokensUsed = 0;

  try {
    const providerResponse = await completion({
      model: providerConfig.model,
      messages,
      stream: false,
      api_key: providerConfig.apiKey,
      max_tokens: 600,
    });

    const response = providerResponse as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    text = response.choices?.[0]?.message?.content?.trim() || '';
    tokensUsed = Number(response.usage?.total_tokens ?? 0);
    if (!text) throw new Error('AI provider returned an empty response');
  } catch (err) {
    console.error('[store-assistant] generation failed:', err);
    return NextResponse.json({ error: 'Assistant is temporarily unavailable' }, { status: 502 });
  }

  const durationMs = Date.now() - startedAt;
  const { error: historyError } = await supabase.from('ai_generations').insert({
    user_id: null,
    generation_type: 'store_assistant',
    model: providerConfig.model,
    input_data: { message, provider: providerConfig.provider },
    output_text: text,
    tokens_used: tokensUsed,
    duration_ms: durationMs,
  });
  if (historyError) {
    console.warn('[store-assistant] Failed to save generation history:', historyError.message);
  }

  return NextResponse.json(
    { success: true, reply: text },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
