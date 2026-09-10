'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Filter, RefreshCw, Search } from 'lucide-react';

interface Subscription {
  id: string;
  status: string;
  payment_provider: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  user_profiles: { email: string; full_name: string } | null;
  products: { name: string } | null;
  product_plans: {
    name: string;
    billing_period: string;
    price: number;
    currency: string;
  } | null;
}

interface SubscriptionsResponse {
  subscriptions?: Subscription[];
  total?: number;
  error?: string;
}

const PAGE_SIZE = 20;

const statusStyles: Record<string, string> = {
  active: 'bg-success/10 text-success',
  cancelled: 'bg-danger/10 text-danger',
  expired: 'bg-muted text-muted-foreground',
  paused: 'bg-warning/10 text-warning',
  trialing: 'bg-info/10 text-info',
  past_due: 'bg-orange-500/10 text-orange-500',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatMoney(amount: number | null | undefined, currency: string | null | undefined) {
  const value = Number(amount ?? 0);
  const code = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(value);
  } catch {
    return `${value.toFixed(2)} ${code}`;
  }
}

async function readJson(response: Response): Promise<SubscriptionsResponse> {
  try {
    return (await response.json()) as SubscriptionsResponse;
  } catch {
    return {};
  }
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/admin/subscriptions?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load subscription access records.');
      }

      setSubscriptions(Array.isArray(data.subscriptions) ? data.subscriptions : []);
      setTotal(Number.isFinite(Number(data.total)) ? Number(data.total) : 0);
    } catch (err: unknown) {
      setSubscriptions([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    void fetchSubscriptions();
  }, [fetchSubscriptions]);

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = normalizedSearch
    ? subscriptions.filter((subscription) => {
        const customer = `${subscription.user_profiles?.full_name ?? ''} ${subscription.user_profiles?.email ?? ''}`.toLowerCase();
        const product = `${subscription.products?.name ?? ''} ${subscription.product_plans?.name ?? ''}`.toLowerCase();
        return customer.includes(normalizedSearch) || product.includes(normalizedSearch) || subscription.id.toLowerCase().includes(normalizedSearch);
      })
    : subscriptions;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-800 text-foreground">Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} subscription access record{total === 1 ? '' : 's'}</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchSubscriptions()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border text-xs font-600 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-warning/25 bg-warning/5 p-4 flex gap-3">
        <AlertCircle size={17} className="text-warning flex-shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-muted-foreground">
          <p className="font-700 text-foreground mb-1">Provider billing actions are intentionally disabled here.</p>
          <p>
            These records describe SUMMECA access state. Pause, cancellation, and reactivation must not be recorded as completed unless the external payment provider has confirmed the billing change. This page is read-only until that provider-backed workflow is implemented.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customer, product, or subscription ID..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(0);
            }}
            className="pl-9 pr-8 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past due</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {error ? (
          <div className="py-14 px-5 flex flex-col items-center text-center gap-3">
            <AlertCircle size={28} className="text-danger" />
            <div>
              <p className="text-sm font-700 text-foreground">Could not load subscriptions</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => void fetchSubscriptions()}
              className="px-4 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Product / Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Provider</th>
                  <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Access until</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-b border-border last:border-0">
                      {Array.from({ length: 6 }).map((__, column) => (
                        <td key={column} className="px-4 py-4"><div className="h-4 rounded bg-secondary animate-pulse w-24" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-14 text-center text-sm text-muted-foreground">
                      {subscriptions.length === 0 ? 'No subscription records found.' : 'No subscriptions match this search.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((subscription) => (
                    <tr key={subscription.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="text-xs font-600 text-foreground">{subscription.user_profiles?.full_name || '—'}</div>
                        <div className="text-xs text-muted-foreground">{subscription.user_profiles?.email || '—'}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-xs font-600 text-foreground">{subscription.products?.name || '—'}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {subscription.product_plans?.name || '—'}
                          {subscription.product_plans?.billing_period ? ` · ${subscription.product_plans.billing_period.replace('_', '-')}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-600 capitalize ${statusStyles[subscription.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {subscription.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground capitalize">{subscription.payment_provider || '—'}</td>
                      <td className="px-4 py-3.5 text-xs font-600 text-foreground whitespace-nowrap">
                        {formatMoney(subscription.product_plans?.price, subscription.product_plans?.currency)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap" title="This is the stored SUMMECA access period, not a guaranteed provider renewal date.">
                        {formatDate(subscription.current_period_end)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-3 border-t border-border bg-secondary/20 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Page {Math.min(page + 1, totalPages)} of {totalPages}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              disabled={page === 0 || loading}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
              disabled={page + 1 >= totalPages || loading}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
