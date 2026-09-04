'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { DollarSign, ShoppingBag, CheckCircle, Clock, XCircle, TrendingUp, Users, RefreshCw, Download, Calendar, ChevronDown, FileDown, BarChart2, Package, CreditCard, RotateCcw, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';


// ─── Types ───────────────────────────────────────────────────────────────────

interface Kpis {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  failedOrders: number;
  refundedCancelledOrders: number;
  avgOrderValue: number;
  totalCustomers: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
}

interface RefundKpis {
  totalRequests: number;
  approvedRefunds: number;
  completedRefunds: number;
  totalRefundedAmount: number;
  refundRate: number;
}

interface ProviderRow {
  provider: string;
  total: number;
  success: number;
  pending: number;
  failed: number;
}

interface ProductRow {
  id: string;
  name: string;
  status: string;
}

interface Props {
  initialKpis: Kpis;
  providerSummary: ProviderRow[];
  products: ProductRow[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'prev_month', label: 'Previous month' },
  { value: 'this_year', label: 'This year' },
  { value: 'all_time', label: 'All time' },
  { value: 'custom', label: 'Custom range' },
];

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart2 },
  { id: 'sales', label: 'Sales', icon: TrendingUp },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'subscriptions', label: 'Subscriptions', icon: RefreshCw },
  { id: 'refunds', label: 'Refunds', icon: RotateCcw },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function fmtInt(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}

