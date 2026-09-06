/**
 * POST /api/subscriptions/cancel
 *
 * Cancels a subscription for the authenticated user.
 * Access is kept until the end of the current billing period.
 *
 * SECURITY:
 * - Verifies ownership with the authenticated client.
 * - Performs the entitlement mutation with the server-only service role.
 * - Never trusts client-provided status or user_id.
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

  let body: { subscriptionId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const subscriptionId = body.subscriptionId?.trim();
  const reason = body.reason?.trim();
  if (!subscriptionId) {
    return NextResponse.json({ error: 'subscriptionId is required.' }, { status: 400 });
  }
  if (reason && reason.length > 1000) {
    return NextResponse.json({ error: 'reason is too long.' }, { status: 400 });
  }

  const { data: sub, error: fetchError } = await supabase
    .from('subscriptions')
    .select(`
      id, user_id, status, current_period_end,
      products ( name ),
      product_plans ( name, price, currency )
    `)
    .eq('id', subscriptionId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !sub) {
    return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 });
  }

  if (!['active', 'trialing', 'past_due'].includes(sub.status)) {
    return NextResponse.json(
      { error: `Cannot cancel a subscription with status: ${sub.status}` },
      { status: 422 }
    );
  }

  const service = createServiceClient();
  const cancelledAt = new Date().toISOString();
  const { data: updated, error: updateError } = await service
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: cancelledAt,
      cancel_reason: reason ?? '',
      updated_at: cancelledAt,
    })
    .eq('id', subscriptionId)
    .eq('user_id', user.id)
    .eq('status', sub.status)
    .select('id')
    .maybeSingle();

  if (updateError || !updated) {
    console.error('[cancel] Update error:', updateError?.message ?? 'Subscription changed concurrently');
    return NextResponse.json({ error: 'Failed to cancel subscription.' }, { status: 409 });
  }

  const { error: auditError } = await service.from('subscription_audit_logs').insert({
    subscription_id: subscriptionId,
    admin_id: null,
    action: 'cancel',
    previous_status: sub.status,
    new_status: 'cancelled',
    note: reason ? `Customer reason: ${reason}` : 'Customer cancelled',
    metadata: { initiated_by: 'customer', user_id: user.id },
  });
  if (auditError) console.warn('[cancel] Audit log failed:', auditError.message);

  try {
    const { data: authUser } = await service.auth.admin.getUserById(user.id);
    const userEmail = authUser?.user?.email ?? '';
    const { data: profile } = await service
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const product = Array.isArray(sub.products) ? sub.products[0] : sub.products;
    const plan = Array.isArray(sub.product_plans) ? sub.product_plans[0] : sub.product_plans;

    if (userEmail) {
      await sendEmail({
        type: 'subscription_cancelled',
        to: userEmail,
        data: {
          customerName: profile?.full_name ?? '',
          productName: product?.name ?? 'Your Subscription',
          planName: plan?.name ?? 'Plan',
          cancelledAt,
          accessUntil: sub.current_period_end ?? cancelledAt,
          reason: reason ?? '',
        },
      });
    }
  } catch (emailErr) {
    console.warn('[cancel] Email send failed (non-fatal):', emailErr);
  }

  return NextResponse.json({
    message: 'Subscription cancelled. Access continues until the end of the billing period.',
    accessUntil: sub.current_period_end,
  });
}
