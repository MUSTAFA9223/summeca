/**
 * POST /api/ai/generate
 *
 * Server-side AI generation for the SUMMECA marketing engine.
 * API keys remain server-only; admin authorization is sourced from
 * user_profiles.is_admin and usage writes use the service role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';
import { sanitizeGeneratedContent } from '@/lib/security/sanitizeGeneratedContent';
import {
  generateProductContent,
  generateSEOContent,
  generateMarketingCampaign,
  generateProductAnalysis,
  generateCustomerInsights,
} from '@/lib/ai/aiProvider';

const ADMIN_ONLY_TYPES = new Set([
  'product_description',
  'seo_optimization',
  'marketing_campaign',
  'product_analysis',
  'customer_insights',
]);

const MONTHLY_LIMITS = {
  admin: 9999,
  user: 50,
} as const;

export async function POST(request: NextRequest) {
  const sessionClient = await createClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await sessionClient
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profile?.is_admin === true;
  const userRole: keyof typeof MONTHLY_LIMITS = isAdmin ? 'admin' : 'user';

  const burst = await checkRateLimit(`ai-generate:${getRequestIdentity(request, user.id)}`, {
    limit: isAdmin ? 30 : 10,
    windowMs: 60_000,
  });
  if (!burst.allowed) {
    return NextResponse.json(
      { error: 'Too many AI requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((burst.resetAt - Date.now()) / 1000))) } }
    );
  }

  let body: { type?: string; input?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const type = typeof body.type === 'string' ? body.type : '';
  const input = body.input && typeof body.input === 'object' && !Array.isArray(body.input)
    ? body.input
    : {};

  if (!ADMIN_ONLY_TYPES.has(type)) {
    return NextResponse.json({ error: 'Unknown generation type' }, { status: 400 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  let inputSize = 0;
  try {
    inputSize = JSON.stringify(input).length;
  } catch {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  if (inputSize > 25_000) {
    return NextResponse.json({ error: 'AI input is too large' }, { status: 413 });
  }

  const service = createServiceClient();
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);

  const { data: usageRow } = await service
    .from('ai_usage')
    .select('requests_count')
    .eq('user_id', user.id)
    .eq('period_start', periodStart.toISOString().slice(0, 10))
    .maybeSingle();

  const limit = MONTHLY_LIMITS[userRole];
  const used = usageRow?.requests_count ?? 0;
  if (used >= limit) {
    return NextResponse.json({ error: 'Monthly AI usage limit reached', used, limit }, { status: 429 });
  }

  let result;
  try {
    switch (type) {
      case 'product_description':
        result = await generateProductContent(input as Parameters<typeof generateProductContent>[0]);
        break;
      case 'seo_optimization':
        result = await generateSEOContent(input as Parameters<typeof generateSEOContent>[0]);
        break;
      case 'marketing_campaign':
        result = await generateMarketingCampaign(input as Parameters<typeof generateMarketingCampaign>[0]);
        break;
      case 'product_analysis':
        result = await generateProductAnalysis(input as Parameters<typeof generateProductAnalysis>[0]);
        break;
      case 'customer_insights':
        result = await generateCustomerInsights(input as Parameters<typeof generateCustomerInsights>[0]);
        break;
      default:
        return NextResponse.json({ error: 'Unknown generation type' }, { status: 400 });
    }
  } catch (err) {
    console.error('[ai/generate] generation error:', err);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
  }

  const { data: savedGen, error: historyError } = await service
    .from('ai_generations')
    .insert({
      user_id: user.id,
      generation_type: type,
      model: result.model,
      input_data: input,
      output_text: result.text,
      tokens_used: result.tokensUsed,
      duration_ms: result.durationMs,
      product_id: typeof input.productId === 'string' ? input.productId : null,
    })
    .select('id')
    .single();

  if (historyError) {
    console.warn('[ai/generate] Failed to save generation history:', historyError.message);
  }

  const { error: usageError } = await service.rpc('increment_ai_usage', {
    p_user_id: user.id,
    p_tokens: Math.max(0, Number(result.tokensUsed) || 0),
  });
  if (usageError) console.warn('[ai/generate] Failed to increment usage:', usageError.message);

  let parsedOutput: unknown = result.text;
  try {
    const cleaned = result.text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    parsedOutput = JSON.parse(cleaned);
  } catch {
    // Raw text is returned when the model response is not JSON.
  }

  // Generated rich-text fields are untrusted even in the admin console. Keep
  // history raw for auditing, but only return display-safe content to the UI.
  parsedOutput = sanitizeGeneratedContent(parsedOutput);

  return NextResponse.json({
    success: true,
    generationId: savedGen?.id,
    type,
    output: parsedOutput,
    tokensUsed: result.tokensUsed,
    durationMs: result.durationMs,
    usage: { used: used + 1, limit },
  }, { headers: { 'Cache-Control': 'no-store' } });
}

