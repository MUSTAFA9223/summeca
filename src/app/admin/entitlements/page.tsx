'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';

interface Entitlement {
  id: string;
  user_id: string;
  product_id: string;
  order_id: string | null;
  file_name: string;
  status: string;
  download_count: number;
  expires_at: string | null;
  last_downloaded_at: string | null;
  created_at: string;
  user_profiles: { email: string; full_name: string } | null;
  products: { name: string } | null;
}

const PAGE_SIZE = 20;

const statusColors: Record<string, string> = {
  available: 'bg-success/10 text-success',
  expired: 'bg-muted text-muted-foreground',
  revoked: 'bg-danger/10 text-danger',
};

export default function AdminEntitlementsPage() {
  const [items, setItems] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Entitlement | null>(null);
  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('downloads')
      .select(`*, user_profiles(email, full_name), products(name)`, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter) query = query.eq('status', statusFilter);

    const { data, count } = await query;
    setItems((data as any[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = search
    ? items.filter((e) =>
        e.user_profiles?.email?.toLowerCase().includes(search.toLowerCase()) ||
        e.products?.name?.toLowerCase().includes(search.toLowerCase()) ||
        e.file_name.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-2xl font-800 text-foreground">Download Entitlements</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{total} total entitlements</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search by customer, product, or file..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="pl-9 pr-8 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer">
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">File</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Downloads</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Expires</th>
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
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No entitlements found</td></tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-600 text-foreground text-xs">{e.user_profiles?.full_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{e.user_profiles?.email || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-600 text-foreground">{e.products?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate">{e.file_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-600 ${statusColors[e.status] ?? 'bg-muted text-muted-foreground'}`}>{e.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-700 text-foreground tabular-nums">{e.download_count}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{e.expires_at ? new Date(e.expires_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(e)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"><Eye size={14} /></button>
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

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-2xl border border-border w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-base font-700 text-foreground">Entitlement Details</h2>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div><p className="text-xs text-muted-foreground mb-0.5">ID</p><p className="font-mono text-xs text-foreground break-all">{selected.id}</p></div>
              <div><p className="text-xs text-muted-foreground mb-0.5">Customer</p><p className="font-600 text-foreground">{selected.user_profiles?.full_name || '—'} — {selected.user_profiles?.email}</p></div>
              <div><p className="text-xs text-muted-foreground mb-0.5">Product</p><p className="font-600 text-foreground">{selected.products?.name || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground mb-0.5">File</p><p className="text-xs text-foreground">{selected.file_name || '—'}</p></div>
              <div><p className="text-xs text-muted-foreground mb-0.5">Status</p><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-600 ${statusColors[selected.status] ?? 'bg-muted text-muted-foreground'}`}>{selected.status}</span></div>
              <div><p className="text-xs text-muted-foreground mb-0.5">Download Count</p><p className="font-700 text-foreground">{selected.download_count}</p></div>
              {selected.expires_at && <div><p className="text-xs text-muted-foreground mb-0.5">Expires</p><p className="text-xs text-foreground">{new Date(selected.expires_at).toLocaleString()}</p></div>}
              {selected.last_downloaded_at && <div><p className="text-xs text-muted-foreground mb-0.5">Last Downloaded</p><p className="text-xs text-foreground">{new Date(selected.last_downloaded_at).toLocaleString()}</p></div>}
              {selected.order_id && <div><p className="text-xs text-muted-foreground mb-0.5">Order ID</p><p className="font-mono text-xs text-foreground break-all">{selected.order_id}</p></div>}
              <div><p className="text-xs text-muted-foreground mb-0.5">Created</p><p className="text-xs text-foreground">{new Date(selected.created_at).toLocaleString()}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
