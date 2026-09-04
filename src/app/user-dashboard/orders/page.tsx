'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShoppingBag,
  ExternalLink,
  Download,
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  RefreshCw,
  Receipt,
  RotateCcw,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Info,
} from 'lucide-react';

interface RefundInfo {
  id: string;
  status: string;
  reason: string;
  requested_at: string;
}

interface OrderRow {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  discount_amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  receipt_url: string | null;
  products: { name: string; category: string; slug: string } | null;
  product_plans: { name: string; billing_period: string } | null;
  refund?: RefundInfo | null;
}

const statusStyles: Record<string, string> = {
  completed: 'bg-success/10 text-success border border-success/20',
  pending: 'bg-warning/10 text-warning border border-warning/20',
  failed: 'bg-danger/10 text-danger border border-danger/20',
  refunded: 'bg-secondary text-muted-foreground border border-border',
  cancelled: 'bg-secondary text-muted-foreground border border-border',
};

const categoryStyles: Record<string, string> = {
  ai_tool: 'bg-primary/10 text-primary',
  api: 'bg-primary/10 text-primary',
  plugin: 'bg-primary/10 text-primary',
  template: 'bg-warning/10 text-warning',
  dataset: 'bg-warning/10 text-warning',
  course: 'bg-success/10 text-success',
  other: 'bg-secondary text-muted-foreground',
};

const categoryLabel: Record<string, string> = {
  ai_tool: 'AI',
  api: 'API',
  plugin: 'Plugin',
  template: 'Template',
  dataset: 'Dataset',
  course: 'Course',
  other: 'Other',
};

const refundStatusStyles: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20',
  under_review: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
  approved: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  processing: 'bg-violet-500/10 text-violet-600 border border-violet-500/20',
  completed: 'bg-success/10 text-success border border-success/20',
  rejected: 'bg-danger/10 text-danger border border-danger/20',
  failed: 'bg-danger/10 text-danger border border-danger/20',
};

const refundStatusLabel: Record<string, string> = {
  pending: 'Refund Pending',
  under_review: 'Under Review',
  approved: 'Refund Approved',
  processing: 'Processing',
  completed: 'Refund Completed',
  rejected: 'Refund Rejected',
  failed: 'Refund Failed',
};

const REFUND_REASONS = [
  { value: 'product_issue', label: 'Product Issue' },
  { value: 'not_satisfied', label: 'Not Satisfied' },
  { value: 'duplicate_purchase', label: 'Duplicate Purchase' },
  { value: 'other', label: 'Other' },
];

type SortField = 'date' | 'amount' | 'product' | 'status';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'completed' | 'pending' | 'failed' | 'refunded' | 'cancelled';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
}

function OrdersSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 bg-secondary/50 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

// ── Refund Request Modal ──────────────────────────────────────────────────────

interface RefundModalProps {
  order: OrderRow;
  onClose: () => void;
  onSuccess: () => void;
}

function RefundModal({ order, onClose, onSuccess }: RefundModalProps) {
  const [reason, setReason] = useState('product_issue');
  const [customerNote, setCustomerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/refunds/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, reason, customerNote }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to submit refund request');
        return;
      }

      onSuccess();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <RotateCcw size={15} className="text-warning" />
            </div>
            <div>
              <h2 className="text-sm font-700 text-foreground">Request Refund</h2>
              <p className="text-xs text-muted-foreground">Order #{order.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <X size={14} />
          </button>
        </div>

        {/* Order Summary */}
        <div className="px-6 py-4 bg-secondary/30 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-600 text-foreground">{order.products?.name || '—'}</p>
              <p className="text-xs text-muted-foreground">{order.product_plans?.name || '—'}</p>
            </div>
            <span className="text-sm font-700 text-foreground">
              {formatAmount(order.amount, order.currency)}
            </span>
          </div>
        </div>

        {/* Refund Policy Notice */}
        <div className="px-6 pt-4">
          <div className="flex gap-2.5 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600 leading-relaxed">
              Refund requests are reviewed within 1–3 business days. Approved refunds take 3–10 business days to process. Refunds are subject to our refund policy.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Reason */}
          <div>
            <label className="block text-xs font-600 text-foreground mb-1.5">
              Reason for refund <span className="text-danger">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              required
            >
              {REFUND_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Customer Note */}
          <div>
            <label className="block text-xs font-600 text-foreground mb-1.5">
              Additional details <span className="text-muted-foreground font-400">(optional)</span>
            </label>
            <textarea
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
              placeholder="Please describe the issue in more detail..."
              rows={3}
              maxLength={1000}
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{customerNote.length}/1000</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-danger/5 border border-danger/20 rounded-xl">
              <AlertCircle size={14} className="text-danger flex-shrink-0 mt-0.5" />
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-600 text-muted-foreground bg-secondary hover:bg-secondary/80 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 text-sm font-600 text-white bg-warning hover:bg-warning/90 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <RotateCcw size={13} />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Success Toast ─────────────────────────────────────────────────────────────

