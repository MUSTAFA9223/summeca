/**
 * POST /api/ai/generate
 *
 * Secure server-side AI generation endpoint for SUMMECA AI Marketing Engine.
 *
 * SECURITY CONTRACT:
 * - API keys NEVER exposed to frontend
 * - All AI calls made server-side via abstraction layer
 * - User authentication required for all requests
 * - Admin required for admin-only generation types
 * - Usage tracked per user per month
 * - Rate limiting enforced via ai_usage table
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateProductContent,
  generateSEOContent,
  generateMarketingCampaign,
  generateProductAnalysis,
  generateCustomerInsights,
} from '@/lib/ai/aiProvider';

// Generation types that require admin role
const ADMIN_ONLY_TYPES = new Set([
  'product_description',
  'seo_optimization',
  'marketing_campaign',
  'product_analysis',
  'customer_insights',
]);

// Monthly limits by role
const MONTHLY_LIMITS: Record<string, number> = {
  admin: 9999,
  user: 50,
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // ── 1. Authenticate ───────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Fetch user profile for role check ──────────────────────────────────
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const userRole = profile?.role ?? 'user';

  // ── 3. Parse request body ─────────────────────────────────────────────────
  let body: { type?: string; input?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { type, input } = body;

  if (!type) {
    return NextResponse.json({ error: 'type is required' }, { status: 400 });
  }

  // ── 4. Authorization check ────────────────────────────────────────────────
  if (ADMIN_ONLY_TYPES.has(type) && userRole !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  // ── 5. Usage limit check ──────────────────────────────────────────────────
  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);

  const { data: usageRow } = await supabase
    .from('ai_usage')
    .select('requests_count, monthly_limit')
    .eq('user_id', user.id)
    .gte('period_start', periodStart.toISOString().slice(0, 10))
    .maybeSingle();

  const limit = MONTHLY_LIMITS[userRole] ?? 50;
  const used = usageRow?.requests_count ?? 0;

  if (used >= limit) {
    return NextResponse.json(
      { error: 'Monthly AI usage limit reached', used, limit },
      { status: 429 }
    );
  }

  // ── 6. Execute generation ─────────────────────────────────────────────────
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
        return NextResponse.json({ error: `Unknown generation type: ${type}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // ── 7. Save generation history ────────────────────────────────────────────
  const { data: savedGen } = await supabase
    .from('ai_generations')
    .insert({
      user_id: user.id,
      generation_type: type,
      model: result.model,
      input_data: input ?? {},
      output_text: result.text,
      tokens_used: result.tokensUsed,
      duration_ms: result.durationMs,
      product_id: (input as Record<string, unknown>)?.productId as string ?? null,
    })
    .select('id')
    .single();

  // ── 8. Increment usage ────────────────────────────────────────────────────
  await supabase.rpc('increment_ai_usage', {
    p_user_id: user.id,
    p_tokens: result.tokensUsed,
  });

  // ── 9. Parse JSON output safely ───────────────────────────────────────────
  let parsedOutput: unknown = result.text;
  try {
    // Strip markdown code fences if present
    const cleaned = result.text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    parsedOutput = JSON.parse(cleaned);
  } catch {
    // Return raw text if not valid JSON
  }

  return NextResponse.json({
    success: true,
    generationId: savedGen?.id,
    type,
    output: parsedOutput,
    tokensUsed: result.tokensUsed,
    durationMs: result.durationMs,
    usage: { used: used + 1, limit },
  });
}
