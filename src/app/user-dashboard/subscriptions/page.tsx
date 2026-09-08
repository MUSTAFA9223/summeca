'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  ExternalLink,
  Package,
  PauseCircle,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'paused' | 'trialing' | 'past_due';

interface SubscriptionRow {
  id: string;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  payment_provider: string | null;
  products: { name: string; category: string; slug: string; thumbnail_url: string } | null;
  product_plans: { name: string; billing_period: string; price: number; currency: string; features: string[] } | null;
}

type StatusFilter = 'all' | SubscriptionStatus;

const statusConfig: Record<SubscriptionStatus, { label: string; icon: React.ComponentType<any>; cls: string }> = {
  active: { label: 'Active access', icon: CheckCircle, cls: 'bg-success/10 text-success border border-success/20' },
  trialing: { label: 'Trial access', icon: Clock, cls: 'bg-primary/10 text-primary border border-primary/20' },
  paused: { label: 'Paused', icon: PauseCircle, cls: 'bg-warning/10 text-warning border border-warning/20' },
  cancelled: { label: 'Marked cancelled', icon: XCircle, cls: 'bg-secondary text-muted-foreground border border-border' },
  expired: { label: 'Expired', icon: AlertCircle, cls: 'bg-danger/10 text-danger border border-danger/20' },
  past_due: { label: 'Payment issue', icon: AlertCircle, cls: 'bg-warning/10 text-warning border border-warning/20' },
};

const categoryLabel: Record<string, string> = {
  ai_tool: 'AI Tool',
  api: 'API',
  plugin: 'Plugin',
  template: 'Template',
  dataset: 'Dataset',
  course: 'Course',
  other: 'Other',
};

const categoryBadge: Record<string, string> = {
  ai_tool: 'bg-primary/10 text-primary',
  api: 'bg-primary/10 text-primary',
  plugin: 'bg-primary/10 text-primary',
  template: 'bg-warning/10 text-warning',
  dataset: 'bg-warning/10 text-warning',
  course: 'bg-success/10 text-success',
  other: 'bg-secondary text-muted-foreground',
};

const accessPeriodLabel: Record<string, string> = {
  monthly: 'Monthly access plan',
  yearly: 'Yearly access plan',
  one_time: 'One-time purchase',
  lifetime: 'Lifetime access',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  } catch {
    return `${Number(amount).toFixed(2)} ${currency || 'USD'}`;
  }
}

function SubscriptionSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-40 bg-secondary/50 rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}