function buildDateParams(dateRange: string, customFrom: string, customTo: string) {
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
    default: break;
  }
  return { from, to };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground font-500 mb-0.5">{label}</div>
        <div className="text-xl font-700 text-foreground leading-tight">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <BarChart2 size={36} className="text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function LoadingRows({ cols }: { cols: number }) {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-secondary rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminReportsClient({ initialKpis, providerSummary, products }: Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('all_time');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [kpis, setKpis] = useState<Kpis>(initialKpis);
  const [refundKpis, setRefundKpis] = useState<RefundKpis>({
    totalRequests: 0,
    approvedRefunds: 0,
    completedRefunds: 0,
    totalRefundedAmount: 0,
    refundRate: 0,
  });
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  // Tab-specific data
  const [salesChart, setSalesChart] = useState<any[]>([]);
  const [productReport, setProductReport] = useState<any[]>([]);
  const [customerReport, setCustomerReport] = useState<any[]>([]);
  const [paymentReport, setPaymentReport] = useState<ProviderRow[]>(providerSummary);
  const [subscriptionReport, setSubscriptionReport] = useState<any>({
    active: 0, cancelled: 0, expired: 0, pending: 0, paused: 0, past_due: 0, mrr: 0, churnRate: 0, renewalSuccessRate: 0,
  });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = buildDateParams(dateRange, customFrom, customTo);

      const applyRange = (q: any) => {
        if (from) q = q.gte('created_at', from.toISOString());
        if (to) q = q.lte('created_at', to.toISOString());
        return q;
      };

      // KPIs
      const [
        ordersRes, completedRes, pendingRes, failedRes, refundedRes,
        customersRes, activeSubsRes, cancelledSubsRes, expiredSubsRes, revenueRes,
      ] = await Promise.all([
        applyRange(supabase.from('orders').select('*', { count: 'exact', head: true })),
        applyRange(supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed')),
        applyRange(supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending')),
        applyRange(supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'failed')),
        applyRange(supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['refunded', 'cancelled'])),
        applyRange(supabase.from('user_profiles').select('*', { count: 'exact', head: true })),
        applyRange(supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active')),
        applyRange(supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'cancelled')),
        applyRange(supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'expired')),
        applyRange(supabase.from('orders').select('amount').eq('status', 'completed')),
      ]);

      // Fetch additional subscription metrics
      const [pausedSubsRes, pastDueSubsRes, activeSubsWithPlansRes, renewalEventsRes, failedPaymentEventsRes] = await Promise.all([
        applyRange(supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'paused')),
        applyRange(supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'past_due')),
        supabase.from('subscriptions').select('product_plans(price, currency, billing_period)').eq('status', 'active'),
        applyRange(supabase.from('payment_events').select('*', { count: 'exact', head: true }).eq('event_type', 'completed')),
        applyRange(supabase.from('payment_events').select('*', { count: 'exact', head: true }).eq('event_type', 'failed')),
      ]);

      // Calculate MRR from active subscriptions
      let mrr = 0;
      (activeSubsWithPlansRes.data ?? []).forEach((s: any) => {
        const plan = Array.isArray(s.product_plans) ? s.product_plans[0] : s.product_plans;
        if (!plan) return;
        const price = Number(plan.price ?? 0);
        if (plan.billing_period === 'monthly') mrr += price;
        else if (plan.billing_period === 'yearly') mrr += price / 12;
      });

      const activeCount = activeSubsRes.count ?? 0;
      const cancelledCount = cancelledSubsRes.count ?? 0;
      const totalSubsForChurn = activeCount + cancelledCount;
      const churnRate = totalSubsForChurn > 0 ? (cancelledCount / totalSubsForChurn) * 100 : 0;

      const renewalSuccess = renewalEventsRes.count ?? 0;
      const renewalFailed = failedPaymentEventsRes.count ?? 0;
      const totalRenewalAttempts = renewalSuccess + renewalFailed;
      const renewalSuccessRate = totalRenewalAttempts > 0 ? (renewalSuccess / totalRenewalAttempts) * 100 : 0;

      const completedRevenue = (revenueRes.data ?? []).reduce((s: number, o: any) => s + Number(o.amount), 0);
      const totalOrders = ordersRes.count ?? 0;
      const completedCount = completedRes.count ?? 0;

      setKpis({
        totalRevenue: completedRevenue,
        totalOrders,
        completedOrders: completedCount,
        pendingOrders: pendingRes.count ?? 0,
        failedOrders: failedRes.count ?? 0,
        refundedCancelledOrders: refundedRes.count ?? 0,
        avgOrderValue: completedCount > 0 ? completedRevenue / completedCount : 0,
        totalCustomers: customersRes.count ?? 0,
        activeSubscriptions: activeSubsRes.count ?? 0,
        cancelledSubscriptions: cancelledSubsRes.count ?? 0,
        expiredSubscriptions: expiredSubsRes.count ?? 0,
      });

      setSubscriptionReport({
        active: activeSubsRes.count ?? 0,
        cancelled: cancelledSubsRes.count ?? 0,
        expired: expiredSubsRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        paused: pausedSubsRes.count ?? 0,
        past_due: pastDueSubsRes.count ?? 0,
        mrr,
        churnRate,
        renewalSuccessRate,
      });

      // Refund KPIs
      try {
        const [refundTotalRes, refundApprovedRes, refundCompletedRes, refundAmountRes] = await Promise.all([
          applyRange(supabase.from('refunds').select('*', { count: 'exact', head: true })),
          applyRange(supabase.from('refunds').select('*', { count: 'exact', head: true }).in('status', ['approved', 'processing', 'completed'])),
          applyRange(supabase.from('refunds').select('*', { count: 'exact', head: true }).eq('status', 'completed')),
          applyRange(supabase.from('refunds').select('amount').eq('status', 'completed')),
        ]);

        const totalRefundedAmount = (refundAmountRes.data ?? []).reduce((s: number, r: any) => s + Number(r.amount), 0);
        const totalRequests = refundTotalRes.count ?? 0;

        setRefundKpis({
          totalRequests,
          approvedRefunds: refundApprovedRes.count ?? 0,
          completedRefunds: refundCompletedRes.count ?? 0,
          totalRefundedAmount,
          refundRate: completedCount > 0 ? (totalRequests / completedCount) * 100 : 0,
        });
      } catch {
        // refunds table may not exist yet — silently skip
      }

      // Sales chart
      const { data: ordersForChart } = await applyRange(
        supabase.from('orders').select('created_at, amount, status').order('created_at', { ascending: true })
      );
      const byDay: Record<string, { revenue: number; orders: number; completed: number; pending: number }> = {};
      (ordersForChart ?? []).forEach((o: any) => {
        const day = o.created_at?.slice(0, 10);
        if (!day) return;
        if (!byDay[day]) byDay[day] = { revenue: 0, orders: 0, completed: 0, pending: 0 };
        byDay[day].orders++;
        if (o.status === 'completed') { byDay[day].revenue += Number(o.amount); byDay[day].completed++; }
        else if (o.status === 'pending') byDay[day].pending++;
      });
      setSalesChart(Object.entries(byDay).map(([date, v]) => ({ date, ...v })));

      // Product report
      const { data: ordersForProducts } = await applyRange(
        supabase.from('orders').select('product_id, amount, products(name)').eq('status', 'completed')
      );
      const byProduct: Record<string, { name: string; revenue: number; orders: number }> = {};
      (ordersForProducts ?? []).forEach((o: any) => {
        const pid = o.product_id;
        if (!byProduct[pid]) byProduct[pid] = { name: (o.products as any)?.name ?? 'Unknown', revenue: 0, orders: 0 };
        byProduct[pid].revenue += Number(o.amount);
        byProduct[pid].orders++;
      });
      const totalRev = Object.values(byProduct).reduce((s, p) => s + p.revenue, 0);
      const productRows = Object.entries(byProduct)
        .map(([id, v]) => ({ id, ...v, pct: totalRev > 0 ? (v.revenue / totalRev) * 100 : 0 }))
        .sort((a, b) => b.revenue - a.revenue);
      setProductReport(productRows);

      // Customer report
      const { data: customersData } = await applyRange(
        supabase.from('user_profiles').select('id, email, full_name, created_at').order('created_at', { ascending: false }).limit(50)
      );
      const { data: ordersForCustomers } = await applyRange(
        supabase.from('orders').select('user_id, amount, status, created_at').eq('status', 'completed')
      );
      const { data: subsForCustomers } = await supabase
        .from('subscriptions').select('user_id, status').eq('status', 'active');

      const custOrderMap: Record<string, { total: number; count: number; first: string; last: string }> = {};
      (ordersForCustomers ?? []).forEach((o: any) => {
        if (!custOrderMap[o.user_id]) custOrderMap[o.user_id] = { total: 0, count: 0, first: o.created_at, last: o.created_at };
        custOrderMap[o.user_id].total += Number(o.amount);
        custOrderMap[o.user_id].count++;
        if (o.created_at < custOrderMap[o.user_id].first) custOrderMap[o.user_id].first = o.created_at;
        if (o.created_at > custOrderMap[o.user_id].last) custOrderMap[o.user_id].last = o.created_at;
      });
      const activeSubSet = new Set((subsForCustomers ?? []).map((s: any) => s.user_id));

      const custRows = (customersData ?? []).map((c: any) => ({
        id: c.id,
        email: c.email,
        name: c.full_name,
        orders: custOrderMap[c.id]?.count ?? 0,
        spent: custOrderMap[c.id]?.total ?? 0,
        firstOrder: custOrderMap[c.id]?.first?.slice(0, 10) ?? '—',
        lastOrder: custOrderMap[c.id]?.last?.slice(0, 10) ?? '—',
        hasSub: activeSubSet.has(c.id),
        registeredAt: c.created_at?.slice(0, 10),
      }));
      setCustomerReport(custRows);

      // Payment events
      const { data: eventsData } = await applyRange(
        supabase.from('payment_events').select('provider, event_type, metadata').limit(2000)
      );
      const pMap: Record<string, { total: number; success: number; pending: number; failed: number }> = {};
      (eventsData ?? []).forEach((e: any) => {
        const p = e.provider || 'unknown';
        if (!pMap[p]) pMap[p] = { total: 0, success: 0, pending: 0, failed: 0 };
        pMap[p].total++;
        const st = (e.metadata as any)?.status ?? e.event_type;
        if (st === 'completed' || st === 'payment_completed') pMap[p].success++;
        else if (st === 'pending' || st === 'payment_pending') pMap[p].pending++;
        else if (st === 'failed' || st === 'payment_failed') pMap[p].failed++;
      });
      setPaymentReport(Object.entries(pMap).map(([provider, v]) => ({ provider, ...v })));

    } catch (err) {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [dateRange, customFrom, customTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async (type: string) => {
    setExportLoading(type);
    try {
      const params = new URLSearchParams({ type, dateRange });
      if (dateRange === 'custom') {
        if (customFrom) params.set('from', customFrom);
        if (customTo) params.set('to', customTo);
      }
      const res = await fetch(`/api/admin/export?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `SUMMECA-${type}-${today}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${type} export downloaded`);
    } catch (err: any) {
      toast.error(err.message ?? 'Export failed');
    } finally {
      setExportLoading(null);
    }
  };

  const selectedLabel = DATE_RANGES.find((r) => r.value === dateRange)?.label ?? 'All time';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-700 text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Analytics and export for your store</p>
        </div>

        {/* Date Range Picker */}
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-500 text-foreground hover:bg-secondary transition-colors"
          >
            <Calendar size={14} className="text-primary" />
            {selectedLabel}
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>
          {showDatePicker && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl p-2 w-56">
              {DATE_RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setDateRange(r.value); if (r.value !== 'custom') setShowDatePicker(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${dateRange === r.value ? 'bg-primary/10 text-primary font-600' : 'text-foreground hover:bg-secondary'}`}
                >
                  {r.label}
                </button>
              ))}
              {dateRange === 'custom' && (
                <div className="px-3 pt-2 pb-1 space-y-2 border-t border-border mt-1">
                  <div>
                    <label className="text-xs text-muted-foreground">From</label>
                    <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                      className="w-full mt-0.5 px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">To</label>
                    <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                      className="w-full mt-0.5 px-2 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground" />
                  </div>
                  <button onClick={() => setShowDatePicker(false)}
                    className="w-full py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-600 hover:opacity-90 transition-opacity">
                    Apply
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue" value={`$${fmt(kpis.totalRevenue)}`} icon={DollarSign} color="bg-emerald-500/10 text-emerald-500" />
        <KpiCard label="Total Orders" value={fmtInt(kpis.totalOrders)} sub={`${kpis.completedOrders} completed`} icon={ShoppingBag} color="bg-blue-500/10 text-blue-500" />
        <KpiCard label="Avg Order Value" value={`$${fmt(kpis.avgOrderValue)}`} icon={TrendingUp} color="bg-violet-500/10 text-violet-500" />
        <KpiCard label="Total Customers" value={fmtInt(kpis.totalCustomers)} icon={Users} color="bg-orange-500/10 text-orange-500" />
        <KpiCard label="Completed Orders" value={fmtInt(kpis.completedOrders)} icon={CheckCircle} color="bg-emerald-500/10 text-emerald-500" />
        <KpiCard label="Pending Orders" value={fmtInt(kpis.pendingOrders)} icon={Clock} color="bg-yellow-500/10 text-yellow-500" />
        <KpiCard label="Refunded/Cancelled" value={fmtInt(kpis.refundedCancelledOrders)} icon={XCircle} color="bg-red-500/10 text-red-500" />
        <KpiCard label="Active Subscriptions" value={fmtInt(kpis.activeSubscriptions)} icon={RefreshCw} color="bg-primary/10 text-primary" />
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-500 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-600 text-foreground">Revenue Over Time</h2>
                <button onClick={() => handleExport('revenue')} disabled={exportLoading === 'revenue'}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-foreground rounded-lg text-xs font-500 hover:bg-secondary/80 transition-colors disabled:opacity-50">
                  <FileDown size={12} />
                  {exportLoading === 'revenue' ? 'Exporting…' : 'Export CSV'}
                </button>
              </div>
              {salesChart.length === 0 ? (
                <EmptyState message="No revenue data for this period" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={salesChart}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                    <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" fill="url(#revGrad)" strokeWidth={2} name="Revenue ($)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h2 className="text-sm font-600 text-foreground mb-4">Orders Over Time</h2>
              {salesChart.length === 0 ? (
                <EmptyState message="No order data for this period" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={salesChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                    <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* Sales */}
        {activeTab === 'sales' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <KpiCard label="Revenue" value={`$${fmt(kpis.totalRevenue)}`} icon={DollarSign} color="bg-emerald-500/10 text-emerald-500" />
              <KpiCard label="Orders" value={fmtInt(kpis.totalOrders)} icon={ShoppingBag} color="bg-blue-500/10 text-blue-500" />
              <KpiCard label="Avg Order Value" value={`$${fmt(kpis.avgOrderValue)}`} icon={TrendingUp} color="bg-violet-500/10 text-violet-500" />
              <KpiCard label="Completed Payments" value={fmtInt(kpis.completedOrders)} icon={CheckCircle} color="bg-emerald-500/10 text-emerald-500" />
              <KpiCard label="Pending Payments" value={fmtInt(kpis.pendingOrders)} icon={Clock} color="bg-yellow-500/10 text-yellow-500" />
              <KpiCard label="Failed/Refunded" value={fmtInt(kpis.failedOrders + kpis.refundedCancelledOrders)} icon={XCircle} color="bg-red-500/10 text-red-500" />
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-600 text-foreground">Revenue Chart</h2>
                <button onClick={() => handleExport('revenue')} disabled={exportLoading === 'revenue'}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-foreground rounded-lg text-xs font-500 hover:bg-secondary/80 transition-colors disabled:opacity-50">
                  <FileDown size={12} />
                  {exportLoading === 'revenue' ? 'Exporting…' : 'Export CSV'}
                </button>
              </div>
              {salesChart.length === 0 ? (
                <EmptyState message="No sales data for this period" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={salesChart}>
                    <defs>
                      <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                    <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" fill="url(#revGrad2)" strokeWidth={2} name="Revenue ($)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* Products */}
        {activeTab === 'products' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-600 text-foreground">Product Revenue Report</h2>
              <button onClick={() => handleExport('products')} disabled={exportLoading === 'products'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-foreground rounded-lg text-xs font-500 hover:bg-secondary/80 transition-colors disabled:opacity-50">
                <FileDown size={12} />
                {exportLoading === 'products' ? 'Exporting…' : 'Export CSV'}
              </button>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Product</th>
                    <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground">Orders</th>
                    <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground">Revenue</th>
                    <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <LoadingRows cols={4} />
                  ) : productReport.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">No product data for this period</td></tr>
                  ) : (
                    productReport.map((p, i) => (
                      <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 font-500 text-foreground">
                          {i === 0 && <span className="inline-flex items-center gap-1 text-xs bg-yellow-500/10 text-yellow-600 px-1.5 py-0.5 rounded mr-2">🏆 Top</span>}
                          {p.name}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{fmtInt(p.orders)}</td>
                        <td className="px-4 py-3 text-right font-600 text-foreground">${fmt(p.revenue)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(p.pct, 100)}%` }} />
                            </div>
                            <span className="text-muted-foreground text-xs w-10 text-right">{p.pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Customers */}
        {activeTab === 'customers' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-600 text-foreground">Customer Report</h2>
              <button onClick={() => handleExport('customers')} disabled={exportLoading === 'customers'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-foreground rounded-lg text-xs font-500 hover:bg-secondary/80 transition-colors disabled:opacity-50">
                <FileDown size={12} />
                {exportLoading === 'customers' ? 'Exporting…' : 'Export CSV'}
              </button>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Customer</th>
                      <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground">Orders</th>
                      <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground">Total Spent</th>
                      <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">First Order</th>
                      <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Last Order</th>
                      <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Subscription</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <LoadingRows cols={6} />
                    ) : customerReport.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No customer data for this period</td></tr>
                    ) : (
                      customerReport.map((c) => (
                        <tr key={c.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-500 text-foreground">{c.name || '—'}</div>
                            <div className="text-xs text-muted-foreground">{c.email}</div>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{c.orders}</td>
                          <td className="px-4 py-3 text-right font-600 text-foreground">${fmt(c.spent)}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{c.firstOrder}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{c.lastOrder}</td>
                          <td className="px-4 py-3">
                            {c.hasSub ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 bg-emerald-500/10 text-emerald-600">Active</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-500 bg-secondary text-muted-foreground">None</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Payments */}
        {activeTab === 'payments' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-600 text-foreground">Payment Provider Report</h2>
              <button onClick={() => handleExport('payments')} disabled={exportLoading === 'payments'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-foreground rounded-lg text-xs font-500 hover:bg-secondary/80 transition-colors disabled:opacity-50">
                <FileDown size={12} />
                {exportLoading === 'payments' ? 'Exporting…' : 'Export CSV'}
              </button>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Provider</th>
                    <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground">Total Events</th>
                    <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground">Successful</th>
                    <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground">Pending</th>
                    <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground">Failed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <LoadingRows cols={5} />
                  ) : paymentReport.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No payment events for this period</td></tr>
                  ) : (
                    paymentReport.map((p) => (
                      <tr key={p.provider} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 font-500 text-foreground capitalize">{p.provider}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{fmtInt(p.total)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-500">{fmtInt(p.success)}</td>
                        <td className="px-4 py-3 text-right text-yellow-600 font-500">{fmtInt(p.pending)}</td>
                        <td className="px-4 py-3 text-right text-red-500 font-500">{fmtInt(p.failed)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">Payment events are logged by the server-side webhook. No CVV, full card numbers, or payment secrets are stored or displayed.</p>
          </div>
        )}

        {/* Subscriptions */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-600 text-foreground">Subscription Analytics</h2>
              <button onClick={() => handleExport('subscriptions')} disabled={exportLoading === 'subscriptions'}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-foreground rounded-lg text-xs font-500 hover:bg-secondary/80 transition-colors disabled:opacity-50">
                <FileDown size={12} />
                {exportLoading === 'subscriptions' ? 'Exporting…' : 'Export CSV'}
              </button>
            </div>
            {/* Primary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Active Subscriptions" value={fmtInt(subscriptionReport.active)} sub="currently active" icon={CheckCircle} color="bg-emerald-500/10 text-emerald-500" />
              <KpiCard label="Monthly Recurring Revenue" value={`$${fmt(subscriptionReport.mrr)}`} sub="MRR from active subs" icon={DollarSign} color="bg-primary/10 text-primary" />
              <KpiCard label="Churn Rate" value={`${subscriptionReport.churnRate?.toFixed(1) ?? '0.0'}%`} sub="cancelled / total" icon={TrendingUp} color="bg-red-500/10 text-red-500" />
              <KpiCard label="Renewal Success Rate" value={`${subscriptionReport.renewalSuccessRate?.toFixed(1) ?? '0.0'}%`} sub="successful renewals" icon={RefreshCw} color="bg-violet-500/10 text-violet-500" />
            </div>
            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Cancelled" value={fmtInt(subscriptionReport.cancelled)} sub="all time" icon={XCircle} color="bg-red-500/10 text-red-500" />
              <KpiCard label="Expired" value={fmtInt(subscriptionReport.expired)} sub="period ended" icon={Clock} color="bg-orange-500/10 text-orange-500" />
              <KpiCard label="Paused" value={fmtInt(subscriptionReport.paused ?? 0)} sub="temporarily paused" icon={Clock} color="bg-yellow-500/10 text-yellow-500" />
              <KpiCard label="Past Due" value={fmtInt(subscriptionReport.past_due ?? 0)} sub="payment failed" icon={AlertCircle} color="bg-orange-500/10 text-orange-500" />
            </div>
            {subscriptionReport.active === 0 && subscriptionReport.cancelled === 0 && subscriptionReport.expired === 0 && (
              <div className="bg-card border border-border rounded-xl">
                <EmptyState message="No subscription data for this period" />
              </div>
            )}
          </div>
        )}

        {/* Refunds */}
        {activeTab === 'refunds' && (
          <div className="space-y-5">
            <h2 className="text-sm font-600 text-foreground">Refund Report</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <KpiCard
                label="Total Requests"
                value={fmtInt(refundKpis.totalRequests)}
                sub="all refund requests"
                icon={RotateCcw}
                color="bg-primary/10 text-primary"
              />
              <KpiCard
                label="Approved Refunds"
                value={fmtInt(refundKpis.approvedRefunds)}
                sub="approved or processing"
                icon={CheckCircle}
                color="bg-emerald-500/10 text-emerald-500"
              />
              <KpiCard
                label="Completed Refunds"
                value={fmtInt(refundKpis.completedRefunds)}
                sub="fully processed"
                icon={CheckCircle}
                color="bg-success/10 text-success"
              />
              <KpiCard
                label="Total Refunded"
                value={`$${fmt(refundKpis.totalRefundedAmount)}`}
                sub="completed refunds only"
                icon={DollarSign}
                color="bg-red-500/10 text-red-500"
              />
              <KpiCard
                label="Refund Rate"
                value={`${refundKpis.refundRate.toFixed(1)}%`}
                sub="of completed orders"
                icon={TrendingUp}
                color="bg-orange-500/10 text-orange-500"
              />
              <KpiCard
                label="Net Revenue"
                value={`$${fmt(Math.max(0, kpis.totalRevenue - refundKpis.totalRefundedAmount))}`}
                sub="revenue minus refunds"
                icon={DollarSign}
                color="bg-violet-500/10 text-violet-500"
              />
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground">
                Revenue figures in other tabs reflect gross completed order amounts. Net revenue (excluding refunds) is shown above.
                For detailed refund management, visit the{' '}
                <a href="/admin/refunds" className="text-primary hover:underline font-500">Refunds page</a>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Export All Section */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Download size={16} className="text-primary" />
          <h2 className="text-sm font-600 text-foreground">Export Data</h2>
          <span className="text-xs text-muted-foreground ml-1">— respects selected date range · admin-only · no sensitive data</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['orders', 'products', 'customers', 'payments', 'subscriptions', 'revenue'] as const).map((type) => (
            <button
              key={type}
              onClick={() => handleExport(type)}
              disabled={exportLoading === type}
              className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-foreground rounded-lg text-xs font-500 hover:bg-secondary/80 transition-colors disabled:opacity-50 capitalize"
            >
              <FileDown size={12} />
              {exportLoading === type ? 'Exporting…' : `${type} CSV`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
