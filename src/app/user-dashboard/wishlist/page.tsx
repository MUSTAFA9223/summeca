'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import WishlistButton from '@/components/WishlistButton';
import { AlertCircle, ArrowRight, FileText, Heart, LayoutDashboard, Loader2, Package, ShoppingCart, Star, Zap } from 'lucide-react';

type ProductPlan = {
  price: number;
  currency: string;
  billing_period: string;
  is_active: boolean;
  sort_order: number;
  sale_price: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
};

type WishlistProduct = {
  id: string;
  name: string;
  slug: string;
  short_desc: string;
  category: string;
  thumbnail_url: string;
  tags: string[];
  status: string;
  plans?: ProductPlan[];
};

type WishlistItem = {
  id: string;
  created_at: string;
  product_id: string;
  products: WishlistProduct | null;
};

type DisplayPlan = ProductPlan & { effectivePrice: number };

const TYPE_ICON: Record<string, React.ComponentType<any>> = {
  ai_tool: Zap,
  api: Zap,
  plugin: Zap,
  template: FileText,
  dataset: FileText,
  course: LayoutDashboard,
  other: LayoutDashboard,
};

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  ai_tool: { label: 'AI Tool', cls: 'bg-primary/10 text-primary' },
  api: { label: 'API', cls: 'bg-primary/10 text-primary' },
  plugin: { label: 'Plugin', cls: 'bg-accent/10 text-accent' },
  template: { label: 'Template', cls: 'bg-warning/10 text-warning' },
  dataset: { label: 'Dataset', cls: 'bg-info/10 text-info' },
  course: { label: 'Course', cls: 'bg-success/10 text-success' },
  other: { label: 'Product', cls: 'bg-secondary text-secondary-foreground' },
};

function saleIsActive(plan: ProductPlan) {
  if (plan.sale_price === null || plan.sale_price === undefined) return false;
  const now = Date.now();
  if (plan.sale_starts_at && new Date(plan.sale_starts_at).getTime() > now) return false;
  if (plan.sale_ends_at && new Date(plan.sale_ends_at).getTime() < now) return false;
  return Number(plan.sale_price) >= 0;
}

function chooseDisplayPlan(plans?: ProductPlan[]): DisplayPlan | null {
  const active = (plans ?? []).filter((plan) => plan.is_active);
  if (active.length === 0) return null;

  return active
    .map((plan) => ({
      ...plan,
      effectivePrice: saleIsActive(plan) ? Number(plan.sale_price) : Number(plan.price),
    }))
    .sort((a, b) => a.effectivePrice - b.effectivePrice || a.sort_order - b.sort_order)[0] ?? null;
}