function SubscriptionCard({ sub }: { sub: SubscriptionRow }) {
  const cfg = statusConfig[sub.status] || statusConfig.expired;
  const StatusIcon = cfg.icon;
  const plan = sub.product_plans;
  const product = sub.products;
  const hasAccessEnd = Boolean(sub.current_period_end);
  const providerLabel = sub.payment_provider ? sub.payment_provider.replace(/_/g, ' ') : 'Not recorded';

  let accessMessage = 'Access details are recorded in your account.';
  if (sub.status === 'active' || sub.status === 'trialing') {
    accessMessage = hasAccessEnd
      ? `Current access is recorded through ${formatDate(sub.current_period_end)}. This date is not a promise of automatic renewal.`
      : 'This access record has no scheduled end date.';
  } else if (sub.status === 'expired') {
    accessMessage = sub.current_period_end
      ? `Access expired on ${formatDate(sub.current_period_end)}.`
      : 'This access record is expired.';
  } else if (sub.status === 'cancelled') {
    accessMessage = 'This record is marked cancelled. That status does not by itself confirm cancellation of any provider-side recurring agreement.';
  } else if (sub.status === 'past_due') {
    accessMessage = 'This record has a payment issue. No new access is granted until a new payment is verified.';
  } else if (sub.status === 'paused') {
    accessMessage = 'This access record is paused.';
  }

  return (
    <article className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Package size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-700 text-foreground">{product?.name || 'Unknown Product'}</h2>
                {product?.category && (
                  <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${categoryBadge[product.category] || categoryBadge.other}`}>
                    {categoryLabel[product.category] || product.category}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {plan?.name || 'Plan'}
                {plan ? ` · ${formatCurrency(plan.price, plan.currency)}` : ''}
                {plan?.billing_period ? ` · ${accessPeriodLabel[plan.billing_period] || plan.billing_period}` : ''}
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-600 px-2.5 py-1 rounded-full ${cfg.cls}`}>
              <StatusIcon size={11} />
              {cfg.label}
            </span>
          </div>

          <div className="mt-4 rounded-xl bg-secondary/35 border border-border p-3">
            <div className="flex items-start gap-2">
              <Calendar size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs leading-relaxed text-muted-foreground">{accessMessage}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Started</span>
              <div className="font-600 text-foreground mt-0.5">{formatDate(sub.current_period_start || sub.created_at)}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Access through</span>
              <div className="font-600 text-foreground mt-0.5">{sub.current_period_end ? formatDate(sub.current_period_end) : 'No scheduled end'}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Payment provider</span>
              <div className="font-600 text-foreground mt-0.5 capitalize">{providerLabel}</div>
            </div>
          </div>

          {plan?.features && plan.features.length > 0 && (
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {plan.features.map((feature, index) => (
                <li key={`${feature}-${index}`} className="flex items-start gap-2 text-xs text-foreground">
                  <CheckCircle size={12} className="text-success mt-0.5 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {product?.slug && (
              <Link
                href={`/products/${product.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <ExternalLink size={12} />
                View plan options
              </Link>
            )}
            <Link
              href="/support"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-600 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Billing support
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchSubscriptions = useCallback(async () => {
    if (!user) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          status,
          current_period_start,
          current_period_end,
          cancelled_at,
          created_at,
          payment_provider,
          products ( name, category, slug, thumbnail_url ),
          product_plans ( name, billing_period, price, currency, features )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSubscriptions((data as unknown as SubscriptionRow[]) || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load access records');
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const filtered = subscriptions.filter((sub) => {
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      sub.products?.name?.toLowerCase().includes(term) ||
      sub.product_plans?.name?.toLowerCase().includes(term) ||
      sub.payment_provider?.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const activeCount = subscriptions.filter((sub) => sub.status === 'active' || sub.status === 'trialing').length;
  const endedCount = subscriptions.filter((sub) => sub.status === 'cancelled' || sub.status === 'expired').length;
  const providerCount = new Set(subscriptions.map((sub) => sub.payment_provider).filter(Boolean)).size;
  const statusCounts = subscriptions.reduce<Record<string, number>>((acc, sub) => {
    acc[sub.status] = (acc[sub.status] || 0) + 1;
    return acc;
  }, {});

  const filters: StatusFilter[] = ['all', 'active', 'trialing', 'past_due', 'paused', 'cancelled', 'expired'];

  return (
    <DashboardLayout activeRoute="subscriptions">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-800 text-foreground">Subscriptions & Access</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              View paid access periods. New access is granted only after verified payment.
            </p>
          </div>
          <button
            onClick={fetchSubscriptions}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-600 text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 text-xs leading-relaxed text-muted-foreground">
          SUMMECA currently records prepaid access after verified checkout. This page does not claim that a provider-side recurring billing agreement has been created, renewed, cancelled, upgraded, or downgraded unless that action is separately confirmed by the payment provider.
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Active Access', value: activeCount, sub: 'current records', icon: CheckCircle },
            { label: 'All Records', value: subscriptions.length, sub: 'access history', icon: CreditCard },
            { label: 'Providers', value: providerCount, sub: 'recorded', icon: Package },
            { label: 'Ended', value: endedCount, sub: 'cancelled / expired', icon: XCircle },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                <kpi.icon size={15} className="text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
                <div className="text-lg font-800 text-foreground tabular-nums">{kpi.value}</div>
                <div className="text-xs text-muted-foreground">{kpi.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative max-w-xs flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search access records..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {filters.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-600 rounded-lg capitalize transition-all ${
                  statusFilter === status
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {status === 'all' ? `All (${subscriptions.length})` : `${status.replace('_', ' ')} (${statusCounts[status] || 0})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <SubscriptionSkeleton />
        ) : error ? (
          <div className="bg-danger/5 border border-danger/20 rounded-2xl p-6 text-center">
            <AlertCircle size={24} className="text-danger mx-auto mb-2" />
            <p className="text-sm font-600 text-foreground mb-1">Failed to load access records</p>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            <button onClick={fetchSubscriptions} className="px-4 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg">
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <CreditCard size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm font-600 text-foreground mb-1">
              {subscriptions.length === 0 ? 'No access records yet' : 'No matching access records'}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {subscriptions.length === 0 ? 'Verified paid access will appear here after purchase.' : 'Try adjusting your search or filter.'}
            </p>
            {subscriptions.length === 0 && (
              <Link href="/products" className="inline-flex px-4 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg">
                Browse Products
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((sub) => (
              <SubscriptionCard key={sub.id} sub={sub} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
