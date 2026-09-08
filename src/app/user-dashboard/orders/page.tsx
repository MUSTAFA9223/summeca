'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Filter,
  Info,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

type StatusFilter = 'all' | OrderRow['status'];

const statusStyles: Record<string, string> = {
  completed: 'bg-success/10 text-success border border-success/20',
  pending: 'bg-warning/10 text-warning border border-warning/20',
  failed: 'bg-danger/10 text-danger border border-danger/20',
  refunded: 'bg-secondary text-muted-foreground border border-border',
  cancelled: 'bg-secondary text-muted-foreground border border-border',
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
  pending: 'Refund pending',
  under_review: 'Under review',
  approved: 'Refund approved',
  processing: 'Processing',
  completed: 'Refund completed',
  rejected: 'Refund rejected',
  failed: 'Refund failed',
};

const REFUND_REASONS = [
  { value: 'product_issue', label: 'Product Issue' },
  { value: 'not_satisfied', label: 'Not Satisfied' },
  { value: 'duplicate_purchase', label: 'Duplicate Purchase' },
  { value: 'other', label: 'Other' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  } catch {
    return `${Number(amount).toFixed(2)} ${currency || 'USD'}`;
  }
}

function orderReference(id: string) {
  return `#${id.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

function OrdersSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-16 bg-secondary/50 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

function RefundModal({
  order,
  onClose,
  onSuccess,
}: {
  order: OrderRow;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [reason, setReason] = useState('product_issue');
  const [customerNote, setCustomerNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/refunds/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, reason, customerNote }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(payload.error || `Refund request failed with status ${response.status}.`);
      }

      onSuccess(payload.message || 'Refund request submitted. Its status will update after review.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to submit the refund request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="refund-title">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 id="refund-title" className="text-sm font-700 text-foreground">Request Refund</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Order {orderReference(order.id)}</p>
          </div>
          <button onClick={onClose} aria-label="Close refund request" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary">
            <X size={14} />
          </button>
        </div>

        <div className="px-6 py-4 bg-secondary/30 border-b border-border flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-600 text-foreground truncate">{order.products?.name || 'Product'}</p>
            <p className="text-xs text-muted-foreground truncate">{order.product_plans?.name || 'Plan'}</p>
          </div>
          <span className="text-sm font-700 text-foreground whitespace-nowrap">{formatAmount(order.amount, order.currency)}</span>
        </div>

        <div className="px-6 pt-4">
          <div className="flex gap-2.5 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600 leading-relaxed">
              Submitting a refund request does not guarantee approval or a specific processing timeframe. Eligibility and completion depend on the order, payment method, provider confirmation, and applicable policy.
              {' '}<Link href="/refunds" className="underline font-600">Read the refund policy</Link>.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="refund-reason" className="block text-xs font-600 text-foreground mb-1.5">Reason for refund</label>
            <select
              id="refund-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            >
              {REFUND_REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="refund-note" className="block text-xs font-600 text-foreground mb-1.5">Additional details <span className="text-muted-foreground font-400">(optional)</span></label>
            <textarea
              id="refund-note"
              value={customerNote}
              onChange={(event) => setCustomerNote(event.target.value)}
              placeholder="Describe the issue in more detail..."
              rows={3}
              maxLength={1000}
              className="w-full px-3 py-2.5 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{customerNote.length}/1000</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-danger/5 border border-danger/20 rounded-xl">
              <AlertCircle size={14} className="text-danger mt-0.5 flex-shrink-0" />
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-600 text-muted-foreground bg-secondary hover:bg-secondary/80 rounded-xl">
              Close
            </button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 text-sm font-600 text-white bg-warning hover:bg-warning/90 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting && <RefreshCw size={13} className="animate-spin" />}
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refundModalOrder, setRefundModalOrder] = useState<OrderRow | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: ordersData, error: ordersError } = await supabase
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

      if (ordersError) throw ordersError;
      const rawOrders = (ordersData as unknown as OrderRow[]) || [];

      if (!rawOrders.length) {
        setOrders([]);
        return;
      }

      const { data: refundsData, error: refundsError } = await supabase
        .from('refunds')
        .select('id, order_id, status, reason, requested_at')
        .in('order_id', rawOrders.map((order) => order.id))
        .not('status', 'in', '("rejected","failed")');

      if (refundsError) throw refundsError;

      const refundMap: Record<string, RefundInfo> = {};
      for (const refund of refundsData || []) {
        refundMap[refund.order_id] = {
          id: refund.id,
          status: refund.status,
          reason: refund.reason,
          requested_at: refund.requested_at,
        };
      }

      setOrders(rawOrders.map((order) => ({ ...order, refund: refundMap[order.id] || null })));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const term = search.trim().toLowerCase();
  const filtered = orders.filter((order) => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch =
      !term ||
      order.id.toLowerCase().includes(term) ||
      order.products?.name?.toLowerCase().includes(term) ||
      order.product_plans?.name?.toLowerCase().includes(term) ||
      order.currency?.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const statusCounts = orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});
  const currencyCount = new Set(orders.map((order) => order.currency).filter(Boolean)).size;
  const pendingCount = statusCounts.pending || 0;
  const filters: StatusFilter[] = ['all', 'completed', 'pending', 'failed', 'refunded', 'cancelled'];

  return (
    <DashboardLayout activeRoute="orders">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-800 text-foreground">Order History</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Payment state is based on server-side provider verification, not checkout redirects.</p>
          </div>
          <button onClick={fetchOrders} disabled={loading} className="flex items-center gap-2 px-3 py-2 text-xs font-600 text-muted-foreground hover:text-foreground bg-secondary rounded-lg disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Orders', value: orders.length, sub: 'all statuses' },
            { label: 'Completed', value: statusCounts.completed || 0, sub: 'verified' },
            { label: 'Pending', value: pendingCount, sub: 'awaiting verification' },
            { label: 'Currencies', value: currencyCount, sub: 'recorded' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl px-4 py-3">
              <div className="text-xs text-muted-foreground mb-1">{kpi.label}</div>
              <div className="text-lg font-800 text-foreground tabular-nums">{kpi.value}</div>
              <div className="text-xs text-muted-foreground">{kpi.sub}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search orders..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={13} className="text-muted-foreground" />
            {filters.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-600 rounded-lg capitalize transition-all ${statusFilter === status ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                {status === 'all' ? `All (${orders.length})` : `${status} (${statusCounts[status] || 0})`}
              </button>
            ))}
          </div>
        </div>

        {successMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-success/20 bg-success/5 p-4" role="status">
            <CheckCircle size={16} className="text-success mt-0.5 flex-shrink-0" />
            <p className="text-xs text-foreground flex-1">{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} aria-label="Dismiss message" className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <OrdersSkeleton />
          ) : error ? (
            <div className="py-16 text-center px-6">
              <ShoppingBag size={22} className="text-danger mx-auto mb-3" />
              <p className="text-sm font-600 text-foreground">Failed to load orders</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">{error}</p>
              <button onClick={fetchOrders} className="px-4 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg">Try Again</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center px-6">
              <ShoppingBag size={22} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-600 text-foreground">{orders.length ? 'No orders match your filters' : 'No orders yet'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Order</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((order) => (
                    <tr key={order.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3.5"><span className="font-mono text-xs font-700 text-muted-foreground">{orderReference(order.id)}</span></td>
                      <td className="px-4 py-3.5">
                        <div className="text-xs font-600 text-foreground">{order.products?.name || '—'}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{order.product_plans?.name || '—'}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-xs font-700 text-foreground">{formatAmount(order.amount, order.currency)}</div>
                        {order.discount_amount > 0 && <div className="text-xs text-success">{formatAmount(order.discount_amount, order.currency)} discount</div>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          <span className={`text-xs font-600 px-2 py-0.5 rounded-full capitalize w-fit ${statusStyles[order.status] || statusStyles.pending}`}>{order.status}</span>
                          {order.refund && (
                            <span className={`text-xs font-500 px-2 py-0.5 rounded-full w-fit ${refundStatusStyles[order.refund.status] || 'bg-secondary text-muted-foreground'}`}>
                              {refundStatusLabel[order.refund.status] || order.refund.status}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-muted-foreground">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {order.receipt_url && (
                            <a href={order.receipt_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10" title="View provider receipt">
                              <Receipt size={13} />
                            </a>
                          )}
                          {order.products?.slug && (
                            <Link href={`/products/${order.products.slug}`} className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10" title="View product">
                              <ExternalLink size={13} />
                            </Link>
                          )}
                          {order.status === 'completed' && !order.refund && (
                            <button onClick={() => setRefundModalOrder(order)} className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-warning hover:bg-warning/10" title="Request refund">
                              <RotateCcw size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-border bg-secondary/20 text-xs text-muted-foreground">
                Showing {filtered.length} of {orders.length} orders. Monetary values are kept in each order’s original currency and are not combined across currencies.
              </div>
            </div>
          )}
        </div>
      </div>

      {refundModalOrder && (
        <RefundModal
          order={refundModalOrder}
          onClose={() => setRefundModalOrder(null)}
          onSuccess={(message) => {
            setRefundModalOrder(null);
            setSuccessMessage(message);
            fetchOrders();
          }}
        />
      )}
    </DashboardLayout>
  );
}
