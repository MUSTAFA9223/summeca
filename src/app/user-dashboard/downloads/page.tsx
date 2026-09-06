'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Download,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Package,
  Calendar,
  HardDrive,
} from 'lucide-react';
import Link from 'next/link';

interface DownloadRow {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  status: 'available' | 'expired' | 'revoked';
  download_count: number;
  expires_at: string | null;
  last_downloaded_at: string | null;
  created_at: string;
  products: { name: string; category: string; slug: string; thumbnail_url: string } | null;
  orders: { id: string; created_at: string } | null;
}

type StatusFilter = 'all' | 'available' | 'expired' | 'revoked';

const statusConfig: Record<string, { label: string; icon: React.ComponentType<any>; cls: string }> = {
  available: { label: 'Available', icon: CheckCircle, cls: 'bg-success/10 text-success border border-success/20' },
  expired: { label: 'Expired', icon: Clock, cls: 'bg-warning/10 text-warning border border-warning/20' },
  revoked: { label: 'Revoked', icon: XCircle, cls: 'bg-danger/10 text-danger border border-danger/20' },
};

const categoryLabel: Record<string, string> = {
  ai_tool: 'AI Tool', api: 'API', plugin: 'Plugin',
  template: 'Template', dataset: 'Dataset', course: 'Course', other: 'Other',
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

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function daysUntilExpiry(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ expiresAt, status }: { expiresAt: string | null; status: string }) {
  if (status !== 'available') return null;
  if (!expiresAt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <CheckCircle size={11} />
        No expiry
      </span>
    );
  }
  const days = daysUntilExpiry(expiresAt);
  if (days === null) return null;
  if (days < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-danger">
        <AlertCircle size={11} />
        Expired
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-warning font-600">
        <Clock size={11} />
        Expires in {days}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Calendar size={11} />
      Expires {formatDate(expiresAt)}
    </span>
  );
}

function DownloadsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 bg-secondary/50 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

export default function DownloadsPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchDownloads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('downloads')
        .select(`
          id,
          file_name,
          file_url,
          file_size,
          status,
          download_count,
          expires_at,
          last_downloaded_at,
          created_at,
          products ( name, category, slug, thumbnail_url ),
          orders ( id, created_at )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDownloads((data as unknown as DownloadRow[]) || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load downloads');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  const handleDownload = async (download: DownloadRow) => {
    if (!download.file_url || download.status !== 'available') return;
    window.open(download.file_url, '_blank', 'noopener,noreferrer');
  };

  const filtered = downloads.filter((d) => {
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesSearch =
      !search ||
      d.file_name.toLowerCase().includes(search.toLowerCase()) ||
      d.products?.name?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusCounts = downloads.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});

  const totalDownloadCount = downloads.reduce((sum, d) => sum + (d.download_count || 0), 0);
  const expiringSoon = downloads.filter((d) => {
    if (d.status !== 'available' || !d.expires_at) return false;
    const days = daysUntilExpiry(d.expires_at);
    return days !== null && days >= 0 && days <= 7;
  }).length;

  return (
    <DashboardLayout activeRoute="downloads">
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-800 text-foreground">Downloads</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Access and manage your purchased product files
            </p>
          </div>
          <button
            onClick={fetchDownloads}
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
            { label: 'Total Files', value: downloads.length, sub: 'all downloads', icon: FileText },
            { label: 'Available', value: statusCounts['available'] || 0, sub: 'ready to download', icon: CheckCircle },
            { label: 'Total Downloads', value: totalDownloadCount, sub: 'times downloaded', icon: Download },
            { label: 'Expiring Soon', value: expiringSoon, sub: 'within 7 days', icon: Clock },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">
                <kpi.icon size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
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
              placeholder="Search files or products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={13} className="text-muted-foreground flex-shrink-0" />
            {(['all', 'available', 'expired', 'revoked'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-600 rounded-lg capitalize transition-all duration-150 ${
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                }`}
              >
                {s === 'all' ? `All (${downloads.length})` : `${s} (${statusCounts[s] || 0})`}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-5">
              <DownloadsSkeleton />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle size={32} className="text-danger/60" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <button
                onClick={fetchDownloads}
                className="px-4 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all"
              >
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Download size={36} className="text-muted-foreground/40" />
              <p className="text-sm font-600 text-foreground">
                {downloads.length === 0 ? 'No downloads yet' : 'No results found'}
              </p>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                {downloads.length === 0
                  ? 'Purchase a product to access downloadable files here.'
                  : 'Try adjusting your search or filter.'}
              </p>
              {downloads.length === 0 && (
                <Link
                  href="/products"
                  className="mt-1 px-4 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all"
                >
                  Browse Products
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((download) => {
                const StatusIcon = statusConfig[download.status]?.icon || CheckCircle;
                const isAvailable = download.status === 'available';
                const days = daysUntilExpiry(download.expires_at);
                const isExpiringSoon = isAvailable && days !== null && days >= 0 && days <= 7;

                return (
                  <div
                    key={download.id}
                    className={`flex items-start gap-4 px-5 py-4 hover:bg-secondary/30 transition-colors duration-150 ${
                      isExpiringSoon ? 'border-l-2 border-l-warning' : ''
                    }`}
                  >
                    {/* File icon */}
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileText size={18} className="text-muted-foreground" />
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-600 text-foreground truncate">
                            {download.file_name || 'Unnamed file'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {download.products && (
                              <>
                                <span className={`inline-flex items-center gap-1 text-xs font-600 px-1.5 py-0.5 rounded-md ${categoryBadge[download.products.category] || 'bg-secondary text-muted-foreground'}`}>
                                  <Package size={9} />
                                  {categoryLabel[download.products.category] || download.products.category}
                                </span>
                                <Link
                                  href={`/products/${download.products.slug}`}
                                  className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                                >
                                  {download.products.name}
                                  <ExternalLink size={10} />
                                </Link>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1 text-xs font-600 px-2 py-1 rounded-lg flex-shrink-0 ${statusConfig[download.status]?.cls || ''}`}>
                          <StatusIcon size={11} />
                          {statusConfig[download.status]?.label || download.status}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <HardDrive size={11} />
                          {formatFileSize(download.file_size)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Download size={11} />
                          {download.download_count} download{download.download_count !== 1 ? 's' : ''}
                        </span>
                        {download.last_downloaded_at && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock size={11} />
                            Last: {formatDate(download.last_downloaded_at)}
                          </span>
                        )}
                        <ExpiryBadge expiresAt={download.expires_at} status={download.status} />
                      </div>
                    </div>

                    {/* Download button */}
                    <div className="flex-shrink-0">
                      {isAvailable && download.file_url ? (
                        <button
                          onClick={() => handleDownload(download)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-150"
                        >
                          <Download size={13} />
                          Download
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-600 bg-secondary text-muted-foreground rounded-lg cursor-not-allowed opacity-60"
                        >
                          <Download size={13} />
                          {download.status === 'expired' ? 'Expired' : 'Unavailable'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer note */}
        {downloads.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Download links are tied to your account. Contact support if you have issues accessing your files.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
