import React from 'react';
import { createClient } from '@/lib/supabase/server';
import AdminDashboardClient from './components/AdminDashboardClient';

export const metadata = { title: 'Admin Dashboard — SUMMECA' };

type RevenueTotal = { currency: string; amount: number };
type ProductOrderRow = {
  product_id: string;
  products: { name?: string | null } | { name?: string | null }[] | null;
};

function normalizeCurrency(value: string | null | undefined) {
  const currency = (value || 'USD').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
}

function getTrafficPeriodStarts() {
  const now = new Date();
  const yemenOffsetMs = 3 * 60 * 60 * 1000;
  const yemenNow = new Date(now.getTime() + yemenOffsetMs);
  const localDayStartUtc = Date.UTC(
    yemenNow.getUTCFullYear(),
    yemenNow.getUTCMonth(),
    yemenNow.getUTCDate(),
    0,
    0,
    0
  );
  const localMonthStartUtc = Date.UTC(yemenNow.getUTCFullYear(), yemenNow.getUTCMonth(), 1, 0, 0, 0);

  return {
    today: new Date(localDayStartUtc - yemenOffsetMs).toISOString(),
    week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    month: new Date(localMonthStartUtc - yemenOffsetMs).toISOString(),
  };
}

async function getStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const periods = getTrafficPeriodStarts();
  const results = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('downloads').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('amount, currency').eq('status', 'completed'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending_payment'),
    supabase.from('analytics_visits').select('*', { count: 'exact', head: true }).gte('started_at', periods.today),
    supabase.from('analytics_visits').select('*', { count: 'exact', head: true }).gte('started_at', periods.week),
    supabase.from('analytics_visits').select('*', { count: 'exact', head: true }).gte('started_at', periods.month),
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'page_view').gte('created_at', periods.today),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', periods.month),
  ]);

  const revenueByCurrency = new Map<string, number>();
  for (const order of results[5].data ?? []) {
    const currency = normalizeCurrency(order.currency);
    revenueByCurrency.set(currency, (revenueByCurrency.get(currency) ?? 0) + Number(order.amount || 0));
  }

  const revenueTotals: RevenueTotal[] = [...revenueByCurrency.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));

  const visitsMonth = results[9].count ?? 0;
  const completedOrdersMonth = results[11].count ?? 0;
  const conversionMonth = visitsMonth > 0 ? (completedOrdersMonth / visitsMonth) * 100 : 0;

  return {
    revenueTotals,
    totalOrders: results[0].count ?? 0,
    completedOrders: results[1].count ?? 0,
    pendingPayments: results[6].count ?? 0,
    totalCustomers: results[2].count ?? 0,
    totalProducts: results[3].count ?? 0,
    totalDownloads: results[4].count ?? 0,
    visitsToday: results[7].count ?? 0,
    visitsWeek: results[8].count ?? 0,
    visitsMonth,
    pageViewsToday: results[10].count ?? 0,
    completedOrdersMonth,
    conversionMonth,
  };
}

async function getChartData(supabase: Awaited<ReturnType<typeof createClient>>, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: orders } = await supabase
    .from('orders')
    .select('created_at, status')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true });

  const byDay: Record<string, { orders: number; completed: number; pending: number }> = {};
  for (const order of orders ?? []) {
    const day = order.created_at.slice(0, 10);
    if (!byDay[day]) byDay[day] = { orders: 0, completed: 0, pending: 0 };
    byDay[day].orders += 1;
    if (order.status === 'completed') byDay[day].completed += 1;
    if (order.status === 'pending_payment') byDay[day].pending += 1;
  }

  return Object.entries(byDay).map(([date, values]) => ({ date, ...values }));
}

async function getTopProducts(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('orders')
    .select('product_id, products(name)')
    .eq('status', 'completed');

  const byProduct: Record<string, { name: string; count: number }> = {};
  for (const row of (data ?? []) as ProductOrderRow[]) {
    const product = Array.isArray(row.products) ? row.products[0] : row.products;
    if (!byProduct[row.product_id]) {
      byProduct[row.product_id] = { name: product?.name ?? 'Unknown', count: 0 };
    }
    byProduct[row.product_id].count += 1;
  }

  return Object.values(byProduct)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const [stats, chartData, topProducts] = await Promise.all([
    getStats(supabase),
    getChartData(supabase, 30),
    getTopProducts(supabase),
  ]);

  return <AdminDashboardClient stats={stats} initialChartData={chartData} topProducts={topProducts} />;
}
