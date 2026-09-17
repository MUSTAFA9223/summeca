'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowRight, Cpu, CreditCard, Download, Package, RefreshCw, ShoppingBag, Sparkles, WandSparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const Animated3DBackground = dynamic(() => import('@/components/ui/Animated3DBackground'), { ssr: false });

type DashboardOrder = { id: string; product_id: string | null; created_at: string; amount: number | string | null; currency: string | null; status: string; products: { name?: string | null } | null; product_plans: { name?: string | null } | null };
type DashboardSubscription = { id: string; product_id: string | null; status: string; current_period_end: string | null; products: { name?: string | null } | null; product_plans: { name?: string | null; price?: number | string | null; currency?: string | null; billing_period?: string | null } | null };
type DashboardDownload = { id: string; product_id: string | null; file_name: string | null; file_size: number | null; status: string; download_count: number | null; created_at: string; products: { name?: string | null } | null };
type DashboardAiUsage = { requests_count: number | null; tokens_used: number | null; monthly_limit: number | null; period_start: string; period_end: string };
type DashboardData = { orders: DashboardOrder[]; subscriptions: DashboardSubscription[]; downloads: DashboardDownload[]; aiUsage: DashboardAiUsage | null };

const emptyData: DashboardData = { orders: [], subscriptions: [], downloads: [], aiUsage: null };

