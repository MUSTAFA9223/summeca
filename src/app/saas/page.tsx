'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/client';
import {
  Star,
  SlidersHorizontal,
  Search,
  LayoutDashboard,
  X,
  ArrowUpDown,
  Package,
  Sparkles,
  Cloud,
  Users,
  BarChart2,
  ArrowRight,
} from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductPlan {
  price: number;
  billing_period: string;
  is_active: boolean;
  sort_order: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  short_desc: string;
  description: string;
  category: string;
  status: string;
  thumbnail_url: string;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  plans?: ProductPlan[];
  avg_rating?: number;
  review_count?: number;
}

type SortType = 'featured' | 'newest' | 'price_asc' | 'price_desc';

// ─── Constants ────────────────────────────────────────────────────────────────

const SAAS_CATEGORIES = ['course', 'other'];

const SORT_OPTIONS: { key: SortType; label: string }[] = [
  { key: 'featured', label: 'Featured' },
  { key: 'newest', label: 'Newest' },
  { key: 'price_asc', label: 'Price: Low to High' },
  { key: 'price_desc', label: 'Price: High to Low' },
];

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  course: { label: 'Course', cls: 'bg-success/10 text-success' },
  other: { label: 'SaaS', cls: 'bg-secondary text-secondary-foreground' },
};

