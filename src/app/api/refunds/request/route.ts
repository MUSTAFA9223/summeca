/**
 * POST /api/refunds/request
 * Customer-facing refund request endpoint.
 *
 * Security:
 * - Authenticates user and verifies order ownership server-side.
 * - Reads amount/currency/status from the order, never from the client.
 * - Creates the refund with the server-only service role after authorization.
 * - Database unique index and duplicate check prevent concurrent active requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';
import { sendEmail } from '@/lib/email/sendEmail';

const VALID_REASONS = ['product_issue', 'not_satisfied', 'duplicate_purchase', 'other'] as const;
type RefundReason = typeof VALID_REASONS[number];

export async function POST(request: NextRequest) {
  const sessionClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await sessionClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rate = checkRateLimit(`refund-request:${getRequestIdentity(request, user.id)}`, {
    limit: 5,
    windowMs: 60 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many refund requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))),
        },
      }
    );
  }

  let body: { orderId?: string; reason?: string; customerNote?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  const reason = body.reason;
  const sanitizedNote = (body.customerNote ?? '').slice(0, 1000).trim();

  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }
  if (!reason || !VALID_REASONS.includes(reason as RefundReason)) {
    return NextResponse.json(
      { error: `reason must be one of: ${VALID_REASONS.join(', ')}` },
      { status: 400 }
    );
  }

  const { data: order, error: orderError } = await sessionClient
    .from('orders')
    .select(`
      id, user_id, status, amount, currency,
      products ( name ),
      product_plans ( name ),
      user_profiles ( email, full_name )
    `)
    .eq('id', orderId)
    .eq('user_id', user.id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (order.status !== 'completed') {
    return NextResponse.json(
      { error: 'Refunds can only be requested for completed orders.' },
      { status: 400 }
    );
  }

  const service = createServiceClient();
  const { data: existingRefund } = await service
    .from('refunds')
    .select('id, status')
    .eq('order_id', orderId)
    .not('status', 'in', '("rejected","failed")')
    .maybeSingle();

  if (existingRefund) {
    return NextResponse.json(
      {
        error: `A refund request already exists for this order with status: ${existingRefund.status}`,
        existingRefundId: existingRefund.id,
        existingStatus: existingRefund.status,
      },
      { status: 409 }
    );
  }

  const requestedAt = new Date().toISOString();
  const { data: refund, error: insertError } = await service
    .from('refunds')
    .insert({
      order_id: orderId,
      user_id: user.id,
      amount: order.amount,
      currency: order.currency,
      reason: reason as RefundReason,
      customer_note: sanitizedNote,
      status: 'pending',
      requested_at: requestedAt,
    })
    .select('id')
    .single();

  if (insertError || !refund) {
    if (insertError?.code === '23505') {
      return NextResponse.json(
        { error: 'An active refund request already exists for this order.' },
        { status: 409 }
      );
    }
    console.error('[refunds/request] Insert error:', insertError?.message);
    return NextResponse.json({ error: 'Failed to create refund request' }, { status: 500 });
  }

  const customerEmail = (order.user_profiles as { email?: string } | null)?.email ?? user.email;
  const customerName = (order.user_profiles as { full_name?: string } | null)?.full_name ?? '';
  const productName = (order.products as { name?: string } | null)?.name ?? 'Your product';
  const planName = (order.product_plans as { name?: string } | null)?.name ?? '';

  if (customerEmail) {
    try {
      await sendEmail({
        type: 'refund_requested',
        to: customerEmail,
        data: {
          customerName,
          orderId,
          refundId: refund.id,
          productName,
          planName,
          amount: order.amount,
          currency: order.currency,
          reason,
          customerNote: sanitizedNote,
          requestedAt,
        },
      });
    } catch (emailErr) {
      console.warn('[refunds/request] Confirmation email failed:', emailErr);
    }
  }

  return NextResponse.json(
    {
      success: true,
      refundId: refund.id,
      message:
        'Refund request submitted successfully. Its status will be updated after review; no review or payout timeframe is guaranteed by this request.',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
