/**
 * GET /api/ai/history
 * Returns AI generation history and usage stats for the authenticated user.
 * Admins can fetch all history with ?all=true.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profile?.is_admin === true;
  const url = new URL(request.url);
  const fetchAll = isAdmin && url.searchParams.get('all') === 'true';

  const parsedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
  const parsedLimit = Number.parseInt(url.searchParams.get('limit') ?? '20', 10);
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const limit = Number.isFinite(parsedLimit) ? Math.min(50, Math.max(1, parsedLimit)) : 20;
  const offset = (page - 1) * limit;

  const db = fetchAll ? createServiceClient() : supabase;
  let query = db
    .from('ai_generations')
    .select('id, generation_type, model, input_data, tokens_used, duration_ms, product_id, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (!fetchAll) query = query.eq('user_id', user.id);

  const { data: generations, count, error: genError } = await query;
  if (genError) {
    console.error('[ai/history] generation query failed:', genError.message);
    return NextResponse.json({ error: 'Failed to load AI history' }, { status: 500 });
  }

  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);

  const usageDb = createServiceClient();
  const { data: usageRow } = await usageDb
    .from('ai_usage')
    .select('requests_count, tokens_used, monthly_limit')
    .eq('user_id', user.id)
    .eq('period_start', periodStart.toISOString().slice(0, 10))
    .maybeSingle();

  const monthlyLimit = isAdmin ? 9999 : (usageRow?.monthly_limit ?? 50);

  return NextResponse.json({
    generations: generations ?? [],
    total: count ?? 0,
    page,
    limit,
    usage: {
      requestsUsed: usageRow?.requests_count ?? 0,
      tokensUsed: usageRow?.tokens_used ?? 0,
      monthlyLimit,
      remaining: Math.max(0, monthlyLimit - (usageRow?.requests_count ?? 0)),
    },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
