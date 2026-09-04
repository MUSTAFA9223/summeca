/**
 * POST /api/subscriptions/cancel
 *
 * Cancels a subscription for the authenticated user.
 * Access is kept until the end of the current billing period.
 *
 * SECURITY:
 * - Verifies user owns the subscription server-side.
 * - Never trusts client-provided status or user_id.
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
  let body: { subscriptionId: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { subscriptionId, reason } = body;
  if (!subscriptionId) {
    return NextResponse.json({ error: 'subscriptionId is required.' }, { status: 400 });
  }

  // ── 3. Fetch subscription and verify ownership ────────────────────────────
  const { data: sub, error: fetchError } = await supabase
    .from('subscriptions')
    .select(`
      id, user_id, status, current_period_end,
      products ( name ),
      product_plans ( name, price, currency )
    `)
    .eq('id', subscriptionId)
    .eq('user_id', user.id)   // ownership check
    .single();

  if (fetchError || !sub) {
    return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 });
  }

  // ── 4. Validate state ─────────────────────────────────────────────────────
  if (!['active', 'trialing', 'past_due'].includes(sub.status)) {
    return NextResponse.json(
      { error: `Cannot cancel a subscription with status: ${sub.status}` },
      { status: 422 }
    );
  }

  const previousStatus = sub.status;

  // ── 5. Update subscription ────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason ?? '',
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .eq('user_id', user.id);

  if (updateError) {
    console.error('[cancel] Update error:', updateError.message);
    return NextResponse.json({ error: 'Failed to cancel subscription.' }, { status: 500 });
  }

  // ── 6. Audit log ──────────────────────────────────────────────────────────
  await supabase.from('subscription_audit_logs').insert({
    subscription_id: subscriptionId,
    admin_id: null,
    action: 'cancel',
    previous_status: previousStatus,
    new_status: 'cancelled',
    note: reason ? `Customer reason: ${reason}` : 'Customer cancelled',
    metadata: { initiated_by: 'customer', user_id: user.id },
  });

  // ── 7. Send cancellation email (fire-and-forget) ──────────────────────────
  try {
    const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
    const userEmail = authUser?.user?.email ?? '';
    const { data: profile } = await supabase
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
          cancelledAt: new Date().toISOString(),
          accessUntil: sub.current_period_end ?? new Date().toISOString(),
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
