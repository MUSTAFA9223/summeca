'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Eye, Loader2, RefreshCw, RotateCcw, Search, X } from 'lucide-react';
import AdminShell from '@/app/admin/components/AdminShell';

type RefundRow = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  reason: string;
  customer_note: string | null;
  admin_note: string | null;
  status: string;
  provider_refund_id: string | null;
  requested_at: string;
  reviewed_at: string | null;
  completed_at: string | null;
  orders: {
    metadata: Record<string, unknown> | null;
    products: { name: string } | null;
    product_plans: { name: string } | null;
  } | null;
  user_profiles: { email: string; full_name: string } | null;
};

type RefundStatus = 'all' | 'pending' | 'under_review' | 'approved' | 'processing' | 'completed' | 'rejected' | 'failed';
const PAGE_SIZE = 20;
const STATUSES: RefundStatus[] = ['all', 'pending', 'under_review', 'approved', 'processing', 'completed', 'rejected', 'failed'];

function money(amount: number, currency: string) {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
}

function title(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState<RefundStatus>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<RefundRow | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page), status });
    if (search.trim()) params.set('search', search.trim());
    try {
      const response = await fetch(`/api/admin/refunds?${params}`, { cache: 'no-store' });
      const result = await response.json().catch(() => null) as { refunds?: RefundRow[]; count?: number; error?: string; searchRequiresFullId?: boolean } | null;
      if (!response.ok) throw new Error(result?.error || 'Unable to load refunds.');
      setRefunds(result?.refunds || []);
      setCount(result?.count || 0);
      if (result?.searchRequiresFullId) setError('Search accepts a full refund ID or order ID to avoid unsafe filter expressions.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load refunds.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { void load(); }, [load]);

  const completedByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    for (const refund of refunds.filter((row) => row.status === 'completed')) {
      const currency = String(refund.currency || 'USD').toUpperCase();
      totals.set(currency, (totals.get(currency) || 0) + Number(refund.amount || 0));
    }
    return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [refunds]);

  async function act(action: string) {
    if (!selected) return;
    setActionBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/refunds/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminNote: note || undefined }),
      });
      const result = await response.json().catch(() => null) as { error?: string; newStatus?: string; emailNotificationSent?: boolean } | null;
      if (!response.ok) throw new Error(result?.error || 'Refund update failed.');
      setMessage(`Refund moved to ${title(result?.newStatus || action)}.${result?.emailNotificationSent ? ' Customer email delivery was confirmed.' : ''}`);
      setSelected(null);
      setNote('');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Refund update failed.');
    } finally {
      setActionBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <AdminShell>
      <main className="space-y-6">
        <header>
          <h1 className="text-2xl font-800 text-foreground">Refund Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Refund states are reconciled by protected server APIs. Provider-backed refunds cannot be declared complete manually.</p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Matching refunds</p><p className="mt-1 text-xl font-800">{count}</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Pending on this page</p><p className="mt-1 text-xl font-800">{refunds.filter((r) => r.status === 'pending').length}</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Completed on this page</p><p className="mt-1 text-xl font-800">{refunds.filter((r) => r.status === 'completed').length}</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Completed amounts on this page</p><p className="mt-1 text-sm font-700">{completedByCurrency.length ? completedByCurrency.map(([currency, amount]) => money(amount, currency)).join(' · ') : 'None'}</p></div>
        </section>

        <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Full refund ID or order ID" className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm" /></div>
          <div className="flex flex-wrap gap-1.5">{STATUSES.map((value) => <button key={value} onClick={() => { setStatus(value); setPage(0); }} className={`rounded-lg px-3 py-2 text-xs font-700 ${status === value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{title(value)}</button>)}<button onClick={() => void load()} className="rounded-lg border border-border px-3 py-2"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button></div>
        </section>

        {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</div>}
        {message && <div className="rounded-xl border border-border bg-card p-3 text-sm text-foreground">{message}</div>}

        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" />Loading refunds…</div> : refunds.length === 0 ? <div className="p-12 text-center text-sm text-muted-foreground"><RotateCcw className="mx-auto mb-3 opacity-40" />No matching refund requests.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-secondary/40"><tr><th className="px-4 py-3 text-left">Refund</th><th className="px-4 py-3 text-left">Customer</th><th className="px-4 py-3 text-left">Product</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-border">{refunds.map((refund) => <tr key={refund.id}><td className="px-4 py-3 font-mono text-xs">{refund.id.slice(0, 8)}</td><td className="px-4 py-3"><p className="font-600">{refund.user_profiles?.full_name || '—'}</p><p className="text-xs text-muted-foreground">{refund.user_profiles?.email || '—'}</p></td><td className="px-4 py-3">{refund.orders?.products?.name || '—'}</td><td className="px-4 py-3 text-right font-700">{money(Number(refund.amount), refund.currency)}</td><td className="px-4 py-3">{title(refund.status)}</td><td className="px-4 py-3 text-right"><button onClick={() => { setSelected(refund); setNote(refund.admin_note || ''); setMessage(''); }} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-700"><Eye size={13} />Review</button></td></tr>)}</tbody></table></div>}
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground"><span>Page {page + 1} of {totalPages}</span><div className="flex gap-1"><button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="rounded-lg border border-border p-2 disabled:opacity-30"><ChevronLeft size={14} /></button><button disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-border p-2 disabled:opacity-30"><ChevronRight size={14} /></button></div></div>
        </section>

        {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><section className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="font-800">Refund {selected.id.slice(0, 8)}</h2><p className="mt-1 text-sm text-muted-foreground">{money(Number(selected.amount), selected.currency)} · {title(selected.status)}</p></div><button onClick={() => setSelected(null)}><X size={18} /></button></div><div className="mt-5 space-y-3 text-sm"><p><span className="text-muted-foreground">Order:</span> {selected.order_id}</p><p><span className="text-muted-foreground">Reason:</span> {title(selected.reason)}</p><p><span className="text-muted-foreground">Provider:</span> {String(selected.orders?.metadata?.provider || 'manual')}</p>{selected.customer_note && <p><span className="text-muted-foreground">Customer note:</span> {selected.customer_note}</p>}</div><textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Admin note" className="mt-5 w-full rounded-xl border border-border bg-background p-3 text-sm" rows={3} /><div className="mt-4 flex flex-wrap gap-2">{selected.status === 'pending' && <><button disabled={actionBusy} onClick={() => void act('under_review')} className="btn-primary px-4 py-2">Under review</button><button disabled={actionBusy} onClick={() => void act('rejected')} className="rounded-xl border border-border px-4 py-2 text-sm">Reject</button></>}{selected.status === 'under_review' && <><button disabled={actionBusy} onClick={() => void act('approved')} className="btn-primary px-4 py-2">Approve</button><button disabled={actionBusy} onClick={() => void act('rejected')} className="rounded-xl border border-border px-4 py-2 text-sm">Reject</button></>}{selected.status === 'approved' && String(selected.orders?.metadata?.provider || 'manual') === 'manual' && <button disabled={actionBusy} onClick={() => void act('processing')} className="btn-primary px-4 py-2">Mark processing</button>}{selected.status === 'processing' && String(selected.orders?.metadata?.provider || 'manual') === 'manual' && <><button disabled={actionBusy} onClick={() => void act('completed')} className="btn-primary px-4 py-2">Complete atomically</button><button disabled={actionBusy} onClick={() => void act('failed')} className="rounded-xl border border-border px-4 py-2 text-sm">Mark failed</button></>}</div>{String(selected.orders?.metadata?.provider || 'manual') !== 'manual' && ['approved', 'processing', 'failed'].includes(selected.status) && <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><AlertCircle size={15} className="shrink-0" />Provider reconciliation is required. No button here claims that money was returned.</div>}</section></div>}
      </main>
    </AdminShell>
  );
}