function currency(value: number, code = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code || 'USD' }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function dateLabel(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard account data">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="rounded-2xl border border-border bg-card p-5">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-primary/10" />
            <div className="mt-4 h-3 w-28 animate-pulse rounded bg-secondary" />
            <div className="mt-3 h-8 w-20 animate-pulse rounded bg-secondary" />
            <div className="mt-3 h-3 w-36 max-w-full animate-pulse rounded bg-secondary" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {[0, 1].map((item) => (
          <div key={item} className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
      <div className="h-52 animate-pulse rounded-2xl border border-border bg-card" />
      <p className="sr-only" role="status">Loading your account data...</p>
    </div>
  );
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')?.[0] || 'there';

  const loadDashboard = useCallback(async () => {
    if (!user?.id) {
      setData(emptyData);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    const [ordersResult, subscriptionsResult, downloadsResult, aiUsageResult] = await Promise.all([
      supabase.from('orders').select('id, product_id, created_at, amount, currency, status, products ( name ), product_plans ( name )').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('subscriptions').select('id, product_id, status, current_period_end, products ( name ), product_plans ( name, price, currency, billing_period )').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('downloads').select('id, product_id, file_name, file_size, status, download_count, created_at, products ( name )').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('ai_usage').select('requests_count, tokens_used, monthly_limit, period_start, period_end').eq('user_id', user.id).gte('period_start', currentMonth).order('period_start', { ascending: false }).limit(1).maybeSingle(),
    ]);

    // Each section is independent: a denied/missing optional relation must not erase
    // valid account data from the other sections.
    const orders = ordersResult.error ? [] : (ordersResult.data ?? []).map((row: any) => ({ ...row, products: unwrapRelation(row.products), product_plans: unwrapRelation(row.product_plans) })) as DashboardOrder[];
    const subscriptions = subscriptionsResult.error ? [] : (subscriptionsResult.data ?? []).map((row: any) => ({ ...row, products: unwrapRelation(row.products), product_plans: unwrapRelation(row.product_plans) })) as DashboardSubscription[];
    const downloads = downloadsResult.error ? [] : (downloadsResult.data ?? []).map((row: any) => ({ ...row, products: unwrapRelation(row.products) })) as DashboardDownload[];
    const aiUsage = aiUsageResult.error ? null : (aiUsageResult.data as DashboardAiUsage | null) ?? null;

    setData({ orders, subscriptions, downloads, aiUsage });
    const failures = [ordersResult.error && 'orders', subscriptionsResult.error && 'subscriptions', downloadsResult.error && 'downloads', aiUsageResult.error && 'AI usage'].filter(Boolean);
    // Empty new accounts are valid. Only show a non-blocking message when every core
    // account query failed; never replace the dashboard with demo/fallback data.
    if (failures.length >= 3) setError('Some account data is temporarily unavailable. Please refresh in a moment.');
    setLoading(false);
  }, [supabase, user?.id]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const completedOrders = data.orders.filter((order) => order.status === 'completed');
  const spendByCurrency = completedOrders.reduce<Record<string, number>>((totals, order) => {
    const code = (order.currency || 'USD').toUpperCase();
    totals[code] = (totals[code] || 0) + Number(order.amount || 0);
    return totals;
  }, {});
  const spendTotals = Object.entries(spendByCurrency).sort(([a], [b]) => a.localeCompare(b));
  const totalSpendLabel = spendTotals.length === 0 ? currency(0, 'USD') : spendTotals.length === 1 ? currency(spendTotals[0][1], spendTotals[0][0]) : `${spendTotals.length} currencies`;
  const totalSpendDetail = spendTotals.length > 1 ? spendTotals.map(([code,amount])=>currency(amount,code)).join(' · ') : 'Completed orders only';
  const activeSubscriptions = data.subscriptions.filter((subscription) => ['active', 'trialing'].includes(subscription.status));
  const availableDownloads = data.downloads.filter((item) => item.status === 'available');
  const ownedProductIds = new Set<string>();
  completedOrders.forEach((order) => order.product_id && ownedProductIds.add(order.product_id));
  activeSubscriptions.forEach((subscription) => subscription.product_id && ownedProductIds.add(subscription.product_id));
  const aiRequests = Number(data.aiUsage?.requests_count || 0);
  const aiLimit = Number(data.aiUsage?.monthly_limit || 0);
  const aiProgress = aiLimit > 0 ? Math.min(100, Math.round(aiRequests / aiLimit * 100)) : 0;
  const kpis = [
    { label: 'Active Products', value: ownedProductIds.size, subtext: 'Purchased or currently subscribed', icon: Package },
    { label: 'AI Requests This Month', value: aiRequests, subtext: aiLimit > 0 ? `${aiRequests.toLocaleString()} of ${aiLimit.toLocaleString()} used` : 'No AI usage recorded', icon: WandSparkles },
    { label: 'Total Spend', value: totalSpendLabel, subtext: totalSpendDetail, icon: CreditCard },
    { label: 'Available Downloads', value: availableDownloads.length, subtext: 'Files currently available to this account', icon: Download },
  ];

  return (
    <div className="space-y-7" aria-busy={loading}>
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 p-6" style={{ background: 'linear-gradient(135deg, #f0fdfa 0%, #ecfeff 50%, #f0f9ff 100%)' }}>
        <Animated3DBackground variant="subtle" />
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-teal"><Cpu size={12} className="text-white" /></div>
              <span className="text-xs font-600 uppercase tracking-wide text-primary">SUMMECA Dashboard</span>
            </div>
            <h1 className="text-2xl font-700 text-foreground">Welcome back, <span className="text-gradient-primary">{displayName}</span></h1>
            <p className="mt-0.5 text-sm text-muted-foreground">This dashboard shows only data linked to your signed-in account.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadDashboard} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-600 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <Link href="/products" className="btn-primary hidden items-center gap-1.5 px-3.5 py-2 text-xs sm:flex"><Sparkles size={12} />Explore Products<ArrowRight size={11} /></Link>
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-muted-foreground" role="status">{error}</div>}

      {loading ? <OverviewSkeleton /> : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><kpi.icon size={18} className="text-primary" /></div>
                <p className="text-xs font-600 uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 text-3xl font-800 tabular-nums text-foreground">{kpi.value}</p>
                <p className="mt-2 text-xs text-muted-foreground">{kpi.subtext}</p>
                {kpi.label === 'AI Requests This Month' && aiLimit > 0 && (
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${aiProgress}%` }} /></div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="text-sm font-700">Recent Orders</h2><Link href="/user-dashboard/orders" className="text-xs font-600 text-primary">View all →</Link></div>
              {data.orders.length === 0 ? (
                <div className="py-12 text-center"><ShoppingBag size={28} className="mx-auto mb-2 text-muted-foreground/40" /><p className="text-sm font-600">No orders yet</p><p className="mt-1 text-xs text-muted-foreground">Purchases for this account will appear here.</p></div>
              ) : (
                <div className="divide-y divide-border">{data.orders.slice(0, 5).map((order) => <div key={order.id} className="flex justify-between gap-4 px-5 py-3"><div className="min-w-0"><p className="truncate text-sm font-600">{order.products?.name || 'Product'}</p><p className="text-xs text-muted-foreground">{order.product_plans?.name || 'Order'} · {dateLabel(order.created_at)}</p></div><div className="text-right"><p className="text-sm font-700">{currency(Number(order.amount || 0), order.currency || 'USD')}</p><p className="text-xs capitalize text-muted-foreground">{order.status.replaceAll('_', ' ')}</p></div></div>)}</div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="text-sm font-700">Active Subscriptions</h2><Link href="/user-dashboard/subscriptions" className="text-xs font-600 text-primary">Manage all →</Link></div>
              {activeSubscriptions.length === 0 ? (
                <div className="py-12 text-center"><CreditCard size={28} className="mx-auto mb-2 text-muted-foreground/40" /><p className="text-sm font-600">No active subscriptions</p><p className="mt-1 text-xs text-muted-foreground">Only subscriptions owned by this account are shown.</p></div>
              ) : (
                <div className="divide-y divide-border">{activeSubscriptions.slice(0, 5).map((subscription) => <div key={subscription.id} className="flex justify-between gap-4 px-5 py-3"><div><p className="text-sm font-600">{subscription.products?.name || 'Subscription'}</p><p className="text-xs text-muted-foreground">{subscription.product_plans?.name || 'Plan'}</p></div><div className="text-right"><p className="text-xs font-600 capitalize text-success">{subscription.status}</p><p className="text-xs text-muted-foreground">Renews {dateLabel(subscription.current_period_end)}</p></div></div>)}</div>
              )}
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="text-sm font-700">Available Downloads</h2><Link href="/user-dashboard/downloads" className="text-xs font-600 text-primary">All downloads →</Link></div>
            {availableDownloads.length === 0 ? (
              <div className="py-12 text-center"><Download size={28} className="mx-auto mb-2 text-muted-foreground/40" /><p className="text-sm font-600">No downloads available</p><p className="mt-1 text-xs text-muted-foreground">Purchased files for this account will appear here.</p></div>
            ) : (
              <div className="divide-y divide-border">{availableDownloads.slice(0, 5).map((item) => <div key={item.id} className="flex justify-between gap-4 px-5 py-3"><div><p className="text-sm font-600">{item.products?.name || item.file_name || 'Download'}</p><p className="text-xs text-muted-foreground">{item.file_name || 'File'} · {item.download_count || 0} downloads</p></div><span className="text-xs font-600 capitalize text-success">{item.status}</span></div>)}</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
