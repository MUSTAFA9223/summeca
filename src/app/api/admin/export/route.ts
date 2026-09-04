import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ];
  return lines.join('\n');
}

function buildDateFilter(dateRange: string, customFrom?: string, customTo?: string) {
  const now = new Date();
  let from: Date | null = null;
  let to: Date | null = null;

  switch (dateRange) {
    case 'today': {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    }
    case 'yesterday': {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      from = new Date(y.getFullYear(), y.getMonth(), y.getDate());
      to = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      break;
    }
    case '7d': { from = new Date(now); from.setDate(from.getDate() - 7); break; }
    case '30d': { from = new Date(now); from.setDate(from.getDate() - 30); break; }
    case '90d': { from = new Date(now); from.setDate(from.getDate() - 90); break; }
    case 'this_month': {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
    case 'prev_month': {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
    case 'this_year': {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    }
    case 'custom': {
      if (customFrom) from = new Date(customFrom);
      if (customTo) { to = new Date(customTo); to.setHours(23, 59, 59, 999); }
      break;
    }
    default: break; // all_time
  }
  return { from, to };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  // Server-side admin check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') ?? 'orders';
  const dateRange = searchParams.get('dateRange') ?? 'all_time';
  const customFrom = searchParams.get('from') ?? undefined;
  const customTo = searchParams.get('to') ?? undefined;

  const { from, to } = buildDateFilter(dateRange, customFrom, customTo);

  const today = new Date().toISOString().slice(0, 10);
  const filename = `SUMMECA-${type}-${today}.csv`;

  let csvData = '';

  try {
    if (type === 'orders') {
      let q = supabase
        .from('orders')
        .select('id, status, amount, currency, discount_amount, provider_payment_ref, created_at, updated_at, user_profiles(email, full_name), products(name)')
        .order('created_at', { ascending: false });
      if (from) q = q.gte('created_at', from.toISOString());
      if (to) q = q.lte('created_at', to.toISOString());
      const { data } = await q;
      const rows = (data ?? []).map((o: any) => ({
        order_id: o.id,
        customer_email: o.user_profiles?.email ?? '',
        customer_name: o.user_profiles?.full_name ?? '',
        product: o.products?.name ?? '',
        amount: o.amount,
        currency: o.currency,
        discount_amount: o.discount_amount,
        status: o.status,
        provider_payment_ref: o.provider_payment_ref ?? '',
        created_at: o.created_at,
        updated_at: o.updated_at,
      }));
      csvData = toCSV(rows);
    } else if (type === 'products') {
      const { data } = await supabase
        .from('products')
        .select('id, name, slug, category, status, created_at, updated_at')
        .order('created_at', { ascending: false });
      csvData = toCSV((data ?? []) as Record<string, unknown>[]);
    } else if (type === 'customers') {
      let q = supabase
        .from('user_profiles')
        .select('id, email, full_name, plan_tier, created_at, updated_at')
        .order('created_at', { ascending: false });
      if (from) q = q.gte('created_at', from.toISOString());
      if (to) q = q.lte('created_at', to.toISOString());
      const { data } = await q;
      // Never export passwords, tokens, stripe_customer_id
      const rows = (data ?? []).map((u: any) => ({
        customer_id: u.id,
        email: u.email,
        full_name: u.full_name,
        plan_tier: u.plan_tier,
        registered_at: u.created_at,
      }));
      csvData = toCSV(rows);
    } else if (type === 'payments') {
      let q = supabase
        .from('payment_events')
        .select('id, order_id, provider, event_type, provider_payment_ref, created_at')
        .order('created_at', { ascending: false });
      if (from) q = q.gte('created_at', from.toISOString());
      if (to) q = q.lte('created_at', to.toISOString());
      const { data } = await q;
      // metadata excluded — may contain provider secrets
      csvData = toCSV((data ?? []) as Record<string, unknown>[]);
    } else if (type === 'subscriptions') {
      let q = supabase
        .from('subscriptions')
        .select('id, status, current_period_start, current_period_end, cancelled_at, created_at, user_profiles(email, full_name), products(name), product_plans(name, billing_period)')
        .order('created_at', { ascending: false });
      if (from) q = q.gte('created_at', from.toISOString());
      if (to) q = q.lte('created_at', to.toISOString());
      const { data } = await q;
      const rows = (data ?? []).map((s: any) => ({
        subscription_id: s.id,
        customer_email: s.user_profiles?.email ?? '',
        customer_name: s.user_profiles?.full_name ?? '',
        product: s.products?.name ?? '',
        plan: s.product_plans?.name ?? '',
        billing_period: s.product_plans?.billing_period ?? '',
        status: s.status,
        period_start: s.current_period_start,
        period_end: s.current_period_end ?? '',
        cancelled_at: s.cancelled_at ?? '',
        created_at: s.created_at,
      }));
      csvData = toCSV(rows);
    } else if (type === 'revenue') {
      let q = supabase
        .from('orders')
        .select('id, amount, currency, status, created_at, products(name)')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      if (from) q = q.gte('created_at', from.toISOString());
      if (to) q = q.lte('created_at', to.toISOString());
      const { data } = await q;
      const rows = (data ?? []).map((o: any) => ({
        order_id: o.id,
        product: o.products?.name ?? '',
        amount: o.amount,
        currency: o.currency,
        date: o.created_at?.slice(0, 10),
      }));
      csvData = toCSV(rows);
    } else {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }

  return new NextResponse(csvData, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
