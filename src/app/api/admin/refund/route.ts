/**
 * Admin order action creates/reuses a refund request.
 * Only the central refund workflow may contact a payment provider.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Cross-site request rejected.' }, { status: 403 });
  }
  const session = await createClient();
  const admin = await requireAdmin(session);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.orderId !== 'string' ||
      (body.reason !== undefined && typeof body.reason !== 'string')) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const orderId = body.orderId.trim();
  const reason = (body.reason ?? '').trim();
  if (!orderId || reason.length > 1000) {
    return NextResponse.json({ error: 'Invalid order or reason.' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: order, error } = await service.from('orders')
    .select('id, user_id, status, amount, currency')
    .eq('id', orderId).maybeSingle();
  if (error || !order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (order.status !== 'completed') {
    return NextResponse.json({ error: 'Only completed orders can enter refund review.' }, { status: 409 });
  }

  const findExisting = () => service.from('refunds').select('id, status')
    .eq('order_id', orderId).not('status', 'in', '("rejected","failed")').maybeSingle();
  const existing = await findExisting();
  if (existing.error) return NextResponse.json({ error: 'Could not inspect refund requests.' }, { status: 503 });
  if (existing.data) {
    return NextResponse.json({ success: true, refundId: existing.data.id, status: existing.data.status });
  }

  const created = await service.from('refunds').insert({
    order_id: order.id, user_id: order.user_id,
    amount: order.amount, currency: order.currency,
    reason: 'other', admin_note: reason, status: 'pending',
  }).select('id').single();
  if (created.error?.code === '23505') {
    const concurrent = await findExisting();
    if (concurrent.data) {
      return NextResponse.json({ success: true, refundId: concurrent.data.id, status: concurrent.data.status });
    }
  }
  if (created.error || !created.data) {
    return NextResponse.json({ error: 'Could not create refund request.' }, { status: 503 });
  }
  return NextResponse.json({ success: true, refundId: created.data.id, status: 'pending' }, { status: 201 });
}
