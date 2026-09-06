/**
 * Admin Refund API Route
 *
 * POST /api/admin/refund
 *
 * A Payoneer order is only marked refunded after the provider confirms the
 * refund request. Manual orders can be marked refunded directly by an admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { sendEmail } from '@/lib/email/sendEmail';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await requireAdmin(supabase);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { orderId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const reason = body.reason?.trim();
  if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  if (reason && reason.length > 1000) {
    return NextResponse.json({ error: 'reason is too long' }, { status: 400 });
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      `id, user_id, product_id, plan_id, status, amount, currency, provider_payment_ref, metadata,
       user_profiles(email, full_name),
       products(name),
       product_plans(name)`
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.status !== 'completed') {
    return NextResponse.json(
      { error: `Cannot refund order with status: ${order.status}. Only completed orders can be refunded.` },
      { status: 400 }
    );
  }

  const provider = String((order.metadata as Record<string, unknown> | null)?.provider ?? 'manual');
  let providerRefundRef: string | undefined;

  if (provider === 'payoneer') {
    if (!order.provider_payment_ref) {
      return NextResponse.json({ error: 'Missing Payoneer payment reference' }, { status: 409 });
    }

    const merchantCode = process.env.PAYONEER_MERCHANT_CODE;
    const paymentToken = process.env.PAYONEER_PAYMENT_TOKEN;
    const environment = process.env.PAYONEER_ENVIRONMENT === 'live' ? 'live' : 'sandbox';

    if (!merchantCode || !paymentToken) {
      return NextResponse.json(
        { error: 'Payoneer refund is not configured on the server' },
        { status: 503 }
      );
    }

    const baseUrl = environment === 'live'
      ? 'https://api.live.oscato.com'
      : 'https://api.sandbox.oscato.com';
    const credentials = Buffer.from(`${merchantCode}:${paymentToken}`).toString('base64');

    try {
      const refundRes = await fetch(
        `${baseUrl}/checkout/charges/${encodeURIComponent(order.provider_payment_ref)}/refunds`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${credentials}`,
            Accept: 'application/json',
          },
          body: JSON.stringify({
            amount: order.amount,
            currency: order.currency.toUpperCase(),
            reference: `REFUND-${order.id.slice(0, 8).toUpperCase()}`,
            ...(reason ? { comment: reason } : {}),
          }),
          signal: AbortSignal.timeout(15_000),
        }
      );

      if (!refundRes.ok) {
        console.error(`[admin/refund] Payoneer refund failed with status ${refundRes.status}`);
        return NextResponse.json(
          { error: 'Payoneer did not confirm the refund. Order status was not changed.' },
          { status: 502 }
        );
      }

      const refundData = (await refundRes.json()) as { identification?: { longId?: string } };
      providerRefundRef = refundData?.identification?.longId;
      if (!providerRefundRef) {
        return NextResponse.json(
          { error: 'Payoneer refund response did not include a refund reference' },
          { status: 502 }
        );
      }
    } catch (err) {
      console.error('[admin/refund] Payoneer refund request failed:', err);
      return NextResponse.json(
        { error: 'Payoneer refund request failed. Order status was not changed.' },
        { status: 502 }
      );
    }
  } else if (provider !== 'manual') {
    return NextResponse.json(
      { error: `Automatic refunds are not implemented for provider: ${provider}` },
      { status: 501 }
    );
  }

  const refundedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'refunded',
      metadata: {
        ...(order.metadata as Record<string, unknown>),
        refund_reason: reason ?? 'Admin initiated refund',
        refund_initiated_by: user.id,
        refund_initiated_at: refundedAt,
        ...(providerRefundRef ? { provider_refund_ref: providerRefundRef } : {}),
      },
      updated_at: refundedAt,
    })
    .eq('id', orderId)
    .eq('status', 'completed');

  if (updateError) {
    console.error(`[admin/refund] Failed to update order ${orderId}:`, updateError);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }

  const { error: eventError } = await supabase.from('payment_events').insert({
    order_id: orderId,
    provider,
    event_type: 'refunded',
    provider_payment_ref: providerRefundRef ?? order.provider_payment_ref ?? '',
    metadata: {
      refund_reason: reason ?? 'Admin initiated refund',
      initiated_by: user.id,
      ...(providerRefundRef ? { provider_refund_ref: providerRefundRef } : {}),
    },
  });
  if (eventError) console.warn('[admin/refund] Failed to write payment event:', eventError.message);

  const customerEmail = (order.user_profiles as { email?: string } | null)?.email;
  const customerName = (order.user_profiles as { full_name?: string } | null)?.full_name ?? '';
  const productName = (order.products as { name?: string } | null)?.name ?? 'Your product';
  const planName = (order.product_plans as { name?: string } | null)?.name ?? '';

  if (customerEmail) {
    const emailResult = await sendEmail({
      type: 'refund_confirmation',
      to: customerEmail,
      data: {
        customerName,
        orderId,
        productName,
        planName,
        amount: order.amount,
        currency: order.currency,
        refundedAt,
        reason: reason ?? '',
      },
    });
    if (!emailResult.success) {
      console.warn(`[admin/refund] Refund email failed for order ${orderId}:`, emailResult.error);
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Order refunded successfully',
    orderId,
    ...(providerRefundRef ? { providerRefundRef } : {}),
  });
}
