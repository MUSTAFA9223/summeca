'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';

interface Customer {
  id: string;
  email: string;
  full_name: string;
  plan_tier: string;
  created_at: string;
  order_count?: number;
  total_spent?: number;
  subscription_count?: number;
  download_count?: number;
}

const PAGE_SIZE = 20;

function CustomerModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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
              <p className="text-lg font-800 text-success">${(customer.total_spent ?? 0).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Spent</p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-3 text-center">
              <p className="text-lg font-800 text-foreground">{customer.subscription_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">Subscriptions</p>
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
  const supabase = createClient();

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const { data, count } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, plan_tier, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (data) {
      // Fetch aggregated stats for each customer
      const enriched = await Promise.all(
        data.map(async (c) => {
          const [ordersCountResult, ordersDataResult, subsCountResult, dlCountResult] = await Promise.all([
            supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', c.id),
            supabase.from('orders').select('amount').eq('user_id', c.id).eq('status', 'completed'),
            supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('user_id', c.id).eq('status', 'active'),
            supabase.from('downloads').select('*', { count: 'exact', head: true }).eq('user_id', c.id),
          ]);
          const orderCount = ordersCountResult.count;
          const orders = ordersDataResult.data;
          const subCount = subsCountResult.count;
          const dlCount = dlCountResult.count;
          const totalSpent = (orders ?? []).reduce((s, o) => s + Number(o.amount), 0);
          return { ...c, order_count: orderCount ?? 0, total_spent: totalSpent, subscription_count: subCount ?? 0, download_count: dlCount ?? 0 };
        })
      );
      setCustomers(enriched);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = search
    ? customers.filter((c) => c.email.toLowerCase().includes(search.toLowerCase()) || c.full_name.toLowerCase().includes(search.toLowerCase()))
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
        <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full max-w-sm pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Orders</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Spent</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Subs</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 rounded shimmer w-20" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No customers found</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-700 text-primary">{(c.full_name || c.email).charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-600 text-foreground text-xs">{c.full_name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-600 text-foreground capitalize">{c.plan_tier || 'free'}</td>
                    <td className="px-4 py-3 text-xs font-700 text-foreground tabular-nums">{c.order_count}</td>
                    <td className="px-4 py-3 text-xs font-700 text-success tabular-nums">${(c.total_spent ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs font-700 text-foreground tabular-nums">{c.subscription_count}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(c)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"><Eye size={14} /></button>
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
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 transition-all"><ChevronLeft size={14} /></button>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 transition-all"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {selected && <CustomerModal customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
