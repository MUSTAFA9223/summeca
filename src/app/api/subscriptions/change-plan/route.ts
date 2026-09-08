/**
 * POST /api/subscriptions/change-plan
 *
 * Validates an owned subscription and a target plan, then returns a checkout
 * URL. Current SUMMECA payment flows are verified prepaid purchases; this route
 * does not mutate an existing provider billing agreement, promise proration, or
 * schedule a future provider-side downgrade.
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

  let body: {
    subscriptionId?: string;
    newPlanId?: string;
    changeType?: 'upgrade' | 'downgrade';
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const subscriptionId = body.subscriptionId?.trim();
  const newPlanId = body.newPlanId?.trim();
  const changeType = body.changeType;

  if (!subscriptionId || !newPlanId || !['upgrade', 'downgrade'].includes(changeType ?? '')) {
    return NextResponse.json(
      { error: 'subscriptionId, newPlanId, and a valid changeType are required.' },
      { status: 400 }
    );
  }

  const { data: sub, error: fetchError } = await supabase
    .from('subscriptions')
    .select('id, user_id, status, plan_id, product_id, current_period_end')
    .eq('id', subscriptionId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !sub) {
    return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 });
  }

  if (!['active', 'trialing', 'past_due', 'cancelled', 'expired'].includes(sub.status)) {
    return NextResponse.json(
      { error: `Cannot select another plan from subscription status: ${sub.status}` },
      { status: 422 }
    );
  }

  const { data: newPlan, error: planError } = await supabase
    .from('product_plans')
    .select('id, name, price, currency, billing_period, product_id, is_active')
    .eq('id', newPlanId)
    .single();

  if (planError || !newPlan) {
    return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
  }
  if (!newPlan.is_active) {
    return NextResponse.json({ error: 'Selected plan is not available.' }, { status: 422 });
  }
  if (newPlan.product_id !== sub.product_id) {
    return NextResponse.json({ error: 'Plan does not belong to the same product.' }, { status: 422 });
  }
  if (newPlan.id === sub.plan_id && ['active', 'trialing', 'past_due'].includes(sub.status)) {
    return NextResponse.json({ error: 'Selected plan is already the current access plan.' }, { status: 422 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://summeca.com').replace(/\/$/, '');
  const checkoutUrl = `${siteUrl}/checkout?product_id=${encodeURIComponent(sub.product_id)}&plan_id=${encodeURIComponent(newPlanId)}&change_from=${encodeURIComponent(subscriptionId)}&change_type=${encodeURIComponent(changeType!)}`;

  return NextResponse.json(
    {
      changeType,
      checkoutUrl,
      requiresVerifiedCheckout: true,
      currentAccessUntil: sub.current_period_end,
      message:
        'Select and pay for the new plan through checkout. Your current access is not changed until a new payment is verified; no proration or future billing change has been scheduled.',
      newPlan: {
        id: newPlan.id,
        name: newPlan.name,
        price: newPlan.price,
        currency: newPlan.currency,
        billingPeriod: newPlan.billing_period,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
