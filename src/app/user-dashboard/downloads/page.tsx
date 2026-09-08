'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Package,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DownloadRow {
  id: string;
  file_name: string;
  file_size: number;
  status: 'available' | 'expired' | 'revoked';
  download_count: number;
  expires_at: string | null;
  last_downloaded_at: string | null;
  created_at: string;
  products: { name: string; category: string; slug: string; thumbnail_url: string } | null;
  orders: { id: string; created_at: string } | null;
}

type StatusFilter = 'all' | DownloadRow['status'];

const statusConfig = {
  available: { label: 'Available', icon: CheckCircle, cls: 'bg-success/10 text-success border border-success/20' },
  expired: { label: 'Expired', icon: Clock, cls: 'bg-warning/10 text-warning border border-warning/20' },
  revoked: { label: 'Revoked', icon: XCircle, cls: 'bg-danger/10 text-danger border border-danger/20' },
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatFileSize(bytes: number) {
  if (!bytes || bytes <= 0) return 'Size not recorded';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function hasExpired(expiresAt: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}

function Skeleton() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-24 bg-secondary/50 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

export default function DownloadsPage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchDownloads = useCallback(async () => {
    if (!user) {
      setDownloads([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('downloads')
        .select(`
          id,
          file_name,
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
  }, [supabase, user]);

  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  const handleDownload = async (download: DownloadRow) => {
    if (download.status !== 'available' || hasExpired(download.expires_at) || activeDownloadId) return;
    setActiveDownloadId(download.id);
    setDownloadError(null);

    try {
      const response = await fetch(`/api/downloads/${encodeURIComponent(download.id)}`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'Unable to prepare this download securely.');
      }

      window.location.assign(payload.url);
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : 'Unable to download this file.');
      setActiveDownloadId(null);
    }
  };

  const term = search.trim().toLowerCase();
  const filtered = downloads.filter((download) => {
    const effectiveStatus = download.status === 'available' && hasExpired(download.expires_at) ? 'expired' : download.status;
    const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;
    const matchesSearch =
      !term ||
      download.file_name.toLowerCase().includes(term) ||
      download.products?.name?.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const effectiveAvailableCount = downloads.filter((download) => download.status === 'available' && !hasExpired(download.expires_at)).length;
  const expiredCount = downloads.filter((download) => download.status === 'expired' || (download.status === 'available' && hasExpired(download.expires_at))).length;
  const totalDownloadCount = downloads.reduce((sum, download) => sum + (download.download_count || 0), 0);
  const filters: StatusFilter[] = ['all', 'available', 'expired', 'revoked'];

  return (
    <DashboardLayout activeRoute="downloads">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-800 text-foreground">Downloads</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Files are delivered through short-lived server-authorized links. Direct storage URLs are not exposed here.
            </p>
          </div>
          <button
            onClick={fetchDownloads}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-600 text-muted-foreground hover:text-foreground bg-secondary rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {downloadError && (
          <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/5 p-4" role="alert">
            <AlertCircle size={15} className="text-danger mt-0.5 flex-shrink-0" />
            <p className="text-xs text-danger flex-1">{downloadError}</p>
            <button onClick={() => setDownloadError(null)} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Files', value: downloads.length, sub: 'owned records' },
            { label: 'Available', value: effectiveAvailableCount, sub: 'not expired' },
            { label: 'Expired', value: expiredCount, sub: 'blocked' },
            { label: 'Downloads', value: totalDownloadCount, sub: 'recorded access' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card border border-border rounded-xl px-4 py-3">
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
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
              placeholder="Search files or products..."
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
                className={`px-3 py-1.5 text-xs font-600 rounded-lg capitalize ${statusFilter === status ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <Skeleton />
          ) : error ? (
            <div className="py-16 text-center px-6">
              <AlertCircle size={28} className="text-danger mx-auto mb-3" />
              <p className="text-sm font-600 text-foreground">Failed to load downloads</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">{error}</p>
              <button onClick={fetchDownloads} className="px-4 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg">Try Again</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center px-6">
              <Download size={32} className="text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm font-600 text-foreground">{downloads.length ? 'No files match this filter' : 'No downloads yet'}</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {downloads.length ? 'Try another search or status.' : 'Secure downloadable files from eligible purchases will appear here.'}
              </p>
              {!downloads.length && <Link href="/products" className="inline-flex px-4 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg">Browse Products</Link>}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((download) => {
                const expiredByTime = download.status === 'available' && hasExpired(download.expires_at);
                const effectiveStatus: DownloadRow['status'] = expiredByTime ? 'expired' : download.status;
                const config = statusConfig[effectiveStatus];
                const StatusIcon = config.icon;
                const canDownload = effectiveStatus === 'available';
                const isPreparing = activeDownloadId === download.id;

                return (
                  <article key={download.id} className="px-5 py-4 hover:bg-secondary/20 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                        <FileText size={18} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <h2 className="text-sm font-600 text-foreground truncate">{download.file_name || 'Unnamed file'}</h2>
                            <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                              <span>{formatFileSize(download.file_size)}</span>
                              <span>·</span>
                              <span>{download.download_count || 0} recorded download{download.download_count === 1 ? '' : 's'}</span>
                              {download.last_downloaded_at && <><span>·</span><span>Last {formatDate(download.last_downloaded_at)}</span></>}
                            </div>
                            {download.products && (
                              <Link href={`/products/${download.products.slug}`} className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                <Package size={11} /> {download.products.name}
                              </Link>
                            )}
                          </div>
                          <span className={`inline-flex items-center gap-1 text-xs font-600 px-2 py-1 rounded-lg ${config.cls}`}>
                            <StatusIcon size={11} /> {config.label}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                          <p className="text-xs text-muted-foreground">
                            {download.expires_at ? `Access expires: ${formatDate(download.expires_at)}` : 'No download expiry recorded'}
                          </p>
                          <button
                            onClick={() => handleDownload(download)}
                            disabled={!canDownload || Boolean(activeDownloadId)}
                            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-600 bg-primary text-primary-foreground rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isPreparing ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                            {isPreparing ? 'Preparing...' : canDownload ? 'Download securely' : 'Unavailable'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
