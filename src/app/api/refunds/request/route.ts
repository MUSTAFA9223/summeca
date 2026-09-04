/**
 * POST /api/refunds/request
 *
 * Customer-facing refund request endpoint.
 *
 * Security contract:
 * - Authenticates user via Supabase session (never trusts client-provided user_id)
 * - Verifies order ownership server-side
 * - Verifies order is completed (never trusts client-provided status)
 * - Verifies no active refund already exists for this order
 * - Amount is read from the order record, never from the client
 * - Sends refund_requested email via Resend
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/sendEmail';

const VALID_REASONS = ['product_issue', 'not_satisfied', 'duplicate_purchase', 'other'] as const;
type RefundReason = typeof VALID_REASONS[number];

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // ── 1. Authenticate user ──────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Parse and validate request body ───────────────────────────────────
  let body: { orderId?: string; reason?: string; customerNote?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { orderId, reason, customerNote } = body;

  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  if (!reason || !VALID_REASONS.includes(reason as RefundReason)) {
    return NextResponse.json(
      { error: `reason must be one of: ${VALID_REASONS.join(', ')}` },
      { status: 400 }
    );
  }

  // Sanitize customer note
  const sanitizedNote = (customerNote ?? '').slice(0, 1000).trim();

  // ── 3. Fetch order — verify ownership and status server-side ─────────────
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      id, user_id, status, amount, currency,
      products ( name ),
      product_plans ( name ),
      user_profiles ( email, full_name )
    `)
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Verify ownership — never trust client
  if (order.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden — not your order' }, { status: 403 });
  }

  // Verify order is completed
  if (order.status !== 'completed') {
    return NextResponse.json(
      { error: `Refunds can only be requested for completed orders. This order is: ${order.status}` },
      { status: 400 }
    );
  }

  // ── 4. Check for existing active refund (prevent duplicates) ─────────────
  const { data: existingRefund } = await supabase
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

  // ── 5. Create refund record — amount from order, never from client ────────
  const { data: refund, error: insertError } = await supabase
    .from('refunds')
    .insert({
      order_id: orderId,
      user_id: user.id,
      amount: order.amount,        // server-side: from order record
      currency: order.currency,    // server-side: from order record
      reason: reason as RefundReason,
      customer_note: sanitizedNote,
      status: 'pending',
      requested_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !refund) {
    console.error('[refunds/request] Insert error:', insertError);
    return NextResponse.json({ error: 'Failed to create refund request' }, { status: 500 });
  }

  // ── 6. Send refund_requested email ────────────────────────────────────────
  const customerEmail = (order.user_profiles as { email?: string } | null)?.email;
  const customerName = (order.user_profiles as { full_name?: string } | null)?.full_name ?? '';
  const productName = (order.products as { name?: string } | null)?.name ?? 'Your product';
  const planName = (order.product_plans as { name?: string } | null)?.name ?? '';

  if (customerEmail) {
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
        requestedAt: new Date().toISOString(),
      },
    });
  }

  return NextResponse.json({
    success: true,
    refundId: refund.id,
    message: 'Refund request submitted successfully. Our team will review it within 1–3 business days.',
  });
}
