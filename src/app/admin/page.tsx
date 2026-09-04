import React from 'react';
import { createClient } from '@/lib/supabase/server';
import AdminDashboardClient from './components/AdminDashboardClient';

export const metadata = { title: 'Admin Dashboard — SUMMECA' };

async function getStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const results = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('downloads').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('amount').eq('status', 'completed'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const totalOrders = results[0].count;
  const completedOrders = results[1].count;
  const totalCustomers = results[2].count;
  const activeSubscriptions = results[3].count;
  const totalProducts = results[4].count;
  const totalDownloads = results[5].count;
  const revenueData = results[6].data;
  const pendingData = results[7].count;

  const totalRevenue = revenueData?.reduce((sum, o) => sum + Number(o.amount), 0) ?? 0;
  const pendingPayments = pendingData ?? 0;

  return {
    totalRevenue,
    totalOrders: totalOrders ?? 0,
    completedOrders: completedOrders ?? 0,
    pendingPayments: typeof pendingPayments === 'number' ? pendingPayments : 0,
    totalCustomers: totalCustomers ?? 0,
    activeSubscriptions: activeSubscriptions ?? 0,
    totalProducts: totalProducts ?? 0,
    totalDownloads: totalDownloads ?? 0,
  };
}

async function getChartData(supabase: Awaited<ReturnType<typeof createClient>>, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: orders } = await supabase
    .from('orders')
    .select('created_at, amount, status')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true });

  // Group by day
  const byDay: Record<string, { revenue: number; orders: number; completed: number; pending: number }> = {};
  (orders ?? []).forEach((o) => {
    const day = o.created_at.slice(0, 10);
    if (!byDay[day]) byDay[day] = { revenue: 0, orders: 0, completed: 0, pending: 0 };
    byDay[day].orders++;
    if (o.status === 'completed') {
      byDay[day].revenue += Number(o.amount);
      byDay[day].completed++;
    } else if (o.status === 'pending') {
      byDay[day].pending++;
    }
  });

  return Object.entries(byDay).map(([date, v]) => ({ date, ...v }));
}

async function getTopProducts(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from('orders')
    .select('product_id, amount, products(name)')
    .eq('status', 'completed');

  const byProduct: Record<string, { name: string; revenue: number; count: number }> = {};
  (data ?? []).forEach((o: any) => {
    const pid = o.product_id;
    if (!byProduct[pid]) byProduct[pid] = { name: o.products?.name ?? 'Unknown', revenue: 0, count: 0 };
    byProduct[pid].revenue += Number(o.amount);
    byProduct[pid].count++;
  });

  return Object.values(byProduct)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const [stats, chartData, topProducts] = await Promise.all([
    getStats(supabase),
    getChartData(supabase, 30),
    getTopProducts(supabase),
  ]);

  return (
    <AdminDashboardClient
      stats={stats}
      initialChartData={chartData}
      topProducts={topProducts}
    />
  );
}
