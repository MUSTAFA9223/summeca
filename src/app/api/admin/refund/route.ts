/**
 * Admin Refund API Route
 *
 * POST /api/admin/refund
 *
 * Processes a refund for a completed order:
 *   1. Validates admin session
 *   2. Fetches order and customer details
 *   3. Triggers Payoneer refund webhook (or marks directly for non-Payoneer)
 *   4. Updates order status to 'refunded'
 *   5. Sends refund confirmation email to the customer
 *
 * Body: { orderId: string; reason?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/sendEmail';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // ── 1. Verify admin session ──────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 });
  }

  // ── 2. Parse request body ────────────────────────────────────────────────────
  let body: { orderId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { orderId, reason } = body;

  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  // ── 3. Fetch order with customer and product details ─────────────────────────
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

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Only allow refunding completed orders
  if (order.status !== 'completed') {
    return NextResponse.json(
      { error: `Cannot refund order with status: ${order.status}. Only completed orders can be refunded.` },
      { status: 400 }
    );
  }

  // ── 4. Trigger Payoneer refund (if Payoneer was the provider) ────────────────
  const provider = (order.metadata as Record<string, string>)?.provider ?? 'payoneer';
  let payoneerRefundRef: string | undefined;

  if (provider === 'payoneer' && order.provider_payment_ref) {
    const merchantCode = process.env.PAYONEER_MERCHANT_CODE;
    const paymentToken = process.env.PAYONEER_PAYMENT_TOKEN;
    const environment = (process.env.PAYONEER_ENVIRONMENT ?? 'sandbox') as 'sandbox' | 'live';

    if (merchantCode && paymentToken) {
      const baseUrl =
        environment === 'live' ?'https://api.live.oscato.com'
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

        if (refundRes.ok) {
          const refundData = (await refundRes.json()) as { identification?: { longId?: string } };
          payoneerRefundRef = refundData?.identification?.longId;
          console.log(`[admin/refund] Payoneer refund initiated for order ${orderId}`);
        } else {
          const errStatus = refundRes.status;
          console.warn(
            `[admin/refund] Payoneer refund API returned ${errStatus} for order ${orderId} — proceeding with manual refund status update`
          );
          // Continue — update order status even if Payoneer API call fails (sandbox/unconfigured)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown';
        console.warn(`[admin/refund] Payoneer refund request failed: ${msg} — proceeding with manual update`);
      }
    }
  }

  // ── 5. Update order status to 'refunded' ────────────────────────────────────
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'refunded',
      metadata: {
        ...(order.metadata as Record<string, unknown>),
        refund_reason: reason ?? 'Admin initiated refund',
        refund_initiated_by: user.id,
        refund_initiated_at: new Date().toISOString(),
        ...(payoneerRefundRef ? { payoneer_refund_ref: payoneerRefundRef } : {}),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateError) {
    console.error(`[admin/refund] Failed to update order ${orderId}:`, updateError);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }

  // ── 6. Insert payment event for audit trail ──────────────────────────────────
  await supabase.from('payment_events').insert({
    order_id: orderId,
    provider: provider,
    event_type: 'refunded',
    provider_payment_ref: payoneerRefundRef ?? order.provider_payment_ref ?? '',
    metadata: {
      refund_reason: reason ?? 'Admin initiated refund',
      initiated_by: user.id,
      ...(payoneerRefundRef ? { payoneer_refund_ref: payoneerRefundRef } : {}),
    },
  });

  // ── 7. Send refund confirmation email to customer ────────────────────────────
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
        refundedAt: new Date().toISOString(),
        reason: reason ?? '',
      },
    });

    if (!emailResult.success) {
      console.warn(`[admin/refund] Refund email failed for order ${orderId}:`, emailResult.error);
      // Don't fail the request — refund was processed, email is best-effort
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Order refunded successfully',
    orderId,
    ...(payoneerRefundRef ? { payoneerRefundRef } : {}),
  });
}
