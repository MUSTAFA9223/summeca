'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  FileText,
  Download,
  ExternalLink,
  Search,
  RefreshCw,
  CheckCircle,
  DollarSign,
  Calendar,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface InvoiceRow {
  id: string;
  created_at: string;
  amount: number;
  currency: string;
  discount_amount: number;
  receipt_url: string | null;
  stripe_payment_id: string | null;
  products: { name: string; category: string; slug: string } | null;
  product_plans: { name: string; billing_period: string } | null;
}

type SortField = 'date' | 'amount' | 'product';
type SortDir = 'asc' | 'desc';

const billingPeriodLabel: Record<string, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  yearly: 'Yearly',
  lifetime: 'Lifetime',
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

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(amount);
}

function invoiceNumber(id: string, index: number) {
  return `INV-${String(index + 1).padStart(4, '0')}`;
}

function InvoicesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 bg-secondary/50 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchInvoices = useCallback(async () => {
    if (!user) return;
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
          stripe_payment_id,
          products ( name, category, slug ),
          product_plans ( name, billing_period )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setInvoices((data as unknown as InvoiceRow[]) || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const filtered = invoices
    .filter((inv) => {
      if (!search) return true;
      return (
        inv.products?.name?.toLowerCase().includes(search.toLowerCase()) ||
        inv.id.toLowerCase().includes(search.toLowerCase()) ||
        inv.product_plans?.name?.toLowerCase().includes(search.toLowerCase())
      );
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'amount') {
        cmp = a.amount - b.amount;
      } else if (sortField === 'product') {
        cmp = (a.products?.name || '').localeCompare(b.products?.name || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalSaved = invoices.reduce((sum, inv) => sum + (inv.discount_amount || 0), 0);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp size={11} className="text-muted-foreground opacity-30" />;
    return sortDir === 'asc'
      ? <ChevronUp size={11} className="text-primary" />
      : <ChevronDown size={11} className="text-primary" />;
  };

  return (
    <DashboardLayout activeRoute="invoices">
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-800 text-foreground">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              All your paid invoices and receipts
            </p>
          </div>
          <button
            onClick={fetchInvoices}
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
            {
              label: 'Total Invoices',
              value: invoices.length,
              sub: 'paid',
              icon: FileText,
              color: 'text-primary',
              bg: 'bg-primary/10',
            },
            {
              label: 'Total Paid',
              value: `$${totalPaid.toFixed(2)}`,
              sub: 'all time',
              icon: DollarSign,
              color: 'text-success',
              bg: 'bg-success/10',
            },
            {
              label: 'Total Saved',
              value: `$${totalSaved.toFixed(2)}`,
              sub: 'via discounts',
              icon: CheckCircle,
              color: 'text-warning',
              bg: 'bg-warning/10',
            },
            {
              label: 'Latest Invoice',
              value: invoices.length > 0 ? formatDate(invoices[0].created_at) : '—',
              sub: 'most recent',
              icon: Calendar,
              color: 'text-muted-foreground',
              bg: 'bg-secondary',
            },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <kpi.icon size={15} className={kpi.color} />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground mb-0.5">{kpi.label}</div>
                <div className="text-base font-800 text-foreground tabular-nums truncate">{kpi.value}</div>
                <div className="text-xs text-muted-foreground">{kpi.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-5">
              <InvoicesSkeleton />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
                <FileText size={18} className="text-danger" />
              </div>
              <p className="text-sm text-danger font-600">{error}</p>
              <button
                onClick={fetchInvoices}
                className="px-4 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all"
              >
                Try Again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                <FileText size={22} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-600 text-foreground">
                {search ? 'No invoices match your search' : 'No paid invoices yet'}
              </p>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                {search
                  ? 'Try a different search term'
                  : 'Your paid invoices will appear here once you complete a purchase'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">
                      Invoice #
                    </th>
                    <th
                      className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort('product')}
                    >
                      <span className="flex items-center gap-1">
                        Product <SortIcon field="product" />
                      </span>
                    </th>
                    <th
                      className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort('date')}
                    >
                      <span className="flex items-center gap-1">
                        Date <SortIcon field="date" />
                      </span>
                    </th>
                    <th
                      className="text-right px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort('amount')}
                    >
                      <span className="flex items-center justify-end gap-1">
                        Amount <SortIcon field="amount" />
                      </span>
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((inv, index) => {
                    const originalIndex = invoices.findIndex((i) => i.id === inv.id);
                    const invNum = invoiceNumber(inv.id, originalIndex);
                    const cat = inv.products?.category || 'other';
                    const billingLabel = billingPeriodLabel[inv.product_plans?.billing_period || ''] || '';

                    return (
                      <tr key={inv.id} className="hover:bg-secondary/30 transition-colors duration-100">
                        {/* Invoice # */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <FileText size={13} className="text-primary" />
                            </div>
                            <span className="font-700 text-foreground text-xs tabular-nums">{invNum}</span>
                          </div>
                        </td>

                        {/* Product */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-xs font-600 px-1.5 py-0.5 rounded-md flex-shrink-0 ${categoryStyles[cat] || categoryStyles.other}`}
                            >
                              {categoryLabel[cat] || 'Other'}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-600 text-foreground truncate max-w-[180px]">
                                {inv.products?.name || 'Unknown Product'}
                              </div>
                              {inv.product_plans?.name && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {inv.product_plans.name}
                                  {billingLabel ? ` · ${billingLabel}` : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5">
                          <span className="text-sm text-foreground tabular-nums whitespace-nowrap">
                            {formatDate(inv.created_at)}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3.5 text-right">
                          <div>
                            <span className="text-sm font-700 text-foreground tabular-nums">
                              {formatAmount(inv.amount, inv.currency)}
                            </span>
                            {inv.discount_amount > 0 && (
                              <div className="text-xs text-success">
                                −{formatAmount(inv.discount_amount, inv.currency)} saved
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-600 bg-success/10 text-success border border-success/20">
                            <CheckCircle size={10} />
                            Paid
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {inv.receipt_url ? (
                              <>
                                <a
                                  href={inv.receipt_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-600 text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-all duration-150"
                                  title="View receipt"
                                >
                                  <ExternalLink size={11} />
                                  View
                                </a>
                                <a
                                  href={inv.receipt_url}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-600 text-muted-foreground bg-secondary hover:bg-secondary/80 hover:text-foreground rounded-lg transition-all duration-150"
                                  title="Download PDF"
                                >
                                  <Download size={11} />
                                  PDF
                                </a>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground italic px-2">
                                No receipt
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-border bg-secondary/20 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Showing {filtered.length} of {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs font-700 text-foreground">
                  Total: {formatAmount(filtered.reduce((s, i) => s + i.amount, 0), invoices[0]?.currency || 'USD')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
