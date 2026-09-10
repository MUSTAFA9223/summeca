import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reports' };

type MoneyRow = {
  amount: number | string | null;
  currency: string | null;
  product_id?: string | null;
  user_id?: string | null;
};

function normalizeCurrency(value: string | null | undefined) {
  const code = (value || 'USD').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : 'USD';
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function sumByCurrency(rows: MoneyRow[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const currency = normalizeCurrency(row.currency);
    totals.set(currency, (totals.get(currency) || 0) + Number(row.amount || 0));
  }
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (!admin) redirect('/user-dashboard');

  const [ordersResult, completedResult, pendingResult, failedResult, completedMoneyResult, refundsResult, productsResult] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['pending', 'pending_payment']),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase.from('orders').select('amount,currency,product_id,user_id').eq('status', 'completed').limit(5000),
    supabase.from('refunds').select('amount,currency').eq('status', 'completed').limit(5000),
    supabase.from('products').select('id,name').limit(2000),
  ]);

  const completedMoney = (completedMoneyResult.data || []) as MoneyRow[];
  const refundMoney = (refundsResult.data || []) as MoneyRow[];
  const revenueByCurrency = sumByCurrency(completedMoney);
  const refundsByCurrency = sumByCurrency(refundMoney);
  const productNames = new Map((productsResult.data || []).map((product) => [product.id, product.name]));

  const productRevenue = new Map<string, Map<string, number>>();
  for (const order of completedMoney) {
    if (!order.product_id) continue;
    const currency = normalizeCurrency(order.currency);
    if (!productRevenue.has(currency)) productRevenue.set(currency, new Map());
    const byProduct = productRevenue.get(currency)!;
    byProduct.set(order.product_id, (byProduct.get(order.product_id) || 0) + Number(order.amount || 0));
  }

  const customerSpend = new Map<string, Map<string, number>>();
  for (const order of completedMoney) {
    if (!order.user_id) continue;
    const currency = normalizeCurrency(order.currency);
    if (!customerSpend.has(currency)) customerSpend.set(currency, new Map());
    const byCustomer = customerSpend.get(currency)!;
    byCustomer.set(order.user_id, (byCustomer.get(order.user_id) || 0) + Number(order.amount || 0));
  }

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-800 text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Financial totals are intentionally separated by currency. SUMMECA does not add unlike currencies without a documented conversion source.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Orders', ordersResult.count || 0],
          ['Completed', completedResult.count || 0],
          ['Pending', pendingResult.count || 0],
          ['Failed', failedResult.count || 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs font-600 uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-800 text-foreground">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-700 text-foreground">Completed revenue by currency</h2>
          <div className="mt-4 space-y-3">
            {revenueByCurrency.length === 0 ? <p className="text-sm text-muted-foreground">No completed revenue yet.</p> : revenueByCurrency.map(([currency, amount]) => (
              <div key={currency} className="flex items-center justify-between rounded-lg bg-secondary/40 px-4 py-3"><span className="font-700 text-foreground">{currency}</span><span className="font-700 text-foreground">{formatMoney(amount, currency)}</span></div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-700 text-foreground">Completed refunds by currency</h2>
          <div className="mt-4 space-y-3">
            {refundsByCurrency.length === 0 ? <p className="text-sm text-muted-foreground">No completed refunds yet.</p> : refundsByCurrency.map(([currency, amount]) => (
              <div key={currency} className="flex items-center justify-between rounded-lg bg-secondary/40 px-4 py-3"><span className="font-700 text-foreground">{currency}</span><span className="font-700 text-foreground">{formatMoney(amount, currency)}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-700 text-foreground">Top products by completed revenue</h2>
        <p className="mt-1 text-xs text-muted-foreground">Each currency has its own ranking.</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          {[...productRevenue.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, values]) => {
            const rows = [...values.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
            return <div key={currency} className="rounded-lg border border-border p-4"><h3 className="font-700 text-foreground">{currency}</h3><div className="mt-3 space-y-2">{rows.map(([productId, amount]) => <div key={productId} className="flex items-center justify-between gap-4 text-sm"><span className="truncate text-secondary-foreground">{productNames.get(productId) || 'Unknown product'}</span><span className="shrink-0 font-700 text-foreground">{formatMoney(amount, currency)}</span></div>)}</div></div>;
          })}
          {productRevenue.size === 0 && <p className="text-sm text-muted-foreground">No completed product revenue yet.</p>}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-700 text-foreground">Customer spend integrity</h2>
        <p className="mt-1 text-sm text-muted-foreground">Customer totals are kept as separate ledgers per currency. There is no cross-currency “lifetime spend” figure.</p>
        <div className="mt-4 flex flex-wrap gap-2">{[...customerSpend.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, customers]) => <span key={currency} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-700 text-secondary-foreground">{currency}: {customers.size} customer{customers.size === 1 ? '' : 's'}</span>)}</div>
      </section>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        MRR, churn, renewal success, and recurring-subscription revenue are intentionally not shown until a payment provider supplies verified recurring subscription lifecycle data.
      </div>
    </main>
  );
}
