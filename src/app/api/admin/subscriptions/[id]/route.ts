/**
 * PATCH /api/admin/subscriptions/[id]
 *
 * Admin-only endpoint to pause, cancel, or restore a subscription.
 * State transitions are validated server-side and all mutations use the
 * server-only service role after the admin session has been verified.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { sendEmail } from '@/lib/email/sendEmail';

type AdminAction = 'pause' | 'cancel' | 'restore';

const VALID_TRANSITIONS: Record<AdminAction, string[]> = {
  pause: ['active', 'trialing', 'past_due'],
  cancel: ['active', 'trialing', 'paused', 'past_due'],
  restore: ['cancelled', 'paused', 'expired'],
};

const ACTION_NEW_STATUS: Record<AdminAction, string> = {
  pause: 'paused',
  cancel: 'cancelled',
  restore: 'active',
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: subscriptionId } = await params;
  const sessionClient = await createClient();
  const user = await requireAdmin(sessionClient);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { action?: AdminAction; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const action = body.action;
  const note = body.note?.trim();
  if (!action || !['pause', 'cancel', 'restore'].includes(action)) {
    return NextResponse.json({ error: 'action must be one of: pause, cancel, restore' }, { status: 400 });
  }
  if (note && note.length > 1000) {
    return NextResponse.json({ error: 'note is too long' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: sub, error: fetchError } = await supabase
    .from('subscriptions')
    .select(`
      id, user_id, status, current_period_end,
      products ( name ),
      product_plans ( name, price, currency )
    `)
    .eq('id', subscriptionId)
    .single();

  if (fetchError || !sub) {
    return NextResponse.json({ error: 'Subscription not found.' }, { status: 404 });
  }

  if (!VALID_TRANSITIONS[action].includes(sub.status)) {
    return NextResponse.json(
      { error: `Cannot ${action} a subscription with status: ${sub.status}` },
      { status: 422 }
    );
  }

  const previousStatus = sub.status;
  const newStatus = ACTION_NEW_STATUS[action];
  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updated_at: now,
  };

  if (action === 'pause') {
    updatePayload.paused_at = now;
  } else if (action === 'cancel') {
    updatePayload.cancelled_at = now;
    if (note) updatePayload.cancel_reason = note;
  } else {
    updatePayload.cancelled_at = null;
    updatePayload.paused_at = null;
    updatePayload.past_due_at = null;
  }

  const { data: updated, error: updateError } = await supabase
    .from('subscriptions')
    .update(updatePayload)
    .eq('id', subscriptionId)
    .eq('status', previousStatus)
    .select('id')
    .maybeSingle();

  if (updateError || !updated) {
    console.error(`[admin/subscriptions/${subscriptionId}] Update error:`, updateError?.message ?? 'Concurrent change');
    return NextResponse.json({ error: 'Failed to update subscription.' }, { status: 409 });
  }

  const { error: auditError } = await supabase.from('subscription_audit_logs').insert({
    subscription_id: subscriptionId,
    admin_id: user.id,
    action,
    previous_status: previousStatus,
    new_status: newStatus,
    note: note ?? `Admin ${action}d subscription`,
    metadata: { initiated_by: 'admin', admin_id: user.id },
  });
  if (auditError) console.warn('[admin/subscriptions] Audit log failed:', auditError.message);

  try {
    const { data: authUser } = await supabase.auth.admin.getUserById(sub.user_id);
    const userEmail = authUser?.user?.email ?? '';
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', sub.user_id)
      .maybeSingle();

    const product = Array.isArray(sub.products) ? sub.products[0] : sub.products;
    const plan = Array.isArray(sub.product_plans) ? sub.product_plans[0] : sub.product_plans;

    if (userEmail && action === 'cancel') {
      await sendEmail({
        type: 'subscription_cancelled',
        to: userEmail,
        data: {
          customerName: profile?.full_name ?? '',
          productName: product?.name ?? 'Your Subscription',
          planName: plan?.name ?? 'Plan',
          cancelledAt: now,
          accessUntil: sub.current_period_end ?? now,
          reason: note ?? 'Cancelled by administrator',
        },
      });
    }
  } catch (emailErr) {
    console.warn('[admin/subscriptions] Email send failed (non-fatal):', emailErr);
  }

  return NextResponse.json({
    message: `Subscription ${action}d successfully.`,
    subscriptionId,
    previousStatus,
    newStatus,
  });
}