function formatMoney(amount: number, currency: string) {
  if (amount === 0) return 'Free';
  const code = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

function billingSuffix(period: string) {
  switch (period) {
    case 'monthly': return '/month';
    case 'yearly': return '/year';
    case 'lifetime': return ' lifetime';
    case 'one_time': return ' one-time';
    default: return '';
  }
}

function WishlistCard({ item, onRemove }: { item: WishlistItem; onRemove: (id: string) => void }) {
  const product = item.products;
  if (!product) return null;

  const plan = chooseDisplayPlan(product.plans);
  const purchasable = product.status === 'active' && Boolean(plan);
  const badge = TYPE_BADGE[product.category] ?? TYPE_BADGE.other;
  const CategoryIcon = TYPE_ICON[product.category] ?? Package;

  return (
    <article className="group relative bg-card rounded-2xl border border-border p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
      <div className="absolute top-3 right-3">
        <WishlistButton
          productId={product.id}
          productName={product.name}
          initialWishlisted
          size="sm"
          onToggle={(wishlisted) => { if (!wishlisted) onRemove(item.id); }}
        />
      </div>

      <div className="flex items-start gap-3 mb-3 pr-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {product.thumbnail_url ? (
            <img
              src={product.thumbnail_url}
              alt=""
              className="w-full h-full object-cover"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <CategoryIcon size={22} className="text-primary" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
          <h2 className="text-sm font-700 text-foreground mt-1 group-hover:text-primary transition-colors line-clamp-1">{product.name}</h2>
        </div>
      </div>

      <p className="text-xs text-secondary-foreground leading-relaxed mb-4 line-clamp-2">
        {product.short_desc || 'No description available.'}
      </p>

      {product.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {product.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{tag}</span>
          ))}
        </div>
      )}

      <div className="flex items-end justify-between gap-3 pt-3 border-t border-border">
        <div>
          {plan ? (
            <>
              <div className={`text-sm font-700 ${plan.effectivePrice === 0 ? 'text-success' : 'text-foreground'} tabular-nums`}>
                {formatMoney(plan.effectivePrice, plan.currency)}
                {plan.effectivePrice > 0 && <span className="text-xs font-400 text-muted-foreground">{billingSuffix(plan.billing_period)}</span>}
              </div>
              {saleIsActive(plan) && Number(plan.price) > plan.effectivePrice && (
                <div className="text-xs text-muted-foreground line-through mt-0.5">{formatMoney(Number(plan.price), plan.currency)}</div>
              )}
            </>
          ) : (
            <span className="text-sm font-600 text-muted-foreground">Unavailable</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {purchasable && (
            <Link href={`/checkout?product=${encodeURIComponent(product.slug)}`} className="flex items-center gap-1.5 text-xs font-600 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
              <ShoppingCart size={11} aria-hidden="true" /> Get Now
            </Link>
          )}
          <Link href={`/products/${product.slug}`} className="text-xs font-600 text-primary hover:underline flex items-center gap-1">
            View <ArrowRight size={10} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/wishlist/items', { cache: 'no-store' });
      const text = await response.text();
      let data: { items?: WishlistItem[]; error?: string } = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
      if (!response.ok) throw new Error(data.error || `Could not load wishlist (${response.status}).`);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setItems([]);
      setError(error instanceof Error ? error.message : 'Could not load your wishlist.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchWishlist();
  }, [fetchWishlist]);

  const visibleItems = useMemo(() => items.filter((item) => Boolean(item.products)), [items]);

  if (authLoading) {
    return (
      <DashboardLayout activeRoute="wishlist">
        <div className="flex items-center justify-center h-64"><Loader2 size={28} className="animate-spin text-primary" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeRoute="wishlist">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-danger/10 flex items-center justify-center"><Heart size={16} className="text-danger" aria-hidden="true" /></div>
              <h1 className="text-2xl font-800 text-foreground">My Wishlist</h1>
            </div>
            <p className="text-sm text-secondary-foreground">
              {visibleItems.length > 0 ? `${visibleItems.length} saved product${visibleItems.length === 1 ? '' : 's'}` : 'Save products you want to revisit later'}
            </p>
          </div>
          <Link href="/products" className="flex items-center gap-1.5 text-sm font-600 text-primary hover:text-primary/80">Browse Products <ArrowRight size={14} /></Link>
        </div>

        {loading && <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin text-primary" /></div>}

        {!loading && error && (
          <div className="rounded-2xl border border-danger/20 bg-danger/5 p-8 text-center">
            <AlertCircle size={28} className="text-danger mx-auto mb-3" />
            <h2 className="text-base font-700 text-foreground">Could not load wishlist</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{error}</p>
            <button type="button" onClick={() => void fetchWishlist()} className="btn-primary text-sm">Try again</button>
          </div>
        )}

        {!loading && !error && visibleItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-danger/5 flex items-center justify-center mb-5 border border-danger/10"><Heart size={34} className="text-danger/40" /></div>
            <h2 className="text-xl font-700 text-foreground mb-2">Your wishlist is empty</h2>
            <p className="text-sm text-secondary-foreground mb-6 max-w-xs">Browse SUMMECA products and use the heart button to save items for later.</p>
            <Link href="/products" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-600 text-sm"><Star size={14} /> Explore Products</Link>
          </div>
        )}

        {!loading && !error && visibleItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleItems.map((item) => <WishlistCard key={item.id} item={item} onRemove={(itemId) => setItems((current) => current.filter((entry) => entry.id !== itemId))} />)}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
