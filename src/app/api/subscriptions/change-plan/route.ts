/**
 * POST /api/subscriptions/change-plan
 *
 * Schedules a plan change for a subscription.
 * SECURITY:
 * - Ownership is verified using the authenticated user.
 * - Prices/plans are read from the database.
 * - Entitlement mutations are performed only with the server service role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/sendEmail';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: { subscriptionId?: string; newPlanId?: string; changeType?: 'upgrade' | 'downgrade' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const subscriptionId = body.subscriptionId?.trim();
  const newPlanId = body.newPlanId?.trim();
  const changeType = body.changeType;
  if (!subscriptionId || !newPlanId || !['upgrade', 'downgrade'].includes(changeType ?? '')) {
    return NextResponse.json({ error: 'subscriptionId, newPlanId, and a valid changeType are required.' }, { status: 400 });
  }

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

  const { data: newPlan, error: planError } = await supabase
    .from('product_plans')
    .select('id, name, price, currency, billing_period, product_id, is_active')
    .eq('id', newPlanId)
    .single();

  if (planError || !newPlan) return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
  if (!newPlan.is_active) return NextResponse.json({ error: 'Selected plan is not available.' }, { status: 422 });
  if (newPlan.product_id !== sub.product_id) {
    return NextResponse.json({ error: 'Plan does not belong to the same product.' }, { status: 422 });
  }
  if (newPlan.id === sub.plan_id) {
    return NextResponse.json({ error: 'Selected plan is already active.' }, { status: 422 });
  }

  const currentPlan = Array.isArray(sub.product_plans) ? sub.product_plans[0] : sub.product_plans;
  const product = Array.isArray(sub.products) ? sub.products[0] : sub.products;
  const service = createServiceClient();

  if (changeType === 'upgrade') {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://summeca.com').replace(/\/$/, '');
    const checkoutUrl = `${siteUrl}/checkout?product_id=${encodeURIComponent(sub.product_id)}&plan_id=${encodeURIComponent(newPlanId)}&upgrade_from=${encodeURIComponent(subscriptionId)}`;

    const { error: auditError } = await service.from('subscription_audit_logs').insert({
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
    if (auditError) console.warn('[change-plan] Audit log failed:', auditError.message);

    return NextResponse.json({
      changeType: 'upgrade',
      message: 'Upgrade initiated. Redirecting to checkout.',
      checkoutUrl,
      newPlan: { id: newPlan.id, name: newPlan.name, price: newPlan.price, currency: newPlan.currency },
    });
  }

  const now = new Date().toISOString();
  const { data: updated, error: downgradeError } = await service
    .from('subscriptions')
    .update({
      downgrade_plan_id: newPlanId,
      downgrade_at: sub.current_period_end,
      updated_at: now,
    })
    .eq('id', subscriptionId)
    .eq('user_id', user.id)
    .eq('status', sub.status)
    .select('id')
    .maybeSingle();

  if (downgradeError || !updated) {
    console.error('[change-plan] Downgrade error:', downgradeError?.message ?? 'Subscription changed concurrently');
    return NextResponse.json({ error: 'Failed to schedule downgrade.' }, { status: 409 });
  }

  const { error: auditError } = await service.from('subscription_audit_logs').insert({
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
  if (auditError) console.warn('[change-plan] Audit log failed:', auditError.message);

  try {
    const { data: authUser } = await service.auth.admin.getUserById(user.id);
    const userEmail = authUser?.user?.email ?? '';
    const { data: profile } = await service
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
          effectiveDate: sub.current_period_end ?? now,
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
