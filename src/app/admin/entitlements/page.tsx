'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, ChevronLeft, ChevronRight, FileKey, RefreshCw, Save, Search, UploadCloud, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type DeliveryKind = 'storage' | 'database' | 'generated' | 'saas' | 'missing';

type DeliveryState = {
  kind: DeliveryKind;
  ready: boolean;
  path: string;
  name: string;
  size: number;
  detail: string;
};

type ProductDelivery = {
  id: string;
  name: string;
  slug: string;
  status: string;
  delivery: DeliveryState;
  download: null | {
    bucket: string;
    path: string;
    name: string;
    size: number;
  };
};

type Entitlement = {
  id: string;
  order_id: string | null;
  file_name: string;
  file_url: string;
  status: string;
  download_count: number;
  expires_at: string | null;
  last_downloaded_at: string | null;
  created_at: string;
  user_profiles: { email: string; full_name: string } | null;
  products: { name: string } | null;
};

const PAGE_SIZE = 20;

function formatBytes(bytes: number) {
  if (!bytes) return 'Generated on demand';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function safeJson(response: Response) {
  return response.text().then((text) => {
    if (!text.trim()) return {} as Record<string, any>;
    try {
      return JSON.parse(text) as Record<string, any>;
    } catch {
      return {} as Record<string, any>;
    }
  });
}

function deliveryLabel(delivery: DeliveryState) {
  if (!delivery.ready) return '❌ Delivery issue';
  if (delivery.kind === 'database') return '✅ File ready';
  if (delivery.kind === 'generated') return '⚙️ Generated automatically';
  if (delivery.kind === 'saas') return '🌐 SaaS — no download';
  if (delivery.kind === 'storage') return '✅ Private file ready';
  return '❌ File missing';
}

function deliveryTone(delivery: DeliveryState) {
  if (!delivery.ready || delivery.kind === 'missing') return 'border-danger/20 bg-danger/5 text-danger';
  if (delivery.kind === 'generated' || delivery.kind === 'saas') return 'border-primary/20 bg-primary/5 text-primary';
  return 'border-success/20 bg-success/5 text-success';
}

export default function AdminEntitlementsPage() {
  const [supabase] = useState(() => createClient());
  const [products, setProducts] = useState<ProductDelivery[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [objectPath, setObjectPath] = useState('');
  const [downloadName, setDownloadName] = useState('');
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [items, setItems] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const deliverySummary = useMemo(() => {
    const active = products.filter((product) => product.status === 'active');
    return {
      active: active.length,
      ready: active.filter((product) => product.delivery.ready).length,
      generated: active.filter((product) => product.delivery.kind === 'generated').length,
      saas: active.filter((product) => product.delivery.kind === 'saas').length,
      issues: active.filter((product) => !product.delivery.ready).length,
    };
  }, [products]);

  const storageManagerVisible = Boolean(
    selectedProduct && (selectedProduct.delivery.kind === 'storage' || selectedProduct.delivery.kind === 'missing')
  );

  const fetchDeliveryConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const response = await fetch('/api/admin/entitlements/config', { cache: 'no-store' });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not load product delivery configuration.');
      const nextProducts = Array.isArray(data.products) ? data.products as ProductDelivery[] : [];
      setProducts(nextProducts);
      setSelectedProductId((current) => current || nextProducts[0]?.id || '');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load delivery configuration.');
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedProduct) return;
    setObjectPath(selectedProduct.download?.path ?? '');
    setDownloadName(selectedProduct.download?.name ?? '');
    setSelectedFile(null);
  }, [selectedProduct]);

  const fetchEntitlements = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let query = supabase
        .from('downloads')
        .select('id, order_id, file_name, file_url, status, download_count, expires_at, last_downloaded_at, created_at, user_profiles(email, full_name), products(name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (statusFilter) query = query.eq('status', statusFilter);

      const { data, count, error } = await query;
      if (error) throw error;
      setItems((data as unknown as Entitlement[]) ?? []);
      setTotal(count ?? 0);
    } catch (error) {
      setItems([]);
      setTotal(0);
      setLoadError(error instanceof Error ? error.message : 'Could not load download entitlements.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, supabase]);

  useEffect(() => {
    void fetchDeliveryConfig();
  }, [fetchDeliveryConfig]);

  useEffect(() => {
    void fetchEntitlements();
  }, [fetchEntitlements]);

  const uploadAndConfigure = async () => {
    if (!selectedProductId || !selectedFile) return;
    setUploading(true);
    try {
      const prepareResponse = await fetch('/api/admin/entitlements/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          fileName: selectedFile.name,
        }),
      });
      const prepared = await safeJson(prepareResponse);
      if (!prepareResponse.ok || !prepared.path || !prepared.token) {
        throw new Error(prepared.error || 'Could not prepare secure upload.');
      }

      const { error: uploadError } = await supabase.storage
        .from('downloads')
        .uploadToSignedUrl(prepared.path, prepared.token, selectedFile, {
          contentType: selectedFile.type || 'application/octet-stream',
        });
      if (uploadError) throw new Error(uploadError.message);

      const configResponse = await fetch('/api/admin/entitlements/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          path: prepared.path,
          name: selectedFile.name,
        }),
      });
      const configured = await safeJson(configResponse);
      if (!configResponse.ok) {
        throw new Error(configured.error || 'The file uploaded, but delivery configuration could not be saved.');
      }

      toast.success(configured.reconciled > 0
        ? `File uploaded securely; ${configured.reconciled} existing purchase${configured.reconciled === 1 ? '' : 's'} reconciled.`
        : 'File uploaded and configured securely.');
      setSelectedFile(null);
      await Promise.all([fetchDeliveryConfig(), fetchEntitlements()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload product file.');
    } finally {
      setUploading(false);
    }
  };

  const saveDelivery = async () => {
    if (!selectedProductId) return;
    setConfigSaving(true);
    try {
      const response = await fetch('/api/admin/entitlements/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          path: objectPath,
          name: downloadName,
        }),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not save private download configuration.');
      toast.success(data.reconciled > 0
        ? `Private file configured; ${data.reconciled} existing purchase${data.reconciled === 1 ? '' : 's'} reconciled.`
        : 'Private file configured.');
      await Promise.all([fetchDeliveryConfig(), fetchEntitlements()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save download configuration.');
    } finally {
      setConfigSaving(false);
    }
  };

  const removeDelivery = async () => {
    if (!selectedProductId) return;
    setConfigSaving(true);
    try {
      const response = await fetch('/api/admin/entitlements/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProductId, remove: true }),
      });
      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.error || 'Could not remove download configuration.');
      toast.success('Download configuration removed for future purchases. Existing entitlements were left unchanged.');
      await fetchDeliveryConfig();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove download configuration.');
    } finally {
      setConfigSaving(false);
    }
  };

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      item.user_profiles?.email?.toLowerCase().includes(needle) ||
      item.user_profiles?.full_name?.toLowerCase().includes(needle) ||
      item.products?.name?.toLowerCase().includes(needle) ||
      item.file_name?.toLowerCase().includes(needle) ||
      item.order_id?.toLowerCase().includes(needle)
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-800 text-foreground">Download Entitlements</h1>
        <p className="text-sm text-muted-foreground mt-1">See the real delivery method for every product and review customer download access.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileKey size={16} className="text-primary" />
              <h2 className="text-sm font-800 text-foreground">Product delivery status</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              This view distinguishes private files, database assets, generated ZIP bundles, SaaS access, and genuinely missing delivery configuration.
            </p>
          </div>
          <button type="button" onClick={() => void fetchDeliveryConfig()} disabled={configLoading} className="inline-flex items-center gap-1.5 text-xs font-600 px-3 py-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-50">
            <RefreshCw size={12} className={configLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2.5"><div className="text-lg font-800 text-foreground">{deliverySummary.active}</div><div className="text-[11px] text-muted-foreground">Active products</div></div>
          <div className="rounded-xl border border-success/20 bg-success/5 px-3 py-2.5"><div className="text-lg font-800 text-success">{deliverySummary.ready}</div><div className="text-[11px] text-muted-foreground">Ready to deliver</div></div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5"><div className="text-lg font-800 text-primary">{deliverySummary.generated}</div><div className="text-[11px] text-muted-foreground">Generated ZIP</div></div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5"><div className="text-lg font-800 text-primary">{deliverySummary.saas}</div><div className="text-[11px] text-muted-foreground">SaaS access</div></div>
          <div className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2.5"><div className="text-lg font-800 text-danger">{deliverySummary.issues}</div><div className="text-[11px] text-muted-foreground">Active issues</div></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => setSelectedProductId(product.id)}
              className={`text-left rounded-xl border px-3 py-3 transition-colors ${selectedProductId === product.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/30'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-700 text-foreground truncate">{product.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 capitalize">{product.status}</div>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-700 ${deliveryTone(product.delivery)}`}>{deliveryLabel(product.delivery)}</span>
              </div>
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-700 text-muted-foreground mb-1.5">Selected product</label>
          <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} disabled={configLoading} className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm">
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.name} — {deliveryLabel(product.delivery)}</option>
            ))}
          </select>
        </div>

        {selectedProduct && (
          <div className={`rounded-xl border px-4 py-3 ${deliveryTone(selectedProduct.delivery)}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-800">{deliveryLabel(selectedProduct.delivery)}</span>
              <span className="text-[11px] font-700 uppercase tracking-wide opacity-80">{selectedProduct.delivery.kind}</span>
            </div>
            <p className="text-xs mt-1.5 opacity-90">{selectedProduct.delivery.detail}</p>
            {(selectedProduct.delivery.path || selectedProduct.delivery.name || selectedProduct.delivery.size > 0) && (
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[11px] opacity-80">
                {selectedProduct.delivery.path && <span>Source: <span className="font-mono break-all">{selectedProduct.delivery.path}</span></span>}
                {selectedProduct.delivery.name && <span>Customer file: <span className="font-mono">{selectedProduct.delivery.name}</span></span>}
                {selectedProduct.delivery.kind !== 'saas' && <span>Size: {formatBytes(selectedProduct.delivery.size)}</span>}
              </div>
            )}
          </div>
        )}

        {storageManagerVisible ? (
          <div className="space-y-4 rounded-xl border border-border bg-secondary/10 p-4">
            <div>
              <h3 className="text-xs font-800 text-foreground">Private Storage file manager</h3>
              <p className="text-[11px] text-muted-foreground mt-1">Use this only for products delivered from the private downloads bucket. Public URLs are rejected.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3">
              <div>
                <label className="block text-xs font-700 text-muted-foreground mb-1.5">Private object path</label>
                <input value={objectPath} onChange={(event) => setObjectPath(event.target.value)} placeholder="products/example/file.zip" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-700 text-muted-foreground mb-1.5">Customer filename</label>
                <input value={downloadName} onChange={(event) => setDownloadName(event.target.value)} placeholder="product-file.zip" className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm" />
              </div>
            </div>

            {selectedProduct?.download && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground rounded-xl bg-secondary/40 px-3 py-2.5">
                <span className="inline-flex items-center gap-1 text-success"><CheckCircle size={12} /> Configured</span>
                <span>Bucket: <span className="font-mono">{selectedProduct.download.bucket}</span></span>
                <span>Size: {formatBytes(selectedProduct.download.size)}</span>
              </div>
            )}

            <div className="rounded-xl border border-dashed border-border p-3 space-y-2">
              <label className="block text-xs font-700 text-muted-foreground">Upload a new private file</label>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <input
                  type="file"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  disabled={uploading || !selectedProductId}
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-xs file:font-700 file:text-foreground"
                />
                <button type="button" onClick={uploadAndConfigure} disabled={uploading || !selectedProductId || !selectedFile} className="btn-primary inline-flex shrink-0 items-center justify-center gap-2 disabled:opacity-50">
                  <UploadCloud size={13} /> {uploading ? 'Uploading…' : 'Upload & Configure'}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">The upload uses a short-lived signed token and a unique object path; existing files are never overwritten.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={saveDelivery} disabled={configSaving || uploading || !selectedProductId || !objectPath.trim()} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
                <Save size={13} /> {configSaving ? 'Saving…' : 'Verify Existing Path & Save'}
              </button>
              {selectedProduct?.download && (
                <button type="button" onClick={removeDelivery} disabled={configSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-danger/20 text-danger text-sm font-600 hover:bg-danger/5 disabled:opacity-50">
                  <XCircle size={13} /> Remove for future purchases
                </button>
              )}
            </div>
          </div>
        ) : selectedProduct ? (
          <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
            This product does not require a private Storage object path. Its delivery method is already managed by the secure server flow shown above.
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-800 text-foreground">Customer entitlements</h2>
            <p className="text-xs text-muted-foreground">{total} total record{total === 1 ? '' : 's'}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search entitlements…" className="pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm" />
            </div>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(0); }} className="px-3 py-2 rounded-lg border border-border bg-card text-sm">
              <option value="">All statuses</option>
              <option value="available">Available</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {loadError ? (
            <div className="py-14 px-5 flex flex-col items-center gap-3 text-center">
              <AlertCircle size={26} className="text-danger" />
              <div>
                <p className="text-sm font-700 text-foreground">Could not load entitlements</p>
                <p className="text-xs text-muted-foreground mt-1">{loadError}</p>
              </div>
              <button type="button" onClick={() => void fetchEntitlements()} className="btn-primary text-xs">Try again</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase">Customer</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase">Product / File</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase">Downloads</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase">Last access</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-border last:border-0">
                        {Array.from({ length: 6 }).map((__, cell) => <td key={cell} className="px-4 py-4"><div className="h-4 w-24 rounded bg-secondary animate-pulse" /></td>)}
                      </tr>
                    ))
                  ) : filteredItems.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-14 text-center text-sm text-muted-foreground">No entitlements found.</td></tr>
                  ) : (
                    filteredItems.map((item) => {
                      const configured = Boolean(item.file_url?.trim());
                      return (
                        <tr key={item.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                          <td className="px-4 py-3.5">
                            <div className="text-xs font-600 text-foreground">{item.user_profiles?.full_name || '—'}</div>
                            <div className="text-xs text-muted-foreground">{item.user_profiles?.email || '—'}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-xs font-600 text-foreground">{item.products?.name || '—'}</div>
                            <div className={`text-xs mt-0.5 ${configured ? 'text-muted-foreground' : 'text-danger'}`}>{item.file_name || (configured ? 'Download file' : 'File not configured')}</div>
                          </td>
                          <td className="px-4 py-3.5"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-600 capitalize ${item.status === 'available' ? 'bg-success/10 text-success' : item.status === 'revoked' ? 'bg-danger/10 text-danger' : 'bg-secondary text-muted-foreground'}`}>{item.status}</span></td>
                          <td className="px-4 py-3.5 text-xs font-700 text-foreground">{item.download_count}</td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">{item.last_downloaded_at ? new Date(item.last_downloaded_at).toLocaleString() : '—'}</td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">{item.expires_at ? new Date(item.expires_at).toLocaleDateString() : 'No expiry'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/20">
            <span className="text-xs text-muted-foreground">Page {Math.min(page + 1, totalPages)} of {totalPages}</span>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0 || loading} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30" aria-label="Previous page"><ChevronLeft size={14} /></button>
              <button type="button" onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))} disabled={page + 1 >= totalPages || loading} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30" aria-label="Next page"><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
