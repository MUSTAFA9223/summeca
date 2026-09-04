/**
 * POST /api/subscriptions/change-plan
 *
 * Schedules a plan change (upgrade or downgrade) for a subscription.
 *
 * SECURITY:
 * - Verifies user owns the subscription.
 * - Fetches plan price from database — NEVER trusts client price.
 * - Upgrades redirect to new checkout; downgrades are scheduled for next renewal.
 * - Logs action to subscription_audit_logs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/sendEmail';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // ── 1. Authenticate ───────────────────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  let body: { subscriptionId: string; newPlanId: string; changeType: 'upgrade' | 'downgrade' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { subscriptionId, newPlanId, changeType } = body;
  if (!subscriptionId || !newPlanId || !changeType) {
    return NextResponse.json({ error: 'subscriptionId, newPlanId, and changeType are required.' }, { status: 400 });
  }

  // ── 3. Fetch subscription and verify ownership ────────────────────────────
  const { data: sub, error: fetchError } = await supabase
    .from('subscriptions')
    .select(`
      id, user_id, status, plan_id, product_id, current_period_end,
      products ( id, name, slug ),
      product_plans ( id, name, price, currency, billing_period )
    `)
    .eq('id', subscriptionId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !sub) {
    return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 });
  }

  if (!['active', 'trialing'].includes(sub.status)) {
    return NextResponse.json(
      { error: `Cannot change plan for subscription with status: ${sub.status}` },
      { status: 422 }
    );
  }

  // ── 4. Fetch new plan from database (never trust client price) ────────────
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

  // Verify new plan belongs to the same product
  if (newPlan.product_id !== sub.product_id) {
    return NextResponse.json({ error: 'Plan does not belong to the same product.' }, { status: 422 });
  }

  const currentPlan = Array.isArray(sub.product_plans) ? sub.product_plans[0] : sub.product_plans;
  const product = Array.isArray(sub.products) ? sub.products[0] : sub.products;

  // ── 5. Handle upgrade vs downgrade ───────────────────────────────────────
  if (changeType === 'upgrade') {
    // Upgrades: return checkout URL for new plan — user pays immediately
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://summeca.com';
    const checkoutUrl = `${siteUrl}/checkout?productId=${sub.product_id}&planId=${newPlanId}&upgradeFrom=${subscriptionId}`;

    await supabase.from('subscription_audit_logs').insert({
      subscription_id: subscriptionId,
      admin_id: null,
      action: 'plan_change',
      previous_status: sub.status,
      new_status: sub.status,
      note: `Upgrade initiated to plan: ${newPlan.name}`,
      metadata: {
        change_type: 'upgrade',
        from_plan_id: sub.plan_id,
        to_plan_id: newPlanId,
        initiated_by: 'customer',
      },
    });

    return NextResponse.json({
      changeType: 'upgrade',
      message: 'Upgrade initiated. Redirecting to checkout.',
      checkoutUrl,
      newPlan: { id: newPlan.id, name: newPlan.name, price: newPlan.price, currency: newPlan.currency },
    });
  }

  // Downgrade: schedule for next renewal
  const { error: downgradeError } = await supabase
    .from('subscriptions')
    .update({
      downgrade_plan_id: newPlanId,
      downgrade_at: sub.current_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .eq('user_id', user.id);

  if (downgradeError) {
    console.error('[change-plan] Downgrade error:', downgradeError.message);
    return NextResponse.json({ error: 'Failed to schedule downgrade.' }, { status: 500 });
  }

  await supabase.from('subscription_audit_logs').insert({
    subscription_id: subscriptionId,
    admin_id: null,
    action: 'plan_change',
    previous_status: sub.status,
    new_status: sub.status,
    note: `Downgrade scheduled to plan: ${newPlan.name} at next renewal`,
    metadata: {
      change_type: 'downgrade',
      from_plan_id: sub.plan_id,
      to_plan_id: newPlanId,
      effective_at: sub.current_period_end,
      initiated_by: 'customer',
    },
  });

  // Send plan changed email
  try {
    const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
    const userEmail = authUser?.user?.email ?? '';
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (userEmail) {
      await sendEmail({
        type: 'plan_changed',
        to: userEmail,
        data: {
          customerName: profile?.full_name ?? '',
          productName: product?.name ?? 'Your Subscription',
          oldPlanName: currentPlan?.name ?? 'Current Plan',
          newPlanName: newPlan.name,
          changeType: 'downgrade',
          effectiveDate: sub.current_period_end ?? new Date().toISOString(),
          amount: newPlan.price,
          currency: newPlan.currency,
        },
      });
    }
  } catch (emailErr) {
    console.warn('[change-plan] Email send failed (non-fatal):', emailErr);
  }

  return NextResponse.json({
    changeType: 'downgrade',
    message: `Downgrade to ${newPlan.name} scheduled for next renewal.`,
    effectiveDate: sub.current_period_end,
    newPlan: { id: newPlan.id, name: newPlan.name, price: newPlan.price, currency: newPlan.currency },
  });
}