const CATEGORY_FEATURES = [
  { icon: Cloud, title: 'Cloud-Native', desc: 'Scalable apps that run anywhere, accessible from any device' },
  { icon: Users, title: 'Team Collaboration', desc: 'Built for teams with real-time sync and shared workspaces' },
  { icon: BarChart2, title: 'Analytics & Insights', desc: 'Data-driven dashboards to track performance and growth' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLowestPrice(plans?: ProductPlan[]): number | null {
  if (!plans || plans.length === 0) return null;
  const active = plans.filter((p) => p.is_active);
  if (active.length === 0) return null;
  return Math.min(...active.map((p) => p.price));
}

function formatPrice(price: number | null): string {
  if (price === null) return 'Free';
  if (price === 0) return 'Free';
  return `$${price % 1 === 0 ? price : price.toFixed(2)}`;
}

function isFeatured(product: Product): boolean {
  return !!(product.metadata?.featured || product.metadata?.is_featured);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl shimmer" />
        <div className="w-16 h-5 rounded-full shimmer" />
      </div>
      <div className="w-3/4 h-4 rounded shimmer" />
      <div className="space-y-1.5">
        <div className="w-full h-3 rounded shimmer" />
        <div className="w-5/6 h-3 rounded shimmer" />
        <div className="w-2/3 h-3 rounded shimmer" />
      </div>
      <div className="w-24 h-3 rounded shimmer" />
      <div className="flex items-center justify-between pt-1">
        <div className="w-12 h-4 rounded shimmer" />
        <div className="w-14 h-4 rounded shimmer" />
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product, featured = false }: { product: Product; featured?: boolean }) {
  const lowestPrice = getLowestPrice(product.plans);
  const badge = TYPE_BADGE[product.category] ?? { label: 'SaaS', cls: 'bg-secondary text-secondary-foreground' };

  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group rounded-2xl border border-border p-5 card-hover cursor-pointer block bg-gradient-card-saas ${
        featured ? 'ring-2 ring-primary/30' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl bg-white shadow-card flex items-center justify-center flex-shrink-0">
          {product.thumbnail_url ? (
            <img
              src={product.thumbnail_url}
              alt={`${product.name} thumbnail`}
              className="w-full h-full object-cover rounded-xl"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                (e.currentTarget.nextSibling as HTMLElement)?.removeAttribute('style');
              }}
            />
          ) : null}
          <LayoutDashboard size={20} className="text-primary" style={product.thumbnail_url ? { display: 'none' } : {}} />
        </div>
        <div className="flex items-center gap-1.5">
          {featured && (
            <span className="text-xs font-600 px-2 py-0.5 rounded-full bg-warning/10 text-warning">
              Featured
            </span>
          )}
          <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${badge.cls}`}>
            {badge.label}
          </span>
        </div>
      </div>

      <h3 className="text-sm font-700 text-foreground mb-1.5 group-hover:text-primary transition-colors line-clamp-1">
        {product.name}
      </h3>
      <p className="text-xs text-secondary-foreground leading-relaxed mb-4 line-clamp-3">
        {product.short_desc || product.description || 'No description available.'}
      </p>

      {product.tags && product.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {product.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-white/70 text-muted-foreground border border-border/60">
              {tag}
            </span>
          ))}
        </div>
      )}

      {product.avg_rating !== undefined && product.avg_rating > 0 ? (
        <div className="flex items-center gap-1.5 mb-4">
          <Star size={12} className="text-warning fill-warning" />
          <span className="text-xs font-600 text-foreground">{product.avg_rating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({product.review_count ?? 0})</span>
        </div>
      ) : (
        <div className="mb-4 h-4" />
      )}

      <div className="flex items-center justify-between">
        <div>
          {lowestPrice === 0 || lowestPrice === null ? (
            <span className="text-sm font-700 text-success">Free</span>
          ) : (
            <span className="text-sm font-700 text-foreground tabular-nums">
              {formatPrice(lowestPrice)}
              <span className="text-xs font-400 text-muted-foreground">/mo</span>
            </span>
          )}
        </div>
        <span className="text-xs font-600 text-primary group-hover:underline">
          {lowestPrice === 0 || lowestPrice === null ? 'Try Free →' : 'View →'}
        </span>
      </div>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SaasPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortType>('featured');
  const [search, setSearch] = useState('');
  const [sortOpen, setSortOpen] = useState(false);

  const supabase = createClient();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id, name, slug, short_desc, description, category, status,
          thumbnail_url, tags, metadata, created_at,
          plans:product_plans(price, billing_period, is_active, sort_order)
        `)
        .eq('status', 'active')
        .in('category', SAAS_CATEGORIES)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('product_id, rating');

      const ratingMap: Record<string, { sum: number; count: number }> = {};
      if (reviewsData) {
        for (const r of reviewsData) {
          if (!ratingMap[r.product_id]) ratingMap[r.product_id] = { sum: 0, count: 0 };
          ratingMap[r.product_id].sum += r.rating;
          ratingMap[r.product_id].count += 1;
        }
      }

      const enriched: Product[] = (productsData ?? []).map((p) => ({
        ...p,
        avg_rating: ratingMap[p.id] ? ratingMap[p.id].sum / ratingMap[p.id].count : 0,
        review_count: ratingMap[p.id]?.count ?? 0,
      }));

      setProducts(enriched);
    } catch (err) {
      setError('Failed to load SaaS apps. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const featuredProducts = products.filter(isFeatured).slice(0, 3);

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.short_desc ?? '').toLowerCase().includes(q) ||
      (p.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'featured') {
      const af = isFeatured(a) ? 1 : 0;
      const bf = isFeatured(b) ? 1 : 0;
      if (bf !== af) return bf - af;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sort === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    const ap = getLowestPrice(a.plans) ?? 0;
    const bp = getLowestPrice(b.plans) ?? 0;
    return sort === 'price_asc' ? ap - bp : bp - ap;
  });

  const currentSortLabel = SORT_OPTIONS.find((s) => s.key === sort)?.label ?? 'Sort';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-14 bg-gradient-hero border-b border-border relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 right-20 w-72 h-72 rounded-full bg-accent/5 blur-3xl" />
          <div className="absolute bottom-0 left-10 w-48 h-48 rounded-full bg-primary/5 blur-2xl" />
        </div>
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8 relative">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-foreground transition-colors">Products</Link>
            <span>/</span>
            <span className="text-foreground font-600">SaaS Apps</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-4">
                <LayoutDashboard size={13} className="text-accent" />
                <span className="text-xs font-700 text-accent uppercase tracking-widest">SaaS Apps</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-800 text-foreground mb-4 leading-tight">
                Cloud apps built for{' '}
                <span className="text-gradient-primary">modern teams</span>
              </h1>
              <p className="text-base text-secondary-foreground leading-relaxed max-w-xl">
                Explore subscription-based software and online courses designed to streamline your operations, grow your skills, and scale your business.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:min-w-[260px]">
              {CATEGORY_FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-center gap-3 bg-white/60 backdrop-blur-sm border border-border rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-accent" />
                  </div>
                  <div>
                    <div className="text-xs font-700 text-foreground">{title}</div>
                    <div className="text-xs text-muted-foreground leading-snug">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Picks ───────────────────────────────────────────────── */}
      {!loading && featuredProducts.length > 0 && (
        <section className="py-10 border-b border-border bg-white/50">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-warning" />
                <h2 className="text-base font-700 text-foreground">Featured Picks</h2>
              </div>
              <Link href="/products?filter=saas" className="text-xs font-600 text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} featured />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Filter + Search Bar ──────────────────────────────────────────── */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
            <div className="flex items-center gap-2">
              <LayoutDashboard size={14} className="text-accent" />
              <span className="text-sm font-700 text-foreground">All SaaS Apps</span>
              {!loading && (
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {products.length}
                </span>
              )}
            </div>

            <div className="flex-1" />

            <div className="relative flex-1 sm:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search SaaS apps..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="relative flex-shrink-0">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-600 text-secondary-foreground hover:text-foreground hover:border-primary/40 transition-all duration-150 bg-white"
              >
                <ArrowUpDown size={13} />
                <span>{currentSortLabel}</span>
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-card-lg p-1.5 z-50 fade-in">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setSort(opt.key); setSortOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-500 transition-all duration-150 ${
                        sort === opt.key
                          ? 'bg-primary/10 text-primary font-600' :'text-secondary-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-screen-xl mx-auto px-6 lg:px-8 py-10 w-full">
        {!loading && !error && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              {sorted.length === 0
                ? 'No SaaS apps found'
                : `${sorted.length} SaaS app${sorted.length !== 1 ? 's' : ''} found`}
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-xs font-600 text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                <X size={12} /> Clear search
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mb-4">
              <Package size={24} className="text-danger" />
            </div>
            <p className="text-base font-600 text-foreground mb-1">{error}</p>
            <button onClick={fetchProducts} className="btn-primary mt-4 text-sm px-5 py-2">
              Retry
            </button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <SlidersHorizontal size={24} className="text-muted-foreground" />
            </div>
            <p className="text-base font-600 text-foreground mb-1">No SaaS apps match your search</p>
            <p className="text-sm text-muted-foreground mb-5">
              Try adjusting your search or browse all products.
            </p>
            <button onClick={() => setSearch('')} className="btn-secondary text-sm px-5 py-2">
              Clear search
            </button>
          </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {sorted.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      {/* ── Browse All CTA ───────────────────────────────────────────────── */}
      <section className="py-14 border-t border-border bg-gradient-hero">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-800 text-foreground mb-3">
            Explore more categories
          </h2>
          <p className="text-sm text-secondary-foreground mb-6 max-w-md mx-auto">
            Check out AI tools and digital products in our full marketplace.
          </p>
          <Link href="/products" className="btn-primary inline-flex items-center gap-2">
            Browse all products <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <PublicFooter />

      {sortOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
      )}
    </div>
  );
}
