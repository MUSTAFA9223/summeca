/**
 * GET /api/subscriptions
 *
 * Returns the authenticated user's subscriptions with full plan/product details.
 * Server-side only — never trusts client-provided user IDs.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase?.auth?.getUser();
  if (authError || !user) {
    return NextResponse?.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { data, error } = await supabase?.from('subscriptions')?.select(`
      id,
      status,
      payment_provider,
      current_period_start,
      current_period_end,
      cancelled_at,
      cancel_reason,
      paused_at,
      past_due_at,
      trial_ends_at,
      downgrade_plan_id,
      downgrade_at,
      created_at,
      updated_at,
      order_id,
      products ( id, name, slug, category, thumbnail_url ),
      product_plans ( id, name, billing_period, price, currency, features )
    `)?.eq('user_id', user?.id)?.order('created_at', { ascending: false });

  if (error) {
    console.error('[GET /api/subscriptions] Error:', error?.message);
    return NextResponse?.json({ error: 'Failed to fetch subscriptions.' }, { status: 500 });
  }

  return NextResponse?.json({ subscriptions: data ?? [] });
}
