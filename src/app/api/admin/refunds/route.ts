import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const PAGE_SIZE = 20;
const VALID_STATUSES = new Set(['pending', 'under_review', 'approved', 'processing', 'completed', 'rejected', 'failed']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const page = Math.max(0, Math.min(10_000, Number.parseInt(params.get('page') || '0', 10) || 0));
  const status = params.get('status') || 'all';
  const search = (params.get('search') || '').trim();

  if (status !== 'all' && !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid refund status.' }, { status: 400 });
  }
  if (search && !UUID_PATTERN.test(search)) {
    return NextResponse.json({ refunds: [], count: 0, searchRequiresFullId: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  }

  let query = supabase
    .from('refunds')
    .select(`
      id, order_id, user_id, amount, currency, reason, customer_note, admin_note,
      status, provider_refund_id, requested_at, reviewed_at, completed_at, created_at,
      orders ( id, provider_payment_ref, metadata, products ( name ), product_plans ( name ) ),
      user_profiles ( email, full_name )
    `, { count: 'exact' })
    .order('requested_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (status !== 'all') query = query.eq('status', status);
  if (search) query = query.or(`id.eq.${search},order_id.eq.${search}`);

  const { data, error, count } = await query;
  if (error) {
    console.error('[admin/refunds] Read failed:', error.code || 'db_error');
    return NextResponse.json({ error: 'Unable to load refunds.' }, { status: 500 });
  }

  return NextResponse.json(
    { refunds: data || [], count: count || 0 },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}
