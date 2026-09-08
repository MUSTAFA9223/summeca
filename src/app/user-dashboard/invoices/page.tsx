'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
} from 'lucide-react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PurchaseRecord {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  discount_amount: number;
  receipt_url: string | null;
  products: { name: string; category: string; slug: string } | null;
  product_plans: { name: string; billing_period: string } | null;
}

const billingPeriodLabel: Record<string, string> = {
  one_time: 'One-time',
  monthly: 'Monthly access',
  yearly: 'Yearly access',
  lifetime: 'Lifetime',
};

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

function purchaseReference(id: string) {
  return `ORD-${id.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
}

function RecordsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-16 bg-secondary/50 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchRecords = useCallback(async () => {
    if (!user) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          amount,
          currency,
          discount_amount,
          receipt_url,
          products ( name, category, slug ),
          product_plans ( name, billing_period )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setRecords((data as unknown as PurchaseRecord[]) || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load purchase records');
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const term = search.trim().toLowerCase();
  const filtered = records.filter((record) =>
    !term ||
    record.id.toLowerCase().includes(term) ||
    record.products?.name?.toLowerCase().includes(term) ||
    record.product_plans?.name?.toLowerCase().includes(term) ||
    record.currency?.toLowerCase().includes(term)
  );

  const currencies = Array.from(new Set(records.map((record) => record.currency).filter(Boolean)));
  const receiptCount = records.filter((record) => Boolean(record.receipt_url)).length;

  return (
    <DashboardLayout activeRoute="invoices">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-800 text-foreground">Purchase Records</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Stable order references and provider receipts for completed purchases.
            </p>
          </div>
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-600 text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="rounded-xl border border-border bg-secondary/30 p-4 text-xs leading-relaxed text-muted-foreground">
          SUMMECA does not generate a standalone tax invoice PDF on this page. A “provider receipt” link is shown only when the completed order contains a real receipt URL returned by the payment flow.
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Paid Purchases', value: records.length, sub: 'completed orders', icon: FileText },
            { label: 'Provider Receipts', value: receiptCount, sub: 'available links', icon: ExternalLink },
            { label: 'Currencies', value: currencies.length, sub: currencies.join(', ') || 'none yet', icon: CheckCircle },
            { label: 'Latest Purchase', value: records.length ? formatDate(records[0].created_at) : '—', sub: 'most recent', icon: Calendar },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                <kpi.icon size={15} className="text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
                <div className="text-base font-800 text-foreground tabular-nums truncate">{kpi.value}</div>
                <div className="text-xs text-muted-foreground truncate">{kpi.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search purchase records..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-5"><RecordsSkeleton /></div>
          ) : error ? (
            <div className="py-16 text-center px-6">
              <FileText size={22} className="text-danger mx-auto mb-3" />
              <p className="text-sm font-600 text-foreground">Failed to load purchase records</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">{error}</p>
              <button onClick={fetchRecords} className="px-4 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg">
                Try Again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center px-6">
              <FileText size={22} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-600 text-foreground">
                {records.length ? 'No records match your search' : 'No completed purchases yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Reference</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Amount</th>
                    <th className="text-right px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((record) => {
                    const billing = billingPeriodLabel[record.product_plans?.billing_period || ''] || '';
                    return (
                      <tr key={record.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs font-700 text-foreground">{purchaseReference(record.id)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-600 text-foreground text-sm">{record.products?.name || 'Unknown Product'}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {record.product_plans?.name || 'Plan'}{billing ? ` · ${billing}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-sm text-foreground">{formatDate(record.created_at)}</td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="font-700 text-foreground">{formatAmount(record.amount, record.currency)}</div>
                          {record.discount_amount > 0 && (
                            <div className="text-xs text-success">{formatAmount(record.discount_amount, record.currency)} discount</div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {record.receipt_url ? (
                            <a
                              href={record.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-600 text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                            >
                              <ExternalLink size={11} />
                              Provider receipt
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not available</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-3 border-t border-border bg-secondary/20 text-xs text-muted-foreground">
                Showing {filtered.length} of {records.length} completed purchase record{records.length === 1 ? '' : 's'}. Amounts are shown in each order’s original currency and are not combined across currencies.
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
