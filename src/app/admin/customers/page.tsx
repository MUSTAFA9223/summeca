'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';

interface Customer {
  id: string;
  email: string;
  full_name: string;
  plan_tier: string;
  created_at: string;
  order_count?: number;
  spend_by_currency?: Record<string, number>;
  active_access_count?: number;
  download_count?: number;
}

const PAGE_SIZE = 20;

function normalizeCurrency(value: string | null | undefined) {
  const currency = (value || 'USD').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function SpendTotals({ totals }: { totals?: Record<string, number> }) {
  const entries = Object.entries(totals ?? {}).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return <span>—</span>;
  return (
    <span className="inline-flex flex-col gap-0.5">
      {entries.map(([currency, amount]) => (
        <span key={currency}>{formatCurrency(amount, currency)}</span>
      ))}
    </span>
  );
}

function CustomerModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-md" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-700 text-foreground">Customer Details</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-700 text-primary">{(customer.full_name || customer.email).charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="font-700 text-foreground">{customer.full_name || '—'}</p>
              <p className="text-xs text-muted-foreground">{customer.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-secondary/50 p-3 text-center">
              <p className="text-lg font-800 text-foreground">{customer.order_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">Orders</p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-3 text-center">
              <p className="text-sm font-800 text-success"><SpendTotals totals={customer.spend_by_currency} /></p>
              <p className="text-xs text-muted-foreground">Completed spend</p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-3 text-center">
              <p className="text-lg font-800 text-foreground">{customer.active_access_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">Active access</p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-3 text-center">
              <p className="text-lg font-800 text-foreground">{customer.download_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">Downloads</p>
            </div>
          </div>
          <div><p className="text-xs text-muted-foreground mb-0.5">Plan Tier</p><p className="font-600 text-foreground capitalize">{customer.plan_tier || 'free'}</p></div>
          <div><p className="text-xs text-muted-foreground mb-0.5">Registered</p><p className="text-xs text-foreground">{new Date(customer.created_at).toLocaleString()}</p></div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Customer | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const { data, count } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, plan_tier, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (data) {
      const enriched = await Promise.all(
        data.map(async (customer) => {
          const [ordersCountResult, ordersDataResult, accessCountResult, downloadCountResult] = await Promise.all([
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', customer.id),
            supabase.from('orders').select('amount, currency').eq('user_id', customer.id).eq('status', 'completed'),
            supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('user_id', customer.id).eq('status', 'active'),
            supabase.from('downloads').select('*', { count: 'exact', head: true }).eq('user_id', customer.id),
          ]);

          const spendByCurrency: Record<string, number> = {};
          for (const order of ordersDataResult.data ?? []) {
            const currency = normalizeCurrency(order.currency);
            spendByCurrency[currency] = (spendByCurrency[currency] ?? 0) + Number(order.amount || 0);
          }

          return {
            ...customer,
            order_count: ordersCountResult.count ?? 0,
            spend_by_currency: spendByCurrency,
            active_access_count: accessCountResult.count ?? 0,
            download_count: downloadCountResult.count ?? 0,
          };
        }),
      );
      setCustomers(enriched);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, supabase]);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = normalizedSearch
    ? customers.filter((customer) =>
        customer.email.toLowerCase().includes(normalizedSearch) ||
        (customer.full_name || '').toLowerCase().includes(normalizedSearch),
      )
    : customers;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-2xl font-800 text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{total} registered customers</p>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Search by name or email..." value={search} onChange={(event) => setSearch(event.target.value)} className="w-full max-w-sm pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Orders</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Completed spend</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Active access</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b border-border">
                    {Array.from({ length: 7 }).map((__, cell) => <td key={cell} className="px-4 py-3"><div className="h-4 rounded shimmer w-20" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No customers found</td></tr>
              ) : (
                filtered.map((customer) => (
                  <tr key={customer.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-700 text-primary">{(customer.full_name || customer.email).charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-600 text-foreground text-xs">{customer.full_name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{customer.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-600 text-foreground capitalize">{customer.plan_tier || 'free'}</td>
                    <td className="px-4 py-3 text-xs font-700 text-foreground tabular-nums">{customer.order_count}</td>
                    <td className="px-4 py-3 text-xs font-700 text-success tabular-nums"><SpendTotals totals={customer.spend_by_currency} /></td>
                    <td className="px-4 py-3 text-xs font-700 text-foreground tabular-nums">{customer.active_access_count}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(customer.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(customer)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"><Eye size={14} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 transition-all"><ChevronLeft size={14} /></button>
              <button onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page >= totalPages - 1} className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 transition-all"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {selected && <CustomerModal customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
