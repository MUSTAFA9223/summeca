'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';

interface PaymentEvent {
  id: string;
  order_id: string;
  provider: string;
  event_type: string;
  provider_payment_ref: string;
  metadata: Record<string, any>;
  created_at: string;
}

const PAGE_SIZE = 20;

const eventTypeColors: Record<string, string> = {
  completed: 'bg-success/10 text-success',
  failed: 'bg-danger/10 text-danger',
  refunded: 'bg-warning/10 text-warning',
  cancelled: 'bg-muted text-muted-foreground',
};

function EventDetailModal({ event, onClose }: { event: PaymentEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-700 text-foreground">Payment Event</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div><p className="text-xs text-muted-foreground mb-0.5">Event ID</p><p className="font-mono text-xs text-foreground break-all">{event.id}</p></div>
          <div><p className="text-xs text-muted-foreground mb-0.5">Order ID</p><p className="font-mono text-xs text-foreground break-all">{event.order_id}</p></div>
          <div><p className="text-xs text-muted-foreground mb-0.5">Provider</p><p className="font-600 text-foreground capitalize">{event.provider || '—'}</p></div>
          <div><p className="text-xs text-muted-foreground mb-0.5">Event Type</p><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-600 ${eventTypeColors[event.event_type] ?? 'bg-muted text-muted-foreground'}`}>{event.event_type}</span></div>
          <div><p className="text-xs text-muted-foreground mb-0.5">Provider Payment Ref</p><p className="font-mono text-xs text-foreground break-all">{event.provider_payment_ref || '—'}</p></div>
          <div><p className="text-xs text-muted-foreground mb-0.5">Created</p><p className="text-xs text-foreground">{new Date(event.created_at).toLocaleString()}</p></div>
          {Object.keys(event.metadata ?? {}).length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Metadata (non-sensitive)</p>
              <pre className="text-xs bg-secondary rounded-lg p-3 overflow-x-auto text-foreground">{JSON.stringify(event.metadata, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<PaymentEvent | null>(null);
  const supabase = createClient();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('payment_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (typeFilter) query = query.eq('event_type', typeFilter);

    const { data, count, error } = await query;
    if (!error) {
      setEvents(data ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, typeFilter]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const filtered = search
    ? events.filter((e) =>
        e.id.includes(search) ||
        e.order_id.includes(search) ||
        e.provider_payment_ref.includes(search) ||
        e.provider.toLowerCase().includes(search.toLowerCase())
      )
    : events;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-2xl font-800 text-foreground">Payment Events</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Audit log of all payment webhook events — {total} total</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by event ID, order ID, or provider ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
            className="pl-9 pr-8 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Event ID</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Order ID</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Provider</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Provider Ref</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 rounded shimmer w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No payment events found</td></tr>
              ) : (
                filtered.map((event) => (
                  <tr key={event.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{event.id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{event.order_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-xs font-600 text-foreground capitalize">{event.provider || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-600 ${eventTypeColors[event.event_type] ?? 'bg-muted text-muted-foreground'}`}>{event.event_type}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[140px] truncate">{event.provider_payment_ref || '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(event.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(event)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                        <Eye size={14} />
                      </button>
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

      {selected && <EventDetailModal event={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
