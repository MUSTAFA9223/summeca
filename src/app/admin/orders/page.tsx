'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, Filter, ChevronLeft, ChevronRight, Eye, X, RotateCcw, AlertTriangle } from 'lucide-react';

interface Order {
  id: string;
  user_id: string;
  product_id: string;
  plan_id: string | null;
  status: string;
  amount: number;
  currency: string;
  discount_amount: number;
  provider_payment_ref: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  user_profiles: { email: string; full_name: string } | null;
  products: { name: string } | null;
  product_plans: { name: string } | null;
}

const PAGE_SIZE = 20;

const statusColors: Record<string, string> = {
  completed: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  failed: 'bg-danger/10 text-danger',
  refunded: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground',
};

// ─── Refund Confirmation Modal ────────────────────────────────────────────────

function RefundModal({
  order,
  onClose,
  onSuccess,
}: {
  order: Order;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRefund() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Refund failed. Please try again.');
      } else {
        onSuccess(order.id);
        onClose();
        router.push('/admin/refunds');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl border border-border w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center">
              <RotateCcw size={15} className="text-danger" />
            </div>
            <h2 className="text-base font-700 text-foreground">Request Refund Review</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Warning */}
          <div className="flex gap-3 p-3 rounded-xl bg-warning/5 border border-warning/20">
            <AlertTriangle size={16} className="text-warning mt-0.5 shrink-0" />
            <p className="text-xs text-warning leading-relaxed">
              This creates or opens a refund review request. No money is returned and the order remains unchanged until the refund workflow confirms completion.
            </p>
          </div>

          {/* Order summary */}
          <div className="rounded-xl bg-secondary/40 border border-border p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Order</span>
              <span className="font-mono text-xs text-foreground">{order.id.slice(0, 8).toUpperCase()}…</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Customer</span>
              <span className="text-xs font-600 text-foreground">
                {order.user_profiles?.email ?? '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Product</span>
              <span className="text-xs font-600 text-foreground">{order.products?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Amount</span>
              <span className="text-xs font-700 text-foreground">
                {order.currency} {Number(order.amount).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-600 text-foreground mb-1.5">
              Refund Reason <span className="text-muted-foreground font-400">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer request, duplicate charge, product issue…"
              rows={3}
              className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 p-5 pt-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-600 text-muted-foreground bg-secondary hover:bg-secondary/80 rounded-xl transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRefund}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-700 text-white bg-danger hover:bg-danger/90 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <RotateCcw size={14} />
                Create Review Request
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order Detail Modal ───────────────────────────────────────────────────────

function OrderDetailModal({
  order,
  onClose,
  onRefund,
}: {
  order: Order;
  onClose: () => void;
  onRefund: (order: Order) => void;
}) {
  const meta = order.metadata ?? {};
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-base font-700 text-foreground">Order Details</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Order ID</p>
              <p className="font-600 text-foreground font-mono text-xs break-all">{order.id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Status</p>
              <span
                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-600 ${statusColors[order.status] ?? 'bg-muted text-muted-foreground'}`}
              >
                {order.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Customer</p>
              <p className="font-600 text-foreground text-xs">{order.user_profiles?.full_name || '—'}</p>
              <p className="text-xs text-muted-foreground">{order.user_profiles?.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Product</p>
              <p className="font-600 text-foreground text-xs">{order.products?.name || '—'}</p>
              <p className="text-xs text-muted-foreground">{order.product_plans?.name || 'No plan'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Amount</p>
              <p className="font-700 text-foreground">
                {order.currency} {Number(order.amount).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Discount</p>
              <p className="font-600 text-foreground">
                {order.currency} {Number(order.discount_amount).toFixed(2)}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-0.5">Provider Payment Ref</p>
              <p className="font-mono text-xs text-foreground break-all">
                {order.provider_payment_ref || '—'}
              </p>
            </div>
            {meta.payment_method_type && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Payment Method</p>
                <p className="text-xs font-600 text-foreground">{meta.payment_method_type}</p>
              </div>
            )}
            {meta.card_brand && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Card</p>
                <p className="text-xs font-600 text-foreground">
                  {meta.card_brand} •••• {meta.card_last4}
                </p>
              </div>
            )}
            {meta.refund_reason && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-0.5">Refund Reason</p>
                <p className="text-xs text-foreground">{meta.refund_reason}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Created</p>
              <p className="text-xs text-foreground">{new Date(order.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Updated</p>
              <p className="text-xs text-foreground">{new Date(order.updated_at).toLocaleString()}</p>
            </div>
          </div>

          {/* Refund button — only for completed orders */}
          {order.status === 'completed' && (
            <div className="pt-2 border-t border-border">
              <button
                onClick={() => {
                  onClose();
                  onRefund(order);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-600 text-danger bg-danger/5 hover:bg-danger/10 border border-danger/20 rounded-xl transition-all"
              >
                <RotateCcw size={14} />
                Process Refund
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);
  const supabase = createClient();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('orders')
      .select(`*, user_profiles(email, full_name), products(name), product_plans(name)`, {
        count: 'exact',
      })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter) query = query.eq('status', statusFilter);

    const { data, count, error } = await query;
    if (!error) {
      setOrders((data as any[]) ?? []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  function handleRefundSuccess(_orderId: string) {
    // Opening review is not a completed refund; keep the order status unchanged.
  }

  const filtered = search
    ? orders.filter(
        (o) =>
          o.id.includes(search) ||
          o.user_profiles?.email?.toLowerCase().includes(search.toLowerCase()) ||
          o.products?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-2xl font-800 text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{total} total orders</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by order ID, email, or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="pl-9 pr-8 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">
                  Order
                </th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">
                  Customer
                </th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">
                  Product
                </th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">
                  Amount
                </th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">
                  Date
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded shimmer w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No orders found
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border hover:bg-secondary/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {order.id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-600 text-foreground text-xs">
                        {order.user_profiles?.full_name || '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.user_profiles?.email || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-600 text-foreground text-xs">
                        {order.products?.name || '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.product_plans?.name || ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-700 text-foreground tabular-nums">
                      {order.currency} {Number(order.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-600 ${statusColors[order.status] ?? 'bg-muted text-muted-foreground'}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                          title="View details"
                        >
                          <Eye size={14} />
                        </button>
                        {order.status === 'completed' && (
                          <button
                            onClick={() => setRefundOrder(order)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all"
                            title="Process refund"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 transition-all"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 transition-all"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onRefund={(order) => setRefundOrder(order)}
        />
      )}
      {refundOrder && (
        <RefundModal
          order={refundOrder}
          onClose={() => setRefundOrder(null)}
          onSuccess={handleRefundSuccess}
        />
      )}
    </div>
  );
}
