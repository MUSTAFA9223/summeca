/**
 * Admin Refund Management API
 *
 * PATCH /api/admin/refunds/[id]
 *
 * Allows admins to transition refund status:
 *   pending → under_review → approved → processing → completed
 *   any → rejected
 *   processing → failed
 *
 * When status moves to 'approved', triggers Payoneer refund API if configured.
 * Sends appropriate email notification on each status change.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/sendEmail';

type RefundAction = 'under_review' | 'approved' | 'processing' | 'completed' | 'rejected' | 'failed';

const VALID_ACTIONS: RefundAction[] = [
  'under_review', 'approved', 'processing', 'completed', 'rejected', 'failed',
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: refundId } = await params;
  const supabase = await createClient();

  // ── 1. Verify admin session ──────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
  }

  // ── 2. Parse body ────────────────────────────────────────────────────────
  let body: { action?: string; adminNote?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { action, adminNote } = body;

  if (!action || !VALID_ACTIONS.includes(action as RefundAction)) {
    return NextResponse.json(
      { error: `action must be one of: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 }
    );
  }

  // ── 3. Fetch refund with order and customer details ──────────────────────
  const { data: refund, error: refundError } = await supabase
    .from('refunds')
    .select(`
      id, order_id, user_id, amount, currency, reason, status, provider_refund_id,
      orders (
        id, provider_payment_ref, metadata,
        products ( name ),
        product_plans ( name ),
        user_profiles ( email, full_name )
      )
    `)
    .eq('id', refundId)
    .single();

  if (refundError || !refund) {
    return NextResponse.json({ error: 'Refund not found' }, { status: 404 });
  }

  // ── 4. Validate state transition ─────────────────────────────────────────
  const currentStatus = refund.status;
  const newStatus = action as RefundAction;

  const allowedTransitions: Record<string, RefundAction[]> = {
    pending: ['under_review', 'rejected'],
    under_review: ['approved', 'rejected'],
    approved: ['processing', 'rejected'],
    processing: ['completed', 'failed'],
    completed: [],
    rejected: [],
    failed: ['processing'],
  };

  if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from '${currentStatus}' to '${newStatus}'` },
      { status: 400 }
    );
  }

  // ── 5. Payoneer refund API call when moving to 'approved' ─────────────────
  let providerRefundId: string | undefined;
  let payoneerAttempted = false;
  let payoneerConfigured = false;

  if (newStatus === 'approved') {
    const order = refund.orders as any;
    const providerPaymentRef = order?.provider_payment_ref;
    const provider = (order?.metadata as Record<string, string>)?.provider ?? 'payoneer';

    const merchantCode = process.env.PAYONEER_MERCHANT_CODE;
    const paymentToken = process.env.PAYONEER_PAYMENT_TOKEN;
    const environment = (process.env.PAYONEER_ENVIRONMENT ?? 'sandbox') as 'sandbox' | 'live';

    payoneerConfigured = Boolean(merchantCode && paymentToken);

    if (provider === 'payoneer' && providerPaymentRef && payoneerConfigured) {
      payoneerAttempted = true;
      const baseUrl =
        environment === 'live' ?'https://api.live.oscato.com'
          : 'https://api.sandbox.oscato.com';

      const credentials = Buffer.from(`${merchantCode}:${paymentToken}`).toString('base64');

      try {
        const refundRes = await fetch(
          `${baseUrl}/checkout/charges/${encodeURIComponent(providerPaymentRef)}/refunds`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Basic ${credentials}`,
              Accept: 'application/json',
            },
            body: JSON.stringify({
              amount: Number(refund.amount),
              currency: refund.currency.toUpperCase(),
              reference: `REFUND-${refundId.slice(0, 8).toUpperCase()}`,
            }),
            signal: AbortSignal.timeout(15_000),
          }
        );

        if (refundRes.ok) {
          const refundData = (await refundRes.json()) as { identification?: { longId?: string } };
          providerRefundId = refundData?.identification?.longId;
          console.log(`[admin/refunds] Payoneer refund initiated for refund ${refundId}`);
        } else {
          console.warn(
            `[admin/refunds] Payoneer refund API returned ${refundRes.status} for refund ${refundId}`
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        console.warn(`[admin/refunds] Payoneer refund request failed: ${msg}`);
      }
    }
  }

  // ── 6. Build update payload ───────────────────────────────────────────────
  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updated_at: now,
  };

  if (adminNote) {
    updatePayload.admin_note = adminNote.slice(0, 1000).trim();
  }

  if (newStatus === 'under_review' || newStatus === 'approved' || newStatus === 'rejected') {
    updatePayload.reviewed_at = now;
  }

  if (newStatus === 'completed') {
    updatePayload.completed_at = now;
  }

  if (providerRefundId) {
    updatePayload.provider_refund_id = providerRefundId;
  }

  // ── 7. Update refund record ───────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from('refunds')
    .update(updatePayload)
    .eq('id', refundId);

  if (updateError) {
    console.error(`[admin/refunds] Failed to update refund ${refundId}:`, updateError);
    return NextResponse.json({ error: 'Failed to update refund' }, { status: 500 });
  }

  // If completed, also update the order status to 'refunded'
  if (newStatus === 'completed') {
    await supabase
      .from('orders')
      .update({ status: 'refunded', updated_at: now })
      .eq('id', refund.order_id);

    // Log payment event
    await supabase.from('payment_events').insert({
      order_id: refund.order_id,
      provider: 'payoneer',
      event_type: 'refunded',
      provider_payment_ref: providerRefundId ?? '',
      metadata: {
        refund_id: refundId,
        refund_amount: refund.amount,
        completed_by: user.id,
      },
    });
  }

  // ── 8. Send email notification ────────────────────────────────────────────
  const order = refund.orders as any;
  const customerEmail = order?.user_profiles?.email;
  const customerName = order?.user_profiles?.full_name ?? '';
  const productName = order?.products?.name ?? 'Your product';
  const planName = order?.product_plans?.name ?? '';

  if (customerEmail) {
    const emailTypeMap: Record<RefundAction, string | null> = {
      under_review: null,
      approved: 'refund_approved',
      processing: null,
      completed: 'refund_completed',
      rejected: 'refund_rejected',
      failed: null,
    };

    const emailType = emailTypeMap[newStatus];
    if (emailType) {
      await sendEmail({
        type: emailType as any,
        to: customerEmail,
        data: {
          customerName,
          orderId: refund.order_id,
          refundId,
          productName,
          planName,
          amount: refund.amount,
          currency: refund.currency,
          status: newStatus,
          adminNote: adminNote ?? '',
          updatedAt: now,
        },
      });
    }
  }

  // ── 9. Build response ─────────────────────────────────────────────────────
  const response: Record<string, unknown> = {
    success: true,
    refundId,
    previousStatus: currentStatus,
    newStatus,
  };

  if (newStatus === 'approved' && !payoneerConfigured) {
    response.payoneerWarning =
      'Payoneer credentials are not configured. Refund status set to approved. ' + 'Configure PAYONEER_MERCHANT_CODE and PAYONEER_PAYMENT_TOKEN to process via Payoneer.';
  }

  if (providerRefundId) {
    response.providerRefundId = providerRefundId;
  }

  return NextResponse.json(response);
}
