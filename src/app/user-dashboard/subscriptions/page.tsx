'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  CreditCard,
  RefreshCw,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  XCircle,
  CheckCircle,
  Clock,
  PauseCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Zap,
  Calendar,
  Package,
} from 'lucide-react';
import Link from 'next/link';

interface SubscriptionRow {
  id: string;
  status: 'active' | 'cancelled' | 'expired' | 'paused' | 'trialing';
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  stripe_subscription_id: string;
  products: { name: string; category: string; slug: string; thumbnail_url: string } | null;
  product_plans: { name: string; billing_period: string; price: number; currency: string; features: string[] } | null;
  usage_total: number;
}

interface UsageRow {
  subscription_id: string;
  quantity: number;
}

type StatusFilter = 'all' | 'active' | 'trialing' | 'paused' | 'cancelled' | 'expired';

const statusConfig: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  active: { label: 'Active', icon: CheckCircle, cls: 'bg-success/10 text-success border border-success/20' },
  trialing: { label: 'Trial', icon: Clock, cls: 'bg-primary/10 text-primary border border-primary/20' },
  paused: { label: 'Paused', icon: PauseCircle, cls: 'bg-warning/10 text-warning border border-warning/20' },
  cancelled: { label: 'Cancelled', icon: XCircle, cls: 'bg-secondary text-muted-foreground border border-border' },
  expired: { label: 'Expired', icon: AlertCircle, cls: 'bg-danger/10 text-danger border border-danger/20' },
};

const categoryLabel: Record<string, string> = {
  ai_tool: 'AI Tool', api: 'API', plugin: 'Plugin',
  template: 'Template', dataset: 'Dataset', course: 'Course', other: 'Other',
};

const categoryBadge: Record<string, string> = {
  ai_tool: 'bg-primary/10 text-primary', api: 'bg-primary/10 text-primary',
  plugin: 'bg-primary/10 text-primary', template: 'bg-warning/10 text-warning',
  dataset: 'bg-warning/10 text-warning', course: 'bg-success/10 text-success',
  other: 'bg-secondary text-muted-foreground',
};

