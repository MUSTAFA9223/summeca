'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Search, Filter, ChevronLeft, ChevronRight, Eye, X,
  PauseCircle, XCircle, RefreshCw, AlertCircle, CheckCircle,
  Clock, History,
} from 'lucide-react';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  user_id: string;
  product_id: string;
  plan_id: string;
  order_id: string | null;
  status: string;
  payment_provider: string | null;
  current_period_start: string;
  current_period_end: string | null;
  cancelled_at: string | null;
  paused_at: string | null;
  past_due_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  user_profiles: { email: string; full_name: string } | null;
  products: { name: string } | null;
  product_plans: { name: string; billing_period: string; price: number; currency: string } | null;
}

interface AuditLog {
  id: string;
  action: string;
  previous_status: string;
  new_status: string;
  note: string;
  created_at: string;
  admin_id: string | null;
}

const PAGE_SIZE = 20;

const statusColors: Record<string, string> = {
  active: 'bg-success/10 text-success',
  cancelled: 'bg-danger/10 text-danger',
  expired: 'bg-muted text-muted-foreground',
  paused: 'bg-warning/10 text-warning',
  trialing: 'bg-info/10 text-info',
  past_due: 'bg-orange-500/10 text-orange-500',
};

const statusIcons: Record<string, React.ElementType> = {
  active: CheckCircle,
  cancelled: XCircle,
  expired: AlertCircle,
  paused: PauseCircle,
  trialing: Clock,
  past_due: AlertCircle,
};

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Subscription | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [actionModal, setActionModal] = useState<{ sub: Subscription; action: 'pause' | 'cancel' | 'restore' } | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const supabase = createClient();

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('subscriptions')
      .select(
        `*, user_profiles(email, full_name), products(name), product_plans(name, billing_period, price, currency)`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter) query = query.eq('status', statusFilter);

    const { data, count } = await query;
    setSubs((data as Subscription[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  const filtered = search
    ? subs.filter(
        (s) =>
          s.user_profiles?.email?.toLowerCase().includes(search.toLowerCase()) ||
          s.products?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : subs;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const openDetail = async (sub: Subscription) => {
    setSelected(sub);
    setAuditLogs([]);
    setAuditLoading(true);
    const { data } = await supabase
      .from('subscription_audit_logs')
      .select('id, action, previous_status, new_status, note, created_at, admin_id')
      .eq('subscription_id', sub.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setAuditLogs((data as AuditLog[]) ?? []);
    setAuditLoading(false);
  };

  const handleAdminAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${actionModal.sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionModal.action, note: actionNote }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Action failed');
      toast.success(`Subscription ${actionModal.action}d successfully`);
      setActionModal(null);
      setActionNote('');
      fetchSubs();
      if (selected?.id === actionModal.sub.id) {
        // Refresh detail view
        const updated = { ...selected, status: json.newStatus };
        setSelected(updated as Subscription);
        openDetail(updated as Subscription);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const actionConfig = {
    pause: { label: 'Pause Subscription', btnCls: 'bg-warning text-white hover:bg-warning/90', desc: 'Pause this subscription. The customer will lose access immediately.' },
    cancel: { label: 'Cancel Subscription', btnCls: 'bg-danger text-white hover:bg-danger/90', desc: 'Cancel this subscription. The customer will be notified via email.' },
    restore: { label: 'Restore Subscription', btnCls: 'bg-success text-white hover:bg-success/90', desc: 'Restore this subscription to active status.' },
  };

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-2xl font-800 text-foreground">Subscriptions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{total} total subscriptions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by customer or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="pl-9 pr-8 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past Due</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Product / Plan</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Provider</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Renewal</th>
                <th className="px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 rounded shimmer w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No subscriptions found</td></tr>
              ) : (
                filtered.map((sub) => {
                  const StatusIcon = statusIcons[sub.status] ?? CheckCircle;
                  const canPause = ['active', 'trialing', 'past_due'].includes(sub.status);
                  const canCancel = ['active', 'trialing', 'paused', 'past_due'].includes(sub.status);
                  const canRestore = ['cancelled', 'paused', 'expired'].includes(sub.status);

                  return (
                    <tr key={sub.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-600 text-foreground text-xs">{sub.user_profiles?.full_name || '—'}</div>
                        <div className="text-xs text-muted-foreground">{sub.user_profiles?.email || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-600 text-foreground text-xs">{sub.products?.name || '—'}</div>
                        <div className="text-xs text-muted-foreground">
                          {sub.product_plans?.name} · {sub.product_plans?.billing_period}
                          {sub.product_plans?.price ? ` · $${sub.product_plans.price}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-600 ${statusColors[sub.status] ?? 'bg-muted text-muted-foreground'}`}>
                          <StatusIcon size={10} />
                          {sub.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                        {sub.payment_provider || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {canPause && (
                            <button
                              onClick={() => { setActionModal({ sub, action: 'pause' }); setActionNote(''); }}
                              title="Pause"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-warning hover:bg-warning/10 transition-all"
                            >
                              <PauseCircle size={14} />
                            </button>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => { setActionModal({ sub, action: 'cancel' }); setActionNote(''); }}
                              title="Cancel"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-danger hover:bg-danger/10 transition-all"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                          {canRestore && (
                            <button
                              onClick={() => { setActionModal({ sub, action: 'restore' }); setActionNote(''); }}
                              title="Restore"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-success hover:bg-success/10 transition-all"
                            >
                              <RefreshCw size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => openDetail(sub)}
                            title="View details"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-base font-700 text-foreground">Subscription Details</h2>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4 text-sm">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground mb-0.5">Customer</p><p className="font-600 text-foreground text-xs">{selected.user_profiles?.full_name || '—'}</p><p className="text-xs text-muted-foreground">{selected.user_profiles?.email}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Status</p><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-600 ${statusColors[selected.status] ?? 'bg-muted text-muted-foreground'}`}>{selected.status.replace('_', ' ')}</span></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Product</p><p className="font-600 text-foreground text-xs">{selected.products?.name}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Plan</p><p className="font-600 text-foreground text-xs">{selected.product_plans?.name} · {selected.product_plans?.billing_period}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Provider</p><p className="text-xs text-foreground capitalize">{selected.payment_provider || '—'}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Renewal Date</p><p className="text-xs text-foreground">{selected.current_period_end ? new Date(selected.current_period_end).toLocaleDateString() : '—'}</p></div>
                {selected.cancelled_at && <div><p className="text-xs text-muted-foreground mb-0.5">Cancelled At</p><p className="text-xs text-foreground">{new Date(selected.cancelled_at).toLocaleString()}</p></div>}
                {selected.cancel_reason && <div><p className="text-xs text-muted-foreground mb-0.5">Cancel Reason</p><p className="text-xs text-foreground">{selected.cancel_reason}</p></div>}
                {selected.paused_at && <div><p className="text-xs text-muted-foreground mb-0.5">Paused At</p><p className="text-xs text-foreground">{new Date(selected.paused_at).toLocaleString()}</p></div>}
                {selected.past_due_at && <div><p className="text-xs text-muted-foreground mb-0.5">Past Due Since</p><p className="text-xs text-orange-500">{new Date(selected.past_due_at).toLocaleString()}</p></div>}
              </div>

              {/* Admin Actions */}
              <div className="border-t border-border pt-4">
                <p className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-3">Admin Actions</p>
                <div className="flex flex-wrap gap-2">
                  {['active', 'trialing', 'past_due'].includes(selected.status) && (
                    <button onClick={() => { setActionModal({ sub: selected, action: 'pause' }); setActionNote(''); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 bg-warning/10 text-warning border border-warning/20 rounded-lg hover:bg-warning/20 transition-all">
                      <PauseCircle size={12} /> Pause
                    </button>
                  )}
                  {['active', 'trialing', 'paused', 'past_due'].includes(selected.status) && (
                    <button onClick={() => { setActionModal({ sub: selected, action: 'cancel' }); setActionNote(''); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 bg-danger/10 text-danger border border-danger/20 rounded-lg hover:bg-danger/20 transition-all">
                      <XCircle size={12} /> Cancel
                    </button>
                  )}
                  {['cancelled', 'paused', 'expired'].includes(selected.status) && (
                    <button onClick={() => { setActionModal({ sub: selected, action: 'restore' }); setActionNote(''); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 bg-success/10 text-success border border-success/20 rounded-lg hover:bg-success/20 transition-all">
                      <RefreshCw size={12} /> Restore
                    </button>
                  )}
                </div>
              </div>

              {/* Audit Log */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <History size={13} className="text-muted-foreground" />
                  <p className="text-xs font-700 text-muted-foreground uppercase tracking-wider">Audit History</p>
                </div>
                {auditLoading ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 rounded-lg shimmer" />)}</div>
                ) : auditLogs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No audit history yet.</p>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 bg-secondary/40 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-600 text-foreground capitalize">{log.action.replace('_', ' ')}</span>
                            {log.previous_status && log.new_status && (
                              <span className="text-xs text-muted-foreground">{log.previous_status} → {log.new_status}</span>
                            )}
                          </div>
                          {log.note && <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.note}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{new Date(log.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-700 text-foreground mb-2">{actionConfig[actionModal.action].label}</h3>
            <p className="text-sm text-muted-foreground mb-4">{actionConfig[actionModal.action].desc}</p>
            <div className="mb-4">
              <label className="text-xs font-600 text-muted-foreground mb-1.5 block">Admin Note (optional)</label>
              <textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Add a note for the audit log..."
                rows={2}
                className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm font-600 text-muted-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-all">
                Cancel
              </button>
              <button
                onClick={handleAdminAction}
                disabled={actionLoading}
                className={`px-4 py-2 text-sm font-600 rounded-lg transition-all disabled:opacity-50 ${actionConfig[actionModal.action].btnCls}`}
              >
                {actionLoading ? 'Processing…' : `Confirm ${actionModal.action.charAt(0).toUpperCase() + actionModal.action.slice(1)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
