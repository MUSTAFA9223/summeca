/**
 * PATCH /api/admin/refunds/[id]
 *
 * Admin refund workflow. Provider-backed refunds are never reported as
 * completed unless the provider has supplied a refund reference. Manual
 * completion delegates all database reconciliation to one service-only RPC.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { sendEmail } from '@/lib/email/sendEmail';

type RefundAction = 'under_review' | 'approved' | 'processing' | 'completed' | 'rejected' | 'failed';

const VALID_ACTIONS: RefundAction[] = [
  'under_review', 'approved', 'processing', 'completed', 'rejected', 'failed',
];

const ALLOWED_TRANSITIONS: Record<string, RefundAction[]> = {
  pending: ['under_review', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['processing', 'rejected'],
  processing: ['completed', 'failed'],
  completed: [],
  rejected: [],
  failed: ['processing'],
};

function safeError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return safeError('Cross-site request rejected.', 403);
  }

  const { id: refundId } = await params;
  const sessionClient = await createClient();
  const user = await requireAdmin(sessionClient);
  if (!user) return safeError('Forbidden', 403);

  let body: { action?: string; adminNote?: string };
  try { body = await request.json(); }
  catch { return safeError('Invalid request body', 400); }

  if (!body || typeof body !== 'object' || (body.adminNote !== undefined && typeof body.adminNote !== 'string')) {
    return safeError('Invalid request body', 400);
  }

  const action = body.action as RefundAction | undefined;
  const adminNote = body.adminNote?.trim();
  if (!action || !VALID_ACTIONS.includes(action)) return safeError('Invalid refund action.', 400);
  if (adminNote && adminNote.length > 1000) return safeError('Admin note is too long.', 400);

  const service = createServiceClient();
  const { data: refund, error: refundError } = await service
    .from('refunds')
    .select(`
      id, order_id, user_id, amount, currency, reason, status, provider_refund_id,
      orders (
        id, status, amount, currency, provider_payment_ref, metadata,
        products ( name ),
        product_plans ( name ),
        user_profiles ( email, full_name )
      )
    `)
    .eq('id', refundId)
    .single();

  if (refundError || !refund) return safeError('Refund not found.', 404);

  const currentStatus = refund.status;
  if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(action)) {
    return safeError('This refund status transition is not allowed.', 409);
  }

  const order = refund.orders as any;
  if (!order || order.status !== 'completed') return safeError('Order is no longer eligible for refund.', 409);

  const provider = String((order.metadata as Record<string, unknown> | null)?.provider ?? 'manual');
  let providerRefundId = refund.provider_refund_id || undefined;
  let expectedStatus = currentStatus;
  let nextStatus: RefundAction = action;

  if (provider !== 'manual' &&
      (action === 'completed' || action === 'failed' ||
       (action === 'rejected' && (providerRefundId || currentStatus === 'approved')))) {
    return safeError('Provider-backed refunds require verified provider reconciliation. No new refund was sent.', 409);
  }

  if (action === 'completed' && provider === 'manual') {
    if (Number(refund.amount) !== Number(order.amount) || String(refund.currency).toUpperCase() !== String(order.currency).toUpperCase()) {
      return safeError('Refund amount or currency does not match the stored order.', 409);
    }

    const eventRef = `manual-refund-${refundId}`;
    const { data: reconciliation, error: reconcileError } = await service.rpc('finalize_verified_refund', {
      p_order_id: refund.order_id,
      p_provider: 'manual',
      p_provider_ref: eventRef,
      p_metadata: {
        refund_id: refundId,
        refund_amount: refund.amount,
        currency: refund.currency,
        completed_by: user.id,
        source: 'admin_manual_refund',
        ...(adminNote ? { admin_note: adminNote } : {}),
      },
    });

    const result = reconciliation as { ok?: boolean; error?: string; refund_id?: string | null } | null;
    if (reconcileError || result?.ok !== true || (result.refund_id && result.refund_id !== refundId)) {
      console.error('[admin/refunds] Atomic manual reconciliation failed:', reconcileError?.code || 'rpc_failed');
      return safeError('Unable to complete the refund atomically. No success was reported.', 409);
    }

    providerRefundId = eventRef;
    nextStatus = 'completed';
  } else {
    // Starting an approved Payoneer refund must succeed at Payoneer first.
    if (action === 'approved' && provider === 'payoneer') {
      const providerPaymentRef = order.provider_payment_ref as string | undefined;
      const merchantCode = process.env.PAYONEER_MERCHANT_CODE;
      const paymentToken = process.env.PAYONEER_PAYMENT_TOKEN;
      const environment = process.env.PAYONEER_ENVIRONMENT === 'live' ? 'live' : 'sandbox';

      if (!providerPaymentRef) return safeError('Missing Payoneer payment reference.', 409);
      if (!merchantCode || !paymentToken) return safeError('Payoneer refunds are not configured on the server.', 503);
      if (providerRefundId) return safeError('A provider refund already exists. Await reconciliation.', 409);
      if (Number(refund.amount) !== Number(order.amount) || refund.currency !== order.currency) {
        return safeError('Refund amount does not match the stored order.', 409);
      }

      const claim = await service.from('refunds')
        .update({ status: 'processing', reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', refundId)
        .eq('status', 'under_review')
        .select('id')
        .maybeSingle();
      if (claim.error || !claim.data) return safeError('Refund was already claimed or changed. Refresh its status.', 409);

      expectedStatus = 'processing';
      nextStatus = 'processing';

      const baseUrl = environment === 'live' ? 'https://api.live.oscato.com' : 'https://api.sandbox.oscato.com';
      const credentials = Buffer.from(`${merchantCode}:${paymentToken}`).toString('base64');

      try {
        const refundResponse = await fetch(
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
              currency: String(refund.currency).toUpperCase(),
              reference: `REFUND-${refundId}`,
            }),
            signal: AbortSignal.timeout(15_000),
          },
        );

        if (!refundResponse.ok) {
          console.error(`[admin/refunds] Payoneer refund failed with status ${refundResponse.status}`);
          return safeError('Payoneer did not confirm acceptance. Refund remains processing; reconcile with the provider before any retry.', 502);
        }

        const refundData = await refundResponse.json() as { identification?: { longId?: string } };
        providerRefundId = refundData.identification?.longId;
        if (!providerRefundId) return safeError('No refund reference was returned. Refund remains processing; provider reconciliation is required.', 502);
      } catch (error) {
        console.error('[admin/refunds] Payoneer refund request failed:', error instanceof Error ? error.name : 'unknown');
        return safeError('Provider response is uncertain. Refund remains processing; do not submit another refund.', 502);
      }
    } else if (action === 'approved' && provider !== 'manual' && provider !== 'payoneer') {
      return safeError('Refund integration is not implemented for this provider.', 501);
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = { status: nextStatus, updated_at: now };
    if (adminNote) updatePayload.admin_note = adminNote;
    if (['under_review', 'approved', 'rejected'].includes(action)) updatePayload.reviewed_at = now;
    if (providerRefundId) updatePayload.provider_refund_id = providerRefundId;

    const { data: updated, error: updateError } = await service
      .from('refunds')
      .update(updatePayload)
      .eq('id', refundId)
      .eq('status', expectedStatus)
      .select('id')
      .maybeSingle();

    if (updateError || !updated) {
      console.error('[admin/refunds] Refund state update failed:', updateError?.code || 'concurrent_change');
      return safeError('Unable to update the refund. Refresh and try again.', 409);
    }
  }

  const now = new Date().toISOString();
  const customerEmail = order.user_profiles?.email;
  const customerName = order.user_profiles?.full_name ?? '';
  const productName = order.products?.name ?? 'Your product';
  const planName = order.product_plans?.name ?? '';
  const emailTypeMap: Record<RefundAction, string | null> = {
    under_review: null,
    approved: 'refund_approved',
    processing: null,
    completed: 'refund_completed',
    rejected: 'refund_rejected',
    failed: null,
  };

  const emailType = emailTypeMap[action];
  let emailNotificationSent = false;
  if (customerEmail && emailType) {
    try {
      const emailResult = await sendEmail({
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
          status: nextStatus,
          adminNote: adminNote ?? '',
          updatedAt: now,
        },
      });
      emailNotificationSent = emailResult.success === true;
    } catch (error) {
      console.warn('[admin/refunds] Email delivery failed:', error instanceof Error ? error.name : 'unknown');
    }
  }

  return NextResponse.json({
    success: true,
    refundId,
    previousStatus: currentStatus,
    newStatus: nextStatus,
    emailNotificationSent,
    ...(providerRefundId ? { providerRefundId } : {}),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
