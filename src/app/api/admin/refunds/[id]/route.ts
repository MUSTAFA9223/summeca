/**
 * PATCH /api/admin/refunds/[id]
 *
 * Admin refund workflow. Provider-backed refunds are never reported as
 * completed unless the provider has supplied a refund reference.
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: refundId } = await params;
  const sessionClient = await createClient();
  const user = await requireAdmin(sessionClient);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { action?: string; adminNote?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const action = body.action as RefundAction | undefined;
  const adminNote = body.adminNote?.trim();
  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: `action must be one of: ${VALID_ACTIONS.join(', ')}` }, { status: 400 });
  }
  if (adminNote && adminNote.length > 1000) {
    return NextResponse.json({ error: 'adminNote is too long' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: refund, error: refundError } = await supabase
    .from('refunds')
    .select(`
      id, order_id, user_id, amount, currency, reason, status, provider_refund_id,
      orders (
        id, status, provider_payment_ref, metadata,
        products ( name ),
        product_plans ( name ),
        user_profiles ( email, full_name )
      )
    `)
    .eq('id', refundId)
    .single();

  if (refundError || !refund) return NextResponse.json({ error: 'Refund not found' }, { status: 404 });

  const currentStatus = refund.status;
  if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(action)) {
    return NextResponse.json(
      { error: `Cannot transition from '${currentStatus}' to '${action}'` },
      { status: 400 }
    );
  }

  const order = refund.orders as any;
  const provider = String((order?.metadata as Record<string, unknown> | null)?.provider ?? 'manual');
  let providerRefundId = refund.provider_refund_id || undefined;

  // Starting an approved Payoneer refund must succeed at Payoneer first.
  if (action === 'approved' && provider === 'payoneer') {
    const providerPaymentRef = order?.provider_payment_ref as string | undefined;
    const merchantCode = process.env.PAYONEER_MERCHANT_CODE;
    const paymentToken = process.env.PAYONEER_PAYMENT_TOKEN;
    const environment = process.env.PAYONEER_ENVIRONMENT === 'live' ? 'live' : 'sandbox';

    if (!providerPaymentRef) {
      return NextResponse.json({ error: 'Missing Payoneer payment reference' }, { status: 409 });
    }
    if (!merchantCode || !paymentToken) {
      return NextResponse.json({ error: 'Payoneer refunds are not configured on the server' }, { status: 503 });
    }

    const baseUrl = environment === 'live'
      ? 'https://api.live.oscato.com'
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

      if (!refundRes.ok) {
        console.error(`[admin/refunds] Payoneer refund failed with status ${refundRes.status}`);
        return NextResponse.json({ error: 'Payoneer did not accept the refund request' }, { status: 502 });
      }

      const refundData = (await refundRes.json()) as { identification?: { longId?: string } };
      providerRefundId = refundData?.identification?.longId;
      if (!providerRefundId) {
        return NextResponse.json({ error: 'Payoneer did not return a refund reference' }, { status: 502 });
      }
    } catch (err) {
      console.error('[admin/refunds] Payoneer refund request failed:', err);
      return NextResponse.json({ error: 'Payoneer refund request failed' }, { status: 502 });
    }
  } else if (action === 'approved' && provider !== 'manual' && provider !== 'payoneer') {
    return NextResponse.json(
      { error: `Refund integration is not implemented for provider: ${provider}` },
      { status: 501 }
    );
  }

  // A provider-backed refund cannot be manually declared completed without proof.
  if (action === 'completed' && provider !== 'manual' && !providerRefundId) {
    return NextResponse.json(
      { error: 'Provider confirmation is required before completing this refund' },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    status: action,
    updated_at: now,
  };

  if (adminNote) updatePayload.admin_note = adminNote;
  if (['under_review', 'approved', 'rejected'].includes(action)) updatePayload.reviewed_at = now;
  if (action === 'completed') updatePayload.completed_at = now;
  if (providerRefundId) updatePayload.provider_refund_id = providerRefundId;

  const { data: updated, error: updateError } = await supabase
    .from('refunds')
    .update(updatePayload)
    .eq('id', refundId)
    .eq('status', currentStatus)
    .select('id')
    .maybeSingle();

  if (updateError || !updated) {
    console.error(`[admin/refunds] Failed to update refund ${refundId}:`, updateError?.message ?? 'Concurrent change');
    return NextResponse.json({ error: 'Failed to update refund' }, { status: 409 });
  }

  if (action === 'completed') {
    const { error: orderError } = await supabase
      .from('orders')
      .update({ status: 'refunded', updated_at: now })
      .eq('id', refund.order_id)
      .eq('status', 'completed');

    if (orderError) {
      console.error('[admin/refunds] Failed to update order after refund:', orderError.message);
      return NextResponse.json({ error: 'Refund updated but order status update failed' }, { status: 500 });
    }

    const { error: eventError } = await supabase.from('payment_events').insert({
      order_id: refund.order_id,
      provider,
      event_type: 'refunded',
      provider_payment_ref: providerRefundId ?? order?.provider_payment_ref ?? '',
      metadata: {
        refund_id: refundId,
        refund_amount: refund.amount,
        completed_by: user.id,
      },
    });
    if (eventError && eventError.code !== '23505') {
      console.warn('[admin/refunds] Failed to log refund event:', eventError.message);
    }
  }

  const customerEmail = order?.user_profiles?.email;
  const customerName = order?.user_profiles?.full_name ?? '';
  const productName = order?.products?.name ?? 'Your product';
  const planName = order?.product_plans?.name ?? '';

  const emailTypeMap: Record<RefundAction, string | null> = {
    under_review: null,
    approved: 'refund_approved',
    processing: null,
    completed: 'refund_completed',
    rejected: 'refund_rejected',
    failed: null,
  };

  const emailType = emailTypeMap[action];
  if (customerEmail && emailType) {
    try {
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
          status: action,
          adminNote: adminNote ?? '',
          updatedAt: now,
        },
      });
    } catch (emailErr) {
      console.warn('[admin/refunds] Email failed (non-fatal):', emailErr);
    }
  }

  return NextResponse.json({
    success: true,
    refundId,
    previousStatus: currentStatus,
    newStatus: action,
    ...(providerRefundId ? { providerRefundId } : {}),
  });
}
