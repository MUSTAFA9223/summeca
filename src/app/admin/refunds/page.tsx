'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminShell from '@/app/admin/components/AdminShell';
import { createClient } from '@/lib/supabase/client';
import {
  RotateCcw,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  DollarSign,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RefundRow {
  id: string;
  order_id: string;
  user_id: string;
  amount: number;
  currency: string;
  reason: string;
  customer_note: string;
  admin_note: string;
  status: string;
  provider_refund_id: string;
  requested_at: string;
  reviewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  orders: {
    id: string;
    provider_payment_ref: string;
    metadata: Record<string, unknown> | null;
    products: { name: string } | null;
    product_plans: { name: string } | null;
  } | null;
  user_profiles: {
    email: string;
    full_name: string;
  } | null;
}

type RefundStatus = 'all' | 'pending' | 'under_review' | 'approved' | 'processing' | 'completed' | 'rejected' | 'failed';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_FILTERS: { value: RefundStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'failed', label: 'Failed' },
];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20',
  under_review: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
  approved: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  processing: 'bg-violet-500/10 text-violet-600 border border-violet-500/20',
  completed: 'bg-success/10 text-success border border-success/20',
  rejected: 'bg-danger/10 text-danger border border-danger/20',
  failed: 'bg-danger/10 text-danger border border-danger/20',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  processing: 'Processing',
  completed: 'Completed',
  rejected: 'Rejected',
  failed: 'Failed',
};

const REASON_LABEL: Record<string, string> = {
  product_issue: 'Product Issue',
  not_satisfied: 'Not Satisfied',
  duplicate_purchase: 'Duplicate Purchase',
  other: 'Other',
};

const PAGE_SIZE = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

interface DetailModalProps {
  refund: RefundRow;
  onClose: () => void;
  onAction: (refundId: string, action: string, adminNote?: string) => Promise<void>;
  actionLoading: boolean;
}

