/**
 * POST /api/ai/store-assistant
 *
 * Public, rate-limited SUMMECA sales assistant grounded in the live product
 * catalog. Inference runs on Cloudflare Workers AI through the server binding.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';
import { generateStoreAssistantResponse, type AIMessage } from '@/lib/ai/aiProvider';
import { getEffectivePrice } from '@/lib/pricing';

const MAX_HISTORY = 10;
const ALLOWED_HISTORY_ROLES = new Set(['user', 'assistant']);

type PlanRow = {
  name: string;
  price: number | string;
  currency: string;
  billing_period: string;
  features: string[] | null;
  is_active: boolean;
  sale_price: number | string | null;
  sale_discount_type: 'percentage' | 'fixed_amount' | null;
  sale_discount_value: number | string | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
};

export async function POST(request: NextRequest) {
  try {
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
      .filter(
        (item) =>
          item &&
          typeof item.role === 'string' &&
          ALLOWED_HISTORY_ROLES.has(item.role) &&
          typeof item.content === 'string' &&
          item.content.trim().length > 0,
      )
      .map((item) => ({
        role: item.role as AIMessage['role'],
        content: String(item.content).slice(0, 2000),
      }));

    // The sales assistant only needs the same public catalog data that product
    // pages already expose. Do not make customer chat availability depend on a
    // privileged service-role secret being present in the Worker runtime.
    const supabase = await createClient();
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id, name, slug, short_desc, description, category,
        plans:product_plans(
          name, price, currency, billing_period, features, is_active,
          sale_price, sale_discount_type, sale_discount_value,
          sale_starts_at, sale_ends_at
        )
      `)
      .eq('status', 'active')
      .limit(30);

    if (productsError) {
      console.error('[store-assistant] product load failed:', productsError.message);
      return NextResponse.json({ error: 'Assistant catalog is temporarily unavailable' }, { status: 503 });
    }

    const productList = (products ?? []).map((product) => ({
      name: product.name,
      description: product.short_desc || product.description || '',
      slug: product.slug,
      category: product.category,
      plans: ((product.plans ?? []) as PlanRow[])
        .filter((plan) => plan.is_active)
        .map((plan) => {
          let price = Number(plan.price || 0);
          try {
            price = getEffectivePrice(plan).finalPrice;
          } catch {
            // Fall back to the stored regular price if legacy sale data is malformed.
          }
          return {
            name: plan.name,
            price: Number.isFinite(price) ? price : 0,
            currency: String(plan.currency || 'USD').toUpperCase(),
            billingPeriod: plan.billing_period,
            features: Array.isArray(plan.features) ? plan.features.slice(0, 8) : [],
          };
        }),
    }));

    let result;
    try {
      result = await generateStoreAssistantResponse({
        userMessage: message,
        conversationHistory: safeHistory,
        products: productList,
      });
    } catch (error) {
      console.error('[store-assistant] Workers AI generation failed:', error);
      return NextResponse.json({ error: 'AI inference is temporarily unavailable' }, { status: 502 });
    }

    // Analytics are useful but must never break a customer conversation. Use
    // the service role only when it is configured; otherwise simply skip this
    // optional write.
    try {
      const historyClient = createServiceClient();
      const { error: historyError } = await historyClient.from('ai_generations').insert({
        user_id: null,
        generation_type: 'store_assistant',
        model: result.model,
        input_data: { message, provider: 'cloudflare_workers_ai' },
        output_text: result.text,
        tokens_used: result.tokensUsed,
        duration_ms: result.durationMs,
      });
      if (historyError) {
        console.warn('[store-assistant] Failed to save generation history:', historyError.message);
      }
    } catch (historyError) {
      console.warn(
        '[store-assistant] Generation history skipped:',
        historyError instanceof Error ? historyError.message : 'service role unavailable',
      );
    }

    return NextResponse.json(
      { success: true, reply: result.text },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('[store-assistant] unexpected route failure:', error);
    return NextResponse.json(
      { error: 'Sales assistant encountered an unexpected server error' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}
