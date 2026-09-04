import React from 'react';
import { createClient } from '@/lib/supabase/server';
import AdminReportsClient from './AdminReportsClient';

export const metadata = { title: 'Reports — SUMMECA Admin' };

export default async function AdminReportsPage() {
  const supabase = await createClient();

  // Fetch all-time KPI data server-side for initial render
  const [
    ordersResult,
    completedResult,
    pendingResult,
    failedResult,
    refundedResult,
    customersResult,
    activeSubsResult,
    cancelledSubsResult,
    expiredSubsResult,
    revenueResult,
    productsResult,
    paymentEventsResult,
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['refunded', 'cancelled']),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'expired'),
    supabase.from('orders').select('amount').eq('status', 'completed'),
    supabase.from('products').select('id, name, status').order('created_at', { ascending: false }),
    supabase.from('payment_events').select('provider, event_type, metadata').limit(1000),
  ]);

  const completedRevenue = (revenueResult.data ?? []).reduce((s, o) => s + Number(o.amount), 0);
  const totalOrders = ordersResult.count ?? 0;
  const avgOrderValue = totalOrders > 0 ? completedRevenue / (completedResult.count ?? 1) : 0;

  const initialKpis = {
    totalRevenue: completedRevenue,
    totalOrders,
    completedOrders: completedResult.count ?? 0,
    pendingOrders: pendingResult.count ?? 0,
    failedOrders: failedResult.count ?? 0,
    refundedCancelledOrders: refundedResult.count ?? 0,
    avgOrderValue,
    totalCustomers: customersResult.count ?? 0,
    activeSubscriptions: activeSubsResult.count ?? 0,
    cancelledSubscriptions: cancelledSubsResult.count ?? 0,
    expiredSubscriptions: expiredSubsResult.count ?? 0,
  };

  // Payment provider summary
  const providerMap: Record<string, { total: number; success: number; pending: number; failed: number }> = {};
  (paymentEventsResult.data ?? []).forEach((e) => {
    const p = e.provider || 'unknown';
    if (!providerMap[p]) providerMap[p] = { total: 0, success: 0, pending: 0, failed: 0 };
    providerMap[p].total++;
    const status = (e.metadata as any)?.status ?? e.event_type;
    if (status === 'completed' || status === 'payment_completed') providerMap[p].success++;
    else if (status === 'pending' || status === 'payment_pending') providerMap[p].pending++;
    else if (status === 'failed' || status === 'payment_failed') providerMap[p].failed++;
  });
  const providerSummary = Object.entries(providerMap).map(([provider, v]) => ({ provider, ...v }));

  return (
    <AdminReportsClient
      initialKpis={initialKpis}
      providerSummary={providerSummary}
      products={productsResult.data ?? []}
    />
  );
}