function DetailModal({ refund, onClose, onAction, actionLoading }: DetailModalProps) {
  const [adminNote, setAdminNote] = useState(refund.admin_note || '');
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const allowedActions: Record<string, { label: string; color: string; icon: React.ComponentType<any> }[]> = {
    pending: [
      { label: 'Mark Under Review', color: 'bg-blue-500 hover:bg-blue-600 text-white', icon: Eye },
      { label: 'Reject', color: 'bg-danger hover:bg-danger/90 text-white', icon: XCircle },
    ],
    under_review: [
      { label: 'Approve', color: 'bg-emerald-500 hover:bg-emerald-600 text-white', icon: CheckCircle },
      { label: 'Reject', color: 'bg-danger hover:bg-danger/90 text-white', icon: XCircle },
    ],
    approved: [
      { label: 'Mark Processing', color: 'bg-violet-500 hover:bg-violet-600 text-white', icon: RefreshCw },
      { label: 'Reject', color: 'bg-danger hover:bg-danger/90 text-white', icon: XCircle },
    ],
    processing: [
      { label: 'Mark Completed', color: 'bg-success hover:bg-success/90 text-white', icon: CheckCircle },
      { label: 'Mark Failed', color: 'bg-danger hover:bg-danger/90 text-white', icon: AlertCircle },
    ],
    failed: [
      { label: 'Mark Processing', color: 'bg-violet-500 hover:bg-violet-600 text-white', icon: RefreshCw },
    ],
  };

  const actionMap: Record<string, string> = {
    'Mark Under Review': 'under_review',
    'Approve': 'approved',
    'Mark Processing': 'processing',
    'Mark Completed': 'completed',
    'Reject': 'rejected',
    'Mark Failed': 'failed',
  };

  const provider = String(refund.orders?.metadata?.provider ?? 'manual');
  const awaitingProvider = provider !== 'manual' && ['approved', 'processing', 'failed'].includes(refund.status);
  const actions = awaitingProvider ? [] : (allowedActions[refund.status] ?? []);

  const handleAction = async (label: string) => {
    const action = actionMap[label];
    if (!action) return;
    await onAction(refund.id, action, adminNote || undefined);
    setConfirmAction(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <RotateCcw size={15} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-700 text-foreground">Refund #{refund.id.slice(0, 8).toUpperCase()}</h2>
              <span className={`text-xs font-500 px-2 py-0.5 rounded-full ${STATUS_STYLES[refund.status] || ''}`}>
                {STATUS_LABEL[refund.status] || refund.status}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
            <X size={14} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Customer */}
          <section>
            <h3 className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-2">Customer</h3>
            <div className="bg-secondary/30 rounded-xl p-3 space-y-1">
              <p className="text-sm font-600 text-foreground">{refund.user_profiles?.full_name || '—'}</p>
              <p className="text-xs text-muted-foreground">{refund.user_profiles?.email || '—'}</p>
            </div>
          </section>

          {/* Order & Product */}
          <section>
            <h3 className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-2">Order</h3>
            <div className="bg-secondary/30 rounded-xl p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Order ID</span>
                <span className="text-xs font-mono font-600 text-foreground">#{refund.order_id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Product</span>
                <span className="text-xs font-600 text-foreground">{refund.orders?.products?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Plan</span>
                <span className="text-xs text-foreground">{refund.orders?.product_plans?.name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Amount</span>
                <span className="text-sm font-700 text-foreground">{formatAmount(refund.amount, refund.currency)}</span>
              </div>
            </div>
          </section>

          {/* Refund Details */}
          <section>
            <h3 className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-2">Refund Details</h3>
            <div className="bg-secondary/30 rounded-xl p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Reason</span>
                <span className="text-xs font-600 text-foreground">{REASON_LABEL[refund.reason] || refund.reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Requested</span>
                <span className="text-xs text-foreground">{formatDate(refund.requested_at)}</span>
              </div>
              {refund.reviewed_at && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Reviewed</span>
                  <span className="text-xs text-foreground">{formatDate(refund.reviewed_at)}</span>
                </div>
              )}
              {refund.completed_at && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Completed</span>
                  <span className="text-xs text-foreground">{formatDate(refund.completed_at)}</span>
                </div>
              )}
              {refund.provider_refund_id && (
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Provider Ref</span>
                  <span className="text-xs font-mono text-foreground">{refund.provider_refund_id.slice(0, 16)}…</span>
                </div>
              )}
            </div>
          </section>

          {/* Customer Note */}
          {refund.customer_note && (
            <section>
              <h3 className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-2">Customer Note</h3>
              <div className="bg-secondary/30 rounded-xl p-3">
                <p className="text-xs text-foreground leading-relaxed">{refund.customer_note}</p>
              </div>
            </section>
          )}

          {/* Admin Note */}
          {awaitingProvider && (
            <p className="text-xs text-muted-foreground">Provider reconciliation is required. Do not submit another refund while the result is uncertain.</p>
          )}
          {actions.length > 0 && (
            <section>
              <h3 className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-2">Admin Note</h3>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Add an internal note (optional)..."
                rows={2}
                maxLength={1000}
                className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
              />
            </section>
          )}

          {refund.admin_note && actions.length === 0 && (
            <section>
              <h3 className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-2">Admin Note</h3>
              <div className="bg-secondary/30 rounded-xl p-3">
                <p className="text-xs text-foreground leading-relaxed">{refund.admin_note}</p>
              </div>
            </section>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <section>
              <h3 className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-2">Actions</h3>
              <div className="flex flex-wrap gap-2">
                {actions.map((act) => (
                  <button
                    key={act.label}
                    onClick={() => setConfirmAction(act.label)}
                    disabled={actionLoading}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-600 rounded-xl transition-all disabled:opacity-50 ${act.color}`}
                  >
                    <act.icon size={13} />
                    {act.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Confirm Action */}
          {confirmAction && (
            <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl">
              <p className="text-sm font-600 text-foreground mb-3">
                Confirm: {confirmAction}?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 px-3 py-2 text-xs font-600 bg-secondary text-muted-foreground rounded-lg hover:bg-secondary/80 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(confirmAction)}
                  disabled={actionLoading}
                  className="flex-1 px-3 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? <><RefreshCw size={12} className="animate-spin" /> Processing…</> : 'Confirm'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminRefundsPage() {
  const supabase = createClient();

  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RefundStatus>('all');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedRefund, setSelectedRefund] = useState<RefundRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('refunds')
        .select(`
          id, order_id, user_id, amount, currency, reason, customer_note, admin_note,
          status, provider_refund_id, requested_at, reviewed_at, completed_at, created_at,
          orders (
            id, provider_payment_ref, metadata,
            products ( name ),
            product_plans ( name )
          ),
          user_profiles ( email, full_name )
        `, { count: 'exact' })
        .order('requested_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (search) {
        query = query.or(`order_id.ilike.%${search}%,id.ilike.%${search}%`);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;
      setRefunds((data as unknown as RefundRow[]) || []);
      setTotalCount(count ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load refunds');
    } finally {
      setLoading(false);
    }
  }, [supabase, statusFilter, search, page]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleAction = async (refundId: string, action: string, adminNote?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/refunds/${refundId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminNote }),
      });

      const data = await res.json();

      if (!res.ok) {
        setToast({ type: 'error', message: data.error ?? 'Action failed' });
        return;
      }

      let message = `Refund ${action.replace('_', ' ')} successfully`;
      if (data.payoneerWarning) {
        message = `Status updated. Note: ${data.payoneerWarning}`;
      }

      setToast({ type: 'success', message });
      setSelectedRefund(null);
      fetchRefunds();
    } catch {
      setToast({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // KPIs
  const kpis = [
    { label: 'Total Refunds', value: totalCount, icon: RotateCcw, color: 'bg-primary/10 text-primary' },
    { label: 'Pending', value: refunds.filter(r => r.status === 'pending').length, icon: Clock, color: 'bg-yellow-500/10 text-yellow-600' },
    { label: 'Completed', value: refunds.filter(r => r.status === 'completed').length, icon: CheckCircle, color: 'bg-success/10 text-success' },
    {
      label: 'Total Amount',
      value: formatAmount(refunds.filter(r => r.status === 'completed').reduce((s, r) => s + Number(r.amount), 0), 'USD'),
      icon: DollarSign,
      color: 'bg-emerald-500/10 text-emerald-600',
    },
  ];

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-700 text-foreground">Refund Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Review and process customer refund requests</p>
          </div>
          <button
            onClick={fetchRefunds}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-600 text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${kpi.color}`}>
                <kpi.icon size={16} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-lg font-700 text-foreground">{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by order ID or refund ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={13} className="text-muted-foreground flex-shrink-0" />
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(0); }}
                className={`px-3 py-1.5 text-xs font-600 rounded-lg transition-all duration-150 ${
                  statusFilter === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 bg-secondary/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle size={24} className="text-danger" />
              <p className="text-sm font-600 text-foreground">Failed to load refunds</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          ) : refunds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RotateCcw size={28} className="text-muted-foreground/40" />
              <p className="text-sm font-600 text-foreground">No refund requests found</p>
              <p className="text-xs text-muted-foreground">Refund requests will appear here when customers submit them</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Refund ID</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Product</th>
                    <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Reason</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Requested</th>
                    <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {refunds.map((refund) => (
                    <tr key={refund.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-600 text-muted-foreground">
                          #{refund.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-xs font-600 text-foreground">{refund.user_profiles?.full_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{refund.user_profiles?.email || '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-xs font-600 text-foreground">{refund.orders?.products?.name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{refund.orders?.product_plans?.name || '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-700 text-foreground">
                          {formatAmount(refund.amount, refund.currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {REASON_LABEL[refund.reason] || refund.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${STATUS_STYLES[refund.status] || ''}`}>
                          {STATUS_LABEL[refund.status] || refund.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {new Date(refund.requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedRefund(refund)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all ml-auto"
                        >
                          <Eye size={12} />
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-30"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-xs text-muted-foreground px-2">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-30"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRefund && (
        <DetailModal
          refund={selectedRefund}
          onClose={() => setSelectedRefund(null)}
          onAction={handleAction}
          actionLoading={actionLoading}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl ${
          toast.type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span className="text-sm font-600 max-w-xs">{toast.message}</span>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">
            <X size={13} />
          </button>
        </div>
      )}
    </AdminShell>
  );
}
