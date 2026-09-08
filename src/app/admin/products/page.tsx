'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Archive, Eye, EyeOff, X, Search, Check } from 'lucide-react';
import PricingManager from './PricingManager';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_desc: string;
  category: string;
  status: string;
  thumbnail_url: string;
  demo_url: string;
  tags: string[];
  created_at: string;
}

const CATEGORIES = ['ai_tool', 'template', 'dataset', 'api', 'plugin', 'course', 'other'];
const STATUSES = ['active', 'draft', 'archived'];

const statusColors: Record<string, string> = {
  active: 'bg-success/10 text-success',
  draft: 'bg-warning/10 text-warning',
  archived: 'bg-muted text-muted-foreground',
};

async function adminProductsRequest(body: Record<string, unknown>) {
  const response = await fetch('/api/admin/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Product update failed.');
  return data;
}

function ProductModal({
  product,
  onClose,
  onSave,
}: {
  product: Partial<Product> | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!product?.id;
  const [form, setForm] = useState({
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    description: product?.description ?? '',
    short_desc: product?.short_desc ?? '',
    category: product?.category ?? 'other',
    status: product?.status ?? 'draft',
    thumbnail_url: product?.thumbnail_url ?? '',
    demo_url: product?.demo_url ?? '',
    tags: (product?.tags ?? []).join(', '),
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === 'name' && !isEdit) {
      setForm((current) => ({
        ...current,
        slug: value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      }));
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }

    setSaving(true);
    try {
      await adminProductsRequest({
        action: 'save_product',
        id: isEdit ? product?.id : undefined,
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        short_desc: form.short_desc.trim(),
        category: form.category,
        status: form.status,
        thumbnail_url: form.thumbnail_url.trim(),
        demo_url: form.demo_url.trim(),
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      toast.success(isEdit ? 'Product updated' : 'Product created');
      onSave();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Could not save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto modal-overlay px-4 py-6 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-3xl max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-border bg-card p-5">
          <h2 className="text-base font-700 text-foreground">{isEdit ? 'Edit Product' : 'New Product'}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label htmlFor="product-name" className="mb-1.5 block text-xs font-700 text-foreground">
              Product Name
            </label>
            <input
              id="product-name"
              type="text"
              value={form.name}
              onChange={(event) => handleChange('name', event.target.value)}
              placeholder="Enter product name"
              autoComplete="off"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {(['slug', 'short_desc'] as const).map((field) => (
            <div key={field}>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5 capitalize">
                {field.replace('_', ' ')}
              </label>
              <input
                type="text"
                value={form[field]}
                onChange={(event) => handleChange(field, event.target.value)}
                className="w-full px-3 py-2.5 text-sm text-foreground bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-600 text-muted-foreground mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(event) => handleChange('description', event.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm text-foreground bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(event) => handleChange('category', event.target.value)}
                className="w-full px-3 py-2.5 text-sm text-foreground bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-600 text-muted-foreground mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(event) => handleChange('status', event.target.value)}
                className="w-full px-3 py-2.5 text-sm text-foreground bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-600 text-muted-foreground mb-1.5">Thumbnail URL</label>
            <input
              type="text"
              value={form.thumbnail_url}
              onChange={(event) => handleChange('thumbnail_url', event.target.value)}
              className="w-full px-3 py-2.5 text-sm text-foreground bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-600 text-muted-foreground mb-1.5">Demo URL</label>
            <input
              type="text"
              value={form.demo_url}
              onChange={(event) => handleChange('demo_url', event.target.value)}
              className="w-full px-3 py-2.5 text-sm text-foreground bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-600 text-muted-foreground mb-1.5">Tags (comma-separated)</label>
            <input
              type="text"
              value={form.tags}
              onChange={(event) => handleChange('tags', event.target.value)}
              placeholder="ai, writing, content"
              className="w-full px-3 py-2.5 text-sm text-foreground bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {isEdit && product?.id ? (
            <PricingManager productId={product.id} />
          ) : (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-800 text-foreground">Pricing</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Create the product first, then reopen it to add one-time, monthly, yearly, lifetime, sale pricing and coupons.
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-border bg-card p-5">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {isEdit ? 'Save Product Details' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editProduct, setEditProduct] = useState<Partial<Product> | null | undefined>(undefined);
  const [confirmArchive, setConfirmArchive] = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const url = `/api/admin/products${params.size ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load products.');
      setProducts(data.products ?? []);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load products.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateStatus = async (product: Product, status: string, successMessage: string) => {
    try {
      await adminProductsRequest({ action: 'update_status', id: product.id, status });
      toast.success(successMessage);
      await fetchProducts();
    } catch (error: any) {
      toast.error(error?.message || 'Could not update product status.');
    }
  };

  const handleArchive = async (product: Product) => {
    const newStatus = product.status === 'archived' ? 'draft' : 'archived';
    await updateStatus(product, newStatus, `Product ${newStatus}`);
    setConfirmArchive(null);
  };

  const handleTogglePublish = async (product: Product) => {
    const newStatus = product.status === 'active' ? 'draft' : 'active';
    await updateStatus(
      product,
      newStatus,
      `Product ${newStatus === 'active' ? 'published' : 'unpublished'}`,
    );
  };

  const filtered = products.filter(
    (product) =>
      !search ||
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.slug.includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-800 text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{products.length} products</p>
        </div>
        <button onClick={() => setEditProduct({})} className="btn-primary flex items-center gap-2">
          <Plus size={15} />New Product
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="px-3 py-2.5 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-muted-foreground uppercase tracking-wide">Created</th>
                <th className="px-4 py-3 text-right text-xs font-700 text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={index} className="border-b border-border">
                    {Array.from({ length: 5 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3">
                        <div className="h-4 rounded shimmer w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">No products found</td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr key={product.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.thumbnail_url && (
                          <img
                            src={product.thumbnail_url}
                            alt={product.name}
                            className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div>
                          <div className="font-600 text-foreground text-xs">{product.name}</div>
                          <div className="text-xs text-muted-foreground">{product.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                      {product.category.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-600 ${statusColors[product.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(product.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleTogglePublish(product)}
                          title={product.status === 'active' ? 'Unpublish' : 'Publish'}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                        >
                          {product.status === 'active' ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button
                          onClick={() => setEditProduct(product)}
                          title="Edit product and pricing"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => setConfirmArchive(product)}
                          title="Archive"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-warning hover:bg-warning/10 transition-all"
                        >
                          <Archive size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
          <div className="bg-card rounded-2xl border border-border w-full max-w-sm p-6">
            <h3 className="text-base font-700 text-foreground mb-2">
              {confirmArchive.status === 'archived' ? 'Unarchive' : 'Archive'} Product?
            </h3>
            <p className="text-sm text-muted-foreground mb-5">
              &quot;{confirmArchive.name}&quot; will be {confirmArchive.status === 'archived' ? 'restored to draft' : 'archived and hidden from the store'}.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmArchive(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleArchive(confirmArchive)} className="btn-primary flex-1">
                {confirmArchive.status === 'archived' ? 'Unarchive' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editProduct !== undefined && (
        <ProductModal
          product={editProduct}
          onClose={() => setEditProduct(undefined)}
          onSave={fetchProducts}
        />
      )}
    </div>
  );
}