const billingLabel: Record<string, string> = {
  monthly: '/mo', yearly: '/yr', one_time: ' one-time', lifetime: ' lifetime',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function periodProgress(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = Date.now();
  if (now >= e) return 100;
  if (now <= s) return 0;
  return Math.round(((now - s) / (e - s)) * 100);
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

function SubscriptionCard({ sub, onAction }: { sub: SubscriptionRow; onAction: (action: string, sub: SubscriptionRow) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[sub.status] || statusConfig.expired;
  const StatusIcon = cfg.icon;
  const isActive = sub.status === 'active' || sub.status === 'trialing';
  const progress = periodProgress(sub.current_period_start, sub.current_period_end);
  const daysLeft = daysUntil(sub.current_period_end);
  const plan = sub.product_plans;
  const product = sub.products;

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-all duration-200 ${isActive ? 'border-border' : 'border-border/60 opacity-80'}`}>
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Product icon */}
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Package size={20} className="text-primary" />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-700 text-foreground truncate">{product?.name || 'Unknown Product'}</h3>
                  {product?.category && (
                    <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${categoryBadge[product.category] || 'bg-secondary text-muted-foreground'}`}>
                      {categoryLabel[product.category] || product.category}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {plan?.name || 'Plan'} &middot;{' '}
                  {plan ? `${formatCurrency(plan.price, plan.currency)}${billingLabel[plan.billing_period] || ''}` : '—'}
                </div>
              </div>

              {/* Status badge */}
              <span className={`inline-flex items-center gap-1.5 text-xs font-600 px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.cls}`}>
                <StatusIcon size={11} />
                {cfg.label}
              </span>
            </div>

            {/* Period progress bar (active/trialing only) */}
            {isActive && sub.current_period_end && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar size={11} />
                    {daysLeft !== null && daysLeft > 0
                      ? `Renews in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                      : daysLeft === 0
                      ? 'Renews today' :'Renewal overdue'}
                  </span>
                  <span className="text-xs text-muted-foreground">{progress}% used</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      progress > 85 ? 'bg-warning' : 'bg-primary'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{formatDate(sub.current_period_start)}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(sub.current_period_end)}</span>
                </div>
              </div>
            )}

            {/* Cancelled/expired info */}
            {!isActive && (
              <div className="mt-2 text-xs text-muted-foreground">
                {sub.status === 'cancelled' && sub.cancelled_at
                  ? `Cancelled on ${formatDate(sub.cancelled_at)}`
                  : sub.status === 'expired' && sub.current_period_end
                  ? `Expired on ${formatDate(sub.current_period_end)}`
                  : `Started ${formatDate(sub.created_at)}`}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {isActive && (
            <>
              <button
                onClick={() => onAction('upgrade', sub)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-150"
              >
                <ArrowUpCircle size={13} />
                Upgrade
              </button>
              <button
                onClick={() => onAction('downgrade', sub)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all duration-150"
              >
                <ArrowDownCircle size={13} />
                Downgrade
              </button>
              <button
                onClick={() => onAction('cancel', sub)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 text-danger bg-danger/5 border border-danger/20 rounded-lg hover:bg-danger/10 transition-all duration-150"
              >
                <XCircle size={13} />
                Cancel
              </button>
            </>
          )}
          {(sub.status === 'cancelled' || sub.status === 'expired') && (
            <button
              onClick={() => onAction('reactivate', sub)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-150"
            >
              <Zap size={13} />
              Reactivate
            </button>
          )}
          {product?.slug && (
            <Link
              href={`/products/${product.slug}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 text-muted-foreground bg-secondary rounded-lg hover:text-foreground hover:bg-secondary/80 transition-all duration-150 ml-auto"
            >
              <ExternalLink size={12} />
              View Product
            </Link>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Less' : 'Details'}
          </button>
        </div>
      </div>

      {/* Expanded plan features */}
      {expanded && plan?.features && plan.features.length > 0 && (
        <div className="border-t border-border px-5 py-4 bg-secondary/30">
          <div className="text-xs font-700 text-muted-foreground uppercase tracking-wider mb-3">Plan Features</div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {plan.features.map((feat, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                <CheckCircle size={12} className="text-success mt-0.5 flex-shrink-0" />
                {feat}
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
            <span>Started: {formatDate(sub.created_at)}</span>
            {sub.stripe_subscription_id && (
              <span className="font-mono truncate">ID: {sub.stripe_subscription_id.slice(0, 20)}…</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActionModal({
  action,
  sub,
  onClose,
  onConfirm,
  cancelReason,
  onCancelReasonChange,
}: {
  action: string;
  sub: SubscriptionRow;
  onClose: () => void;
  onConfirm: () => void;
  cancelReason?: string;
  onCancelReasonChange?: (v: string) => void;
}) {
  const config: Record<string, { title: string; desc: string; btnLabel: string; btnCls: string }> = {
    cancel: {
      title: 'Cancel Subscription',
      desc: `Are you sure you want to cancel your ${sub.products?.name || 'subscription'}? You'll retain access until the end of the current billing period (${formatDate(sub.current_period_end)}).`,
      btnLabel: 'Yes, Cancel',
      btnCls: 'bg-danger text-white hover:bg-danger/90',
    },
    upgrade: {
      title: 'Upgrade Plan',
      desc: `To upgrade your ${sub.products?.name || ''} plan, please visit the product page and select a higher tier. Your current billing will be prorated.`,
      btnLabel: 'Go to Product',
      btnCls: 'bg-primary text-primary-foreground hover:bg-primary/90',
    },
    downgrade: {
      title: 'Downgrade Plan',
      desc: `To downgrade your ${sub.products?.name || ''} plan, please visit the product page and select a lower tier. Changes take effect at the next billing cycle.`,
      btnLabel: 'Go to Product',
      btnCls: 'bg-secondary text-foreground hover:bg-secondary/80',
    },
    reactivate: {
      title: 'Reactivate Subscription',
      desc: `Reactivate your ${sub.products?.name || ''} subscription. You'll be charged for a new billing period starting today.`,
      btnLabel: 'Reactivate',
      btnCls: 'bg-primary text-primary-foreground hover:bg-primary/90',
    },
  };

  const cfg = config[action];
  if (!cfg) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-base font-700 text-foreground mb-2">{cfg.title}</h3>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{cfg.desc}</p>
        {action === 'cancel' && onCancelReasonChange && (
          <div className="mb-4">
            <label className="text-xs font-600 text-muted-foreground mb-1.5 block">Reason for cancellation (optional)</label>
            <select
              value={cancelReason ?? ''}
              onChange={(e) => onCancelReasonChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select a reason...</option>
              <option value="too_expensive">Too expensive</option>
              <option value="not_using">Not using it enough</option>
              <option value="missing_features">Missing features I need</option>
              <option value="switching_provider">Switching to another provider</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-600 text-muted-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-600 rounded-lg transition-all ${cfg.btnCls}`}
          >
            {cfg.btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modalAction, setModalAction] = useState<{ action: string; sub: SubscriptionRow } | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchSubscriptions = useCallback(async () => {
    if (!user) return;
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
          stripe_subscription_id,
          products ( name, category, slug, thumbnail_url ),
          product_plans ( name, billing_period, price, currency, features )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch usage totals per subscription
      const subs = (data as unknown as SubscriptionRow[]) || [];
      const subIds = subs.map((s) => s.id);

      let usageMap: Record<string, number> = {};
      if (subIds.length > 0) {
        const { data: usageData } = await supabase
          .from('usage')
          .select('subscription_id, quantity')
          .in('subscription_id', subIds);

        if (usageData) {
          usageMap = (usageData as UsageRow[]).reduce<Record<string, number>>((acc, u) => {
            acc[u.subscription_id] = (acc[u.subscription_id] || 0) + Number(u.quantity);
            return acc;
          }, {});
        }
      }

      setSubscriptions(subs.map((s) => ({ ...s, usage_total: usageMap[s.id] || 0 })));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleAction = (action: string, sub: SubscriptionRow) => {
    setModalAction({ action, sub });
  };

  const handleConfirm = async () => {
    if (!modalAction) return;
    const { action, sub } = modalAction;

    if (action === 'upgrade' || action === 'downgrade') {
      if (sub.products?.slug) {
        window.location.href = `/products/${sub.products.slug}`;
      }
      setModalAction(null);
      return;
    }

    if (action === 'cancel') {
      try {
        const res = await fetch('/api/subscriptions/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscriptionId: sub.id, reason: cancelReason }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to cancel');
        setSubscriptions((prev) =>
          prev.map((s) =>
            s.id === sub.id
              ? { ...s, status: 'cancelled' as const, cancelled_at: new Date().toISOString() }
              : s
          )
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
      }
    }

    if (action === 'reactivate') {
      if (sub.products?.slug) {
        window.location.href = `/products/${sub.products.slug}`;
      }
    }

    setModalAction(null);
    setCancelReason('');
  };

  const filtered = subscriptions.filter((s) => {
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesSearch =
      !search ||
      s.products?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.product_plans?.name?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const activeCount = subscriptions.filter((s) => s.status === 'active' || s.status === 'trialing').length;
  const cancelledCount = subscriptions.filter((s) => s.status === 'cancelled' || s.status === 'expired').length;
  const monthlySpend = subscriptions
    .filter((s) => (s.status === 'active' || s.status === 'trialing') && s.product_plans?.billing_period === 'monthly')
    .reduce((sum, s) => sum + (s.product_plans?.price || 0), 0);

  const statusCounts = subscriptions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <DashboardLayout activeRoute="subscriptions">
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-800 text-foreground">Subscriptions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your active and past subscriptions
            </p>
          </div>
          <button
            onClick={fetchSubscriptions}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-600 text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-all duration-150 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Active', value: activeCount, sub: 'subscriptions', icon: CheckCircle, iconCls: 'text-success' },
            { label: 'Total', value: subscriptions.length, sub: 'all time', icon: CreditCard, iconCls: 'text-primary' },
            { label: 'Monthly Spend', value: `$${monthlySpend.toFixed(2)}`, sub: 'recurring /mo', icon: Zap, iconCls: 'text-warning' },
            { label: 'Cancelled', value: cancelledCount, sub: 'inactive', icon: XCircle, iconCls: 'text-muted-foreground' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                <kpi.icon size={15} className={kpi.iconCls} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
                <div className="text-lg font-800 text-foreground tabular-nums">{kpi.value}</div>
                <div className="text-xs text-muted-foreground">{kpi.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search subscriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'active', 'trialing', 'paused', 'cancelled', 'expired'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-600 rounded-lg capitalize transition-all duration-150 ${
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                }`}
              >
                {s === 'all' ? `All (${subscriptions.length})` : `${s} (${statusCounts[s] || 0})`}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <SubscriptionSkeleton />
        ) : error ? (
          <div className="bg-danger/5 border border-danger/20 rounded-2xl p-6 text-center">
            <AlertCircle size={24} className="text-danger mx-auto mb-2" />
            <p className="text-sm font-600 text-foreground mb-1">Failed to load subscriptions</p>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            <button
              onClick={fetchSubscriptions}
              className="px-4 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <CreditCard size={32} className="text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm font-600 text-foreground mb-1">
              {subscriptions.length === 0 ? 'No subscriptions yet' : 'No matching subscriptions'}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {subscriptions.length === 0
                ? 'Browse our marketplace to find tools and services to subscribe to.' :'Try adjusting your search or filter.'}
            </p>
            {subscriptions.length === 0 && (
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all"
              >
                Browse Products
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active subscriptions section */}
            {filtered.some((s) => s.status === 'active' || s.status === 'trialing') && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={14} className="text-success" />
                  <span className="text-xs font-700 uppercase tracking-wider text-muted-foreground">Active</span>
                </div>
                <div className="space-y-3">
                  {filtered
                    .filter((s) => s.status === 'active' || s.status === 'trialing')
                    .map((sub) => (
                      <SubscriptionCard key={sub.id} sub={sub} onAction={handleAction} />
                    ))}
                </div>
              </div>
            )}

            {/* Past subscriptions section */}
            {filtered.some((s) => s.status !== 'active' && s.status !== 'trialing') && (
              <div>
                <div className="flex items-center gap-2 mb-3 mt-6">
                  <Clock size={14} className="text-muted-foreground" />
                  <span className="text-xs font-700 uppercase tracking-wider text-muted-foreground">Past Subscriptions</span>
                </div>
                <div className="space-y-3">
                  {filtered
                    .filter((s) => s.status !== 'active' && s.status !== 'trialing')
                    .map((sub) => (
                      <SubscriptionCard key={sub.id} sub={sub} onAction={handleAction} />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action modal */}
      {modalAction && (
        <ActionModal
          action={modalAction.action}
          sub={modalAction.sub}
          onClose={() => { setModalAction(null); setCancelReason(''); }}
          onConfirm={handleConfirm}
          cancelReason={cancelReason}
          onCancelReasonChange={setCancelReason}
        />
      )}
    </DashboardLayout>
  );
}
