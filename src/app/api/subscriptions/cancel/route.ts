/**
 * POST /api/subscriptions/cancel
 *
 * IMPORTANT BILLING CONTRACT:
 * Current SUMMECA payment flows create prepaid access entitlements after a
 * verified payment. They do not create or manage a provider-side recurring
 * billing agreement that this endpoint can cancel.
 *
 * This endpoint therefore validates ownership and returns an explicit response
 * without mutating subscription state. A database-only status change must never
 * be presented as cancellation of external billing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: { subscriptionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const subscriptionId = body.subscriptionId?.trim();
  if (!subscriptionId) {
    return NextResponse.json({ error: 'subscriptionId is required.' }, { status: 400 });
  }

  const { data: sub, error: fetchError } = await supabase
    .from('subscriptions')
    .select(`
      id, status, payment_provider, stripe_subscription_id, current_period_end,
      product_plans ( billing_period )
    `)
    .eq('id', subscriptionId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !sub) {
    return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 });
  }

  const plan = Array.isArray(sub.product_plans) ? sub.product_plans[0] : sub.product_plans;
  const provider = sub.payment_provider || 'unknown';

  return NextResponse.json(
    {
      error:
        'Automatic billing cancellation is not available for this access record. No external billing or subscription state was changed.',
      code: 'NO_MANAGED_RECURRING_BILLING',
      billingModel: 'prepaid_access',
      provider,
      billingPeriod: plan?.billing_period ?? null,
      accessUntil: sub.current_period_end,
      supportMessage:
        'If your payment provider shows an active recurring agreement, contact SUMMECA support with the related order before assuming it is cancelled.',
    },
    { status: 409, headers: { 'Cache-Control': 'no-store' } }
  );
}
