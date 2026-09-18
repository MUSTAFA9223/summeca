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
  const [
    realOrders,
    realCompletedOrders,
    customers,
    products,
    downloads,
    realRevenue,
    realPendingPayments,
    visitsToday,
    visitsWeek,
    visitsMonthResult,
    pageViewsToday,
    realCompletedOrdersMonth,
    testCompletedOrdersMonth,
    testCompletedOrdersTotal,
    funnelProductViews,
    funnelBuyClicks,
    funnelTrialStarts,
    funnelCheckoutStarts,
    funnelPaymentSelected,
    funnelPaymentFailed,
    funnelPaymentCompleted,
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('purchase_kind', 'real'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed').eq('purchase_kind', 'real'),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('downloads').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('amount, currency').eq('status', 'completed').eq('purchase_kind', 'real'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending_payment').eq('purchase_kind', 'real'),
    supabase.from('analytics_visits').select('*', { count: 'exact', head: true }).gte('started_at', periods.today),
    supabase.from('analytics_visits').select('*', { count: 'exact', head: true }).gte('started_at', periods.week),
    supabase.from('analytics_visits').select('*', { count: 'exact', head: true }).gte('started_at', periods.month),
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'page_view').gte('created_at', periods.today),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed').eq('purchase_kind', 'real').gte('created_at', periods.month),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed').eq('purchase_kind', 'test').gte('created_at', periods.month),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed').eq('purchase_kind', 'test'),
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'product_view').gte('created_at', periods.month),
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'buy_click').gte('created_at', periods.month),
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'trial_started').gte('created_at', periods.month),
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'checkout_started').gte('created_at', periods.month),
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'payment_method_selected').gte('created_at', periods.month),
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'payment_failed').gte('created_at', periods.month),
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'payment_completed').gte('created_at', periods.month),
  ]);

  const revenueByCurrency = new Map<string, number>();
  for (const order of realRevenue.data ?? []) {
    const currency = normalizeCurrency(order.currency);
    revenueByCurrency.set(currency, (revenueByCurrency.get(currency) ?? 0) + Number(order.amount || 0));
  }

  const revenueTotals: RevenueTotal[] = [...revenueByCurrency.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));

  const visitsMonth = visitsMonthResult.count ?? 0;
  const completedOrdersMonth = realCompletedOrdersMonth.count ?? 0;
  const conversionMonth = visitsMonth > 0 ? (completedOrdersMonth / visitsMonth) * 100 : 0;

  return {
    revenueTotals,
    totalOrders: realOrders.count ?? 0,
    completedOrders: realCompletedOrders.count ?? 0,
    pendingPayments: realPendingPayments.count ?? 0,
    totalCustomers: customers.count ?? 0,
    totalProducts: products.count ?? 0,
    totalDownloads: downloads.count ?? 0,
    visitsToday: visitsToday.count ?? 0,
    visitsWeek: visitsWeek.count ?? 0,
    visitsMonth,
    pageViewsToday: pageViewsToday.count ?? 0,
    completedOrdersMonth,
    conversionMonth,
    testCompletedOrdersMonth: testCompletedOrdersMonth.count ?? 0,
    testCompletedOrdersTotal: testCompletedOrdersTotal.count ?? 0,
    funnel: {
      productViews: funnelProductViews.count ?? 0,
      buyClicks: funnelBuyClicks.count ?? 0,
      trialStarts: funnelTrialStarts.count ?? 0,
      checkoutStarts: funnelCheckoutStarts.count ?? 0,
      paymentSelected: funnelPaymentSelected.count ?? 0,
      paymentFailed: funnelPaymentFailed.count ?? 0,
      paymentCompleted: funnelPaymentCompleted.count ?? 0,
    },
  };
}

async function getChartData(supabase: Awaited<ReturnType<typeof createClient>>, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: orders } = await supabase
    .from('orders')
    .select('created_at, status')
    .eq('purchase_kind', 'real')
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
    .eq('status', 'completed')
    .eq('purchase_kind', 'real');

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

  return (
    <div className="space-y-6">
      <AdminDashboardClient stats={stats} initialChartData={chartData} topProducts={topProducts} />

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4">
          <h2 className="text-sm font-700 text-foreground">Purchase classification</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Real customer purchases drive conversion and revenue. Test purchases are tracked separately and excluded from business metrics.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <p className="text-xs font-600 text-muted-foreground">Real Purchases This Month</p>
            <p className="mt-1 text-xl font-800 tabular-nums text-foreground">{stats.completedOrdersMonth.toLocaleString('en-US')}</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <p className="text-xs font-600 text-muted-foreground">Test Purchases This Month</p>
            <p className="mt-1 text-xl font-800 tabular-nums text-foreground">{stats.testCompletedOrdersMonth.toLocaleString('en-US')}</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <p className="text-xs font-600 text-muted-foreground">Real Purchases Total</p>
            <p className="mt-1 text-xl font-800 tabular-nums text-foreground">{stats.completedOrders.toLocaleString('en-US')}</p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <p className="text-xs font-600 text-muted-foreground">Test Purchases Total</p>
            <p className="mt-1 text-xl font-800 tabular-nums text-foreground">{stats.testCompletedOrdersTotal.toLocaleString('en-US')}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4">
          <h2 className="text-sm font-700 text-foreground">Sales funnel · This month</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            These are first-party SUMMECA funnel events. They start accumulating after this tracking release and are separate from historical order totals.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {[
            ['Product views', stats.funnel.productViews],
            ['Buy clicks', stats.funnel.buyClicks],
            ['Free trials', stats.funnel.trialStarts],
            ['Checkout starts', stats.funnel.checkoutStarts],
            ['Payment selected', stats.funnel.paymentSelected],
            ['Payment failed', stats.funnel.paymentFailed],
            ['Payment completed', stats.funnel.paymentCompleted],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-border bg-secondary/20 p-4">
              <p className="text-xs font-600 text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-800 tabular-nums text-foreground">{Number(value).toLocaleString('en-US')}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">View → buy click</p>
            <p className="mt-1 text-lg font-800 text-foreground">
              {stats.funnel.productViews > 0 ? ((stats.funnel.buyClicks / stats.funnel.productViews) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Buy click → checkout</p>
            <p className="mt-1 text-lg font-800 text-foreground">
              {stats.funnel.buyClicks > 0 ? ((stats.funnel.checkoutStarts / stats.funnel.buyClicks) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-xs text-muted-foreground">Payment selected → completed</p>
            <p className="mt-1 text-lg font-800 text-foreground">
              {stats.funnel.paymentSelected > 0 ? ((stats.funnel.paymentCompleted / stats.funnel.paymentSelected) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