function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-success text-white rounded-xl shadow-xl animate-in slide-in-from-bottom-4">
      <CheckCircle size={16} />
      <span className="text-sm font-600">{message}</span>
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100">
        <X size={13} />
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [refundModalOrder, setRefundModalOrder] = useState<OrderRow | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch orders
      const { data: ordersData, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          amount,
          currency,
          discount_amount,
          status,
          receipt_url,
          products ( name, category, slug ),
          product_plans ( name, billing_period )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const rawOrders = (ordersData as unknown as OrderRow[]) || [];

      // Fetch refunds for these orders
      if (rawOrders.length > 0) {
        const orderIds = rawOrders.map((o) => o.id);
        const { data: refundsData } = await supabase
          .from('refunds')
          .select('id, order_id, status, reason, requested_at')
          .in('order_id', orderIds)
          .not('status', 'in', '("rejected","failed")');

        const refundMap: Record<string, RefundInfo> = {};
        (refundsData ?? []).forEach((r: any) => {
          refundMap[r.order_id] = {
            id: r.id,
            status: r.status,
            reason: r.reason,
            requested_at: r.requested_at,
          };
        });

        setOrders(rawOrders.map((o) => ({ ...o, refund: refundMap[o.id] ?? null })));
      } else {
        setOrders([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filtered = orders
    .filter((o) => {
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchesSearch =
        !search ||
        o.products?.name?.toLowerCase().includes(search.toLowerCase()) ||
        o.id.toLowerCase().includes(search.toLowerCase()) ||
        o.product_plans?.name?.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'amount') {
        cmp = a.amount - b.amount;
      } else if (sortField === 'product') {
        cmp = (a.products?.name || '').localeCompare(b.products?.name || '');
      } else if (sortField === 'status') {
        cmp = a.status.localeCompare(b.status);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={11} className="text-muted-foreground opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp size={11} className="text-primary" />
      : <ChevronDown size={11} className="text-primary" />;
  };

  const totalSpend = orders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + o.amount, 0);

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const canRequestRefund = (order: OrderRow) =>
    order.status === 'completed' && !order.refund;

  return (
    <DashboardLayout activeRoute="orders">
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-800 text-foreground">Order History</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              View and manage all your past purchases
            </p>
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-600 text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-all duration-150 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Orders', value: orders.length, sub: 'all time' },
            { label: 'Completed', value: statusCounts['completed'] || 0, sub: 'successful' },
            { label: 'Total Spend', value: `$${totalSpend.toFixed(2)}`, sub: 'completed orders' },
            { label: 'Refunded', value: statusCounts['refunded'] || 0, sub: 'orders' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl px-4 py-3">
              <div className="text-xs text-muted-foreground mb-1">{kpi.label}</div>
              <div className="text-lg font-800 text-foreground tabular-nums">{kpi.value}</div>
              <div className="text-xs text-muted-foreground">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={13} className="text-muted-foreground flex-shrink-0" />
            {(['all', 'completed', 'pending', 'failed', 'refunded', 'cancelled'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-600 rounded-lg capitalize transition-all duration-150 ${
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                }`}
              >
                {s === 'all' ? `All (${orders.length})` : `${s} (${statusCounts[s] || 0})`}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-5">
              <OrdersSkeleton />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
                <ShoppingBag size={18} className="text-danger" />
              </div>
              <p className="text-sm font-600 text-foreground">Failed to load orders</p>
              <p className="text-xs text-muted-foreground">{error}</p>
              <button
                onClick={fetchOrders}
                className="mt-1 px-4 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                <ShoppingBag size={20} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-600 text-foreground">
                {orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
              </p>
              <p className="text-xs text-muted-foreground">
                {orders.length === 0
                  ? 'Your purchase history will appear here' :'Try adjusting your search or filter'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="text-left px-5 py-3 text-xs font-600 text-muted-foreground whitespace-nowrap">Order ID</th>
                    <th
                      className="text-left px-3 py-3 text-xs font-600 text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort('product')}
                    >
                      <span className="flex items-center gap-1">Product <SortIcon field="product" /></span>
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-600 text-muted-foreground whitespace-nowrap">Plan</th>
                    <th
                      className="text-left px-3 py-3 text-xs font-600 text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort('amount')}
                    >
                      <span className="flex items-center gap-1">Amount <SortIcon field="amount" /></span>
                    </th>
                    <th
                      className="text-left px-3 py-3 text-xs font-600 text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort('status')}
                    >
                      <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
                    </th>
                    <th
                      className="text-left px-3 py-3 text-xs font-600 text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort('date')}
                    >
                      <span className="flex items-center gap-1">Date <SortIcon field="date" /></span>
                    </th>
                    <th className="px-3 py-3 text-xs font-600 text-muted-foreground whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order, i) => {
                    const cat = order.products?.category || 'other';
                    return (
                      <React.Fragment key={order.id}>
                        <tr
                          className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors duration-100 ${
                            i % 2 === 0 ? '' : 'bg-secondary/10'
                          }`}
                        >
                          {/* Order ID */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="text-xs font-mono font-600 text-muted-foreground">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                          </td>

                          {/* Product */}
                          <td className="px-3 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-600 px-1.5 py-0.5 rounded-full flex-shrink-0 ${categoryStyles[cat] || categoryStyles['other']}`}>
                                {categoryLabel[cat] || 'Other'}
                              </span>
                              <span className="text-xs font-600 text-foreground whitespace-nowrap">
                                {order.products?.name || '—'}
                              </span>
                            </div>
                          </td>

                          {/* Plan */}
                          <td className="px-3 py-3.5">
                            <div className="flex flex-col">
                              <span className="text-xs text-secondary-foreground whitespace-nowrap">
                                {order.product_plans?.name || '—'}
                              </span>
                              {order.product_plans?.billing_period && (
                                <span className="text-xs text-muted-foreground capitalize">
                                  {order.product_plans.billing_period.replace('_', '-')}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-xs font-700 tabular-nums text-foreground">
                                {formatAmount(order.amount, order.currency)}
                              </span>
                              {order.discount_amount > 0 && (
                                <span className="text-xs text-success">
                                  -{formatAmount(order.discount_amount, order.currency)} off
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3.5">
                            <div className="flex flex-col gap-1">
                              <span className={`text-xs font-600 px-2 py-0.5 rounded-full capitalize w-fit ${statusStyles[order.status] || statusStyles['pending']}`}>
                                {order.status}
                              </span>
                              {order.refund && (
                                <span className={`text-xs font-500 px-2 py-0.5 rounded-full w-fit ${refundStatusStyles[order.refund.status] || ''}`}>
                                  {refundStatusLabel[order.refund.status] || order.refund.status}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Date */}
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3.5">
                            <div className="flex items-center justify-end gap-1">
                              {order.receipt_url ? (
                                <a
                                  href={order.receipt_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-150"
                                  title="View receipt"
                                >
                                  <Receipt size={13} />
                                </a>
                              ) : (
                                <button
                                  disabled
                                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/30 cursor-not-allowed"
                                  title="No receipt available"
                                >
                                  <Receipt size={13} />
                                </button>
                              )}
                              {order.products?.slug && order.status === 'completed' ? (
                                <a
                                  href={`/products/${order.products.slug}`}
                                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-150"
                                  title="View product"
                                >
                                  <ExternalLink size={13} />
                                </a>
                              ) : null}
                              {order.status === 'completed' && (
                                <button
                                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-success hover:bg-success/10 transition-all duration-150"
                                  title="Download"
                                >
                                  <Download size={13} />
                                </button>
                              )}
                              {/* Refund button */}
                              {canRequestRefund(order) && (
                                <button
                                  onClick={() => setRefundModalOrder(order)}
                                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-warning hover:bg-warning/10 transition-all duration-150"
                                  title="Request refund"
                                >
                                  <RotateCcw size={13} />
                                </button>
                              )}
                              {order.refund && (
                                <div
                                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/50 cursor-default"
                                  title={`Refund ${order.refund.status}`}
                                >
                                  <Clock size={13} />
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-border bg-secondary/20 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Showing {filtered.length} of {orders.length} orders
                </span>
                {orders.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Total spend: <span className="font-700 text-foreground">${totalSpend.toFixed(2)}</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Refund Modal */}
      {refundModalOrder && (
        <RefundModal
          order={refundModalOrder}
          onClose={() => setRefundModalOrder(null)}
          onSuccess={() => {
            setRefundModalOrder(null);
            setSuccessMessage('Refund request submitted successfully! We will review it within 1–3 business days.');
            fetchOrders();
          }}
        />
      )}

      {/* Success Toast */}
      {successMessage && (
        <SuccessToast
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}
    </DashboardLayout>
  );
}
