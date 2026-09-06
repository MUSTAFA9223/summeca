'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/client';
import { trackSearch } from '@/lib/analytics';
import {
  Star, SlidersHorizontal, Search, Zap, LayoutDashboard, FileText, X,
  ArrowUpDown, Package, Sparkles, TrendingUp, Clock, Award, ChevronDown,
  Filter, Brain, Loader2, GitCompare,
} from 'lucide-react';
import WishlistButton from '@/components/WishlistButton';

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

type FilterType = 'all' | 'ai' | 'saas' | 'digital';
type SortType = 'featured' | 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'best_sellers';
type PriceRange = 'all' | 'free' | 'under_10' | 'under_50' | 'over_50';

// ─── Constants ────────────────────────────────────────────────────────────────

const AI_CATEGORIES = ['ai_tool', 'api', 'plugin'];
const SAAS_CATEGORIES = ['course', 'other'];
const DIGITAL_CATEGORIES = ['template', 'dataset'];

const FILTER_TABS: { key: FilterType; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'all', label: 'All Products', icon: Package },
  { key: 'ai', label: 'AI Tools', icon: Zap },
  { key: 'saas', label: 'SaaS Apps', icon: LayoutDashboard },
  { key: 'digital', label: 'Digital Products', icon: FileText },
];

const SORT_OPTIONS: { key: SortType; label: string; icon: React.ComponentType<any> }[] = [
  { key: 'featured', label: 'Featured', icon: Award },
  { key: 'newest', label: 'Newest', icon: Clock },
  { key: 'popular', label: 'Most Popular', icon: TrendingUp },
  { key: 'best_sellers', label: 'Best Sellers', icon: Star },
  { key: 'price_asc', label: 'Price: Low to High', icon: ArrowUpDown },
  { key: 'price_desc', label: 'Price: High to Low', icon: ArrowUpDown },
];

const PRICE_RANGES: { key: PriceRange; label: string }[] = [
  { key: 'all', label: 'Any Price' },
  { key: 'free', label: 'Free' },
  { key: 'under_10', label: 'Under $10' },
  { key: 'under_50', label: 'Under $50' },
  { key: 'over_50', label: '$50+' },
];

const TYPE_GRADIENT: Record<string, string> = {
  ai: 'bg-gradient-card-ai',
  saas: 'bg-gradient-card-saas',
  digital: 'bg-gradient-card-digital',
  other: 'bg-card',
};

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  ai_tool: { label: 'AI Tool', cls: 'bg-primary/10 text-primary' },
  api: { label: 'API', cls: 'bg-primary/10 text-primary' },
  plugin: { label: 'Plugin', cls: 'bg-accent/10 text-accent' },
  template: { label: 'Template', cls: 'bg-warning/10 text-warning' },
  dataset: { label: 'Dataset', cls: 'bg-info/10 text-info' },
  course: { label: 'Course', cls: 'bg-success/10 text-success' },
  other: { label: 'SaaS', cls: 'bg-secondary text-secondary-foreground' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getProductType(category: string): FilterType {
  if (AI_CATEGORIES.includes(category)) return 'ai';
  if (DIGITAL_CATEGORIES.includes(category)) return 'digital';
  return 'saas';
}

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

function matchesPriceRange(product: Product, range: PriceRange): boolean {
  if (range === 'all') return true;
  const price = getLowestPrice(product.plans);
  if (range === 'free') return price === null || price === 0;
  if (range === 'under_10') return price !== null && price > 0 && price < 10;
  if (range === 'under_50') return price !== null && price > 0 && price < 50;
  if (range === 'over_50') return price !== null && price >= 50;
  return true;
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

function ProductCard({ product, isRecommended, wishlistIds, onCompare }: {
  product: Product;
  isRecommended?: boolean;
  wishlistIds?: string[];
  onCompare?: (product: Product) => void;
}) {
  const type = getProductType(product.category);
  const lowestPrice = getLowestPrice(product.plans);
  const badge = TYPE_BADGE[product.category] ?? { label: 'Product', cls: 'bg-secondary text-secondary-foreground' };
  const gradient = TYPE_GRADIENT[type] ?? 'bg-card';
  const CategoryIcon = type === 'ai' ? Zap : type === 'digital' ? FileText : LayoutDashboard;

  return (
    <div className={`group rounded-2xl border border-border p-5 card-hover relative ${gradient}`}>
      {isRecommended && (
        <div className="absolute -top-2 -right-2 bg-gradient-teal text-white text-[10px] font-700 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
          <Brain size={9} /> AI Pick
        </div>
      )}
      {isFeatured(product) && !isRecommended && (
        <div className="absolute -top-2 -right-2 bg-warning text-white text-[10px] font-700 px-2 py-0.5 rounded-full shadow-sm">
          Featured
        </div>
      )}

      {/* Wishlist button */}
      <div className="absolute top-3 right-3">
        <WishlistButton
          productId={product.id}
          productName={product.name}
          initialWishlisted={wishlistIds?.includes(product.id) ?? false}
          size="sm"
        />
      </div>

      <Link href={`/products/${product.slug}`} className="block">
        <div className="flex items-start justify-between mb-4 pr-8">
          <div className="w-11 h-11 rounded-xl bg-white shadow-card flex items-center justify-center flex-shrink-0">
            {product.thumbnail_url ? (
              <img
                src={product.thumbnail_url}
                alt={`${product.name} thumbnail`}
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const sibling = e.currentTarget.nextSibling as HTMLElement | null;
                  if (sibling) sibling.removeAttribute('style');
                }}
              />
            ) : null}
            <CategoryIcon size={20} className="text-primary" style={product.thumbnail_url ? { display: 'none' } : {}} />
          </div>
          <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
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
          <div className="flex items-center gap-1.5 mb-3">
            <Star size={12} className="text-warning fill-warning" />
            <span className="text-xs font-600 text-foreground">{product.avg_rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({product.review_count ?? 0})</span>
          </div>
        ) : (
          <div className="mb-3 h-4" />
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

      {/* Compare button */}
      {onCompare && (
        <button
          onClick={() => onCompare(product)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-600 text-muted-foreground hover:text-primary border border-border hover:border-primary/40 rounded-lg py-1.5 transition-all duration-200"
        >
          <GitCompare size={11} />
          Compare
        </button>
      )}
    </div>
  );
}

// ─── Search Suggestions ───────────────────────────────────────────────────────

function SearchSuggestions({ products, query, onSelect }: {
  products: Product[];
  query: string;
  onSelect: (val: string) => void;
}) {
  if (!query || query.length < 2) return null;
  const q = query.toLowerCase();
  const suggestions = products
    .filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.tags ?? []).some((t) => t.toLowerCase().includes(q))
    )
    .slice(0, 5);

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-card-lg z-50 overflow-hidden">
      {suggestions.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.name)}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left"
        >
          <Search size={12} className="text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-foreground">{p.name}</span>
          <span className="text-xs text-muted-foreground ml-auto">{TYPE_BADGE[p.category]?.label ?? 'Product'}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('featured');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOpen, setSortOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<PriceRange>('all');
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [semanticSearchIds, setSemanticSearchIds] = useState<string[] | null>(null);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const semanticDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      // Fetch AI recommendations on load
      fetchRecommendations();
      // Fetch wishlist IDs
      fetchWishlistIds();
    } catch (err) {
      setError('Failed to load products. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWishlistIds = async () => {
    try {
      const res = await fetch('/api/wishlist/toggle');
      if (res.ok) {
        const data = await res.json() as { wishlistIds: string[] };
        setWishlistIds(data.wishlistIds ?? []);
      }
    } catch {
      // Silently fail
    }
  };

  const handleCompare = (product: Product) => {
    setCompareList((prev) => {
      if (prev.find((p) => p.id === product.id)) return prev;
      if (prev.length >= 4) return prev;
      return [...prev, product];
    });
  };

  const fetchRecommendations = async () => {
    try {
      const res = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json() as { recommendations: Product[] };
        setRecommendedIds((data.recommendations ?? []).map((p) => p.id));
      }
    } catch {
      // Silently fail — recommendations are optional
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Debounce search input
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [search]);

  // Semantic search when query is long enough
  useEffect(() => {
    if (semanticDebounceRef.current) clearTimeout(semanticDebounceRef.current);
    if (debouncedSearch.length >= 3) {
      semanticDebounceRef.current = setTimeout(async () => {
        setSemanticLoading(true);
        try {
          const res = await fetch('/api/ai/semantic-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: debouncedSearch }),
          });
          if (res.ok) {
            const data = await res.json() as { matchedIds: string[] };
            setSemanticSearchIds(data.matchedIds ?? null);
            trackSearch(debouncedSearch, data.matchedIds?.length ?? 0);
          }
        } catch {
          setSemanticSearchIds(null);
        } finally {
          setSemanticLoading(false);
        }
      }, 600);
    } else {
      setSemanticSearchIds(null);
      setSemanticLoading(false);
    }
    return () => {
      if (semanticDebounceRef.current) clearTimeout(semanticDebounceRef.current);
    };
  }, [debouncedSearch]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Filter + Sort ──────────────────────────────────────────────────────────

  const filtered = products.filter((p) => {
    const matchesType = filter === 'all' || getProductType(p.category) === filter;
    const matchesPrice = matchesPriceRange(p, priceRange);

    if (semanticSearchIds !== null && debouncedSearch.length >= 3) {
      return matchesType && matchesPrice && semanticSearchIds.includes(p.id);
    }

    const q = debouncedSearch.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.short_desc ?? '').toLowerCase().includes(q) ||
      (p.tags ?? []).some((t) => t.toLowerCase().includes(q));

    return matchesType && matchesPrice && matchesSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'featured') {
      const af = isFeatured(a) ? 1 : 0;
      const bf = isFeatured(b) ? 1 : 0;
      if (bf !== af) return bf - af;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sort === 'popular') return (b.review_count ?? 0) - (a.review_count ?? 0);
    if (sort === 'best_sellers') return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
    const ap = getLowestPrice(a.plans) ?? 0;
    const bp = getLowestPrice(b.plans) ?? 0;
    return sort === 'price_asc' ? ap - bp : bp - ap;
  });

  const currentSortLabel = SORT_OPTIONS.find((s) => s.key === sort)?.label ?? 'Sort';
  const hasActiveFilters = filter !== 'all' || priceRange !== 'all' || !!debouncedSearch;
  const recommendedProducts = products.filter((p) => recommendedIds.includes(p.id));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNav />

      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
      <section className="pt-24 pb-10 bg-gradient-hero border-b border-border">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-700 uppercase tracking-widest text-primary mb-3">Marketplace</p>
            <h1 className="text-4xl font-800 text-foreground mb-3 leading-tight">
              Discover{' '}
              <span className="text-gradient-primary">powerful tools</span>{' '}
              for every workflow
            </h1>
            <p className="text-base text-secondary-foreground leading-relaxed mb-6">
              Browse AI tools, SaaS apps, and digital products — all in one place.
            </p>
            {/* Hero search bar */}
            <div ref={searchRef} className="relative max-w-lg">
              <div className="flex items-center gap-2 bg-white border border-border rounded-2xl px-4 py-3 shadow-card focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
                {semanticLoading ? (
                  <Loader2 size={16} className="text-primary animate-spin flex-shrink-0" />
                ) : (
                  <Search size={16} className="text-muted-foreground flex-shrink-0" />
                )}
                <input
                  type="text"
                  placeholder="Search by name, category, or features..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
                />
                {search && (
                  <button onClick={() => { setSearch(''); setDebouncedSearch(''); setSemanticSearchIds(null); }} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X size={14} />
                  </button>
                )}
                {debouncedSearch.length >= 3 && (
                  <span className="text-[10px] font-600 bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                    <Brain size={9} /> AI
                  </span>
                )}
              </div>
              {showSuggestions && (
                <SearchSuggestions
                  products={products}
                  query={search}
                  onSelect={(val) => { setSearch(val); setShowSuggestions(false); }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── AI Recommendations Strip ─────────────────────────────────────── */}
      {recommendedProducts.length > 0 && !debouncedSearch && (
        <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b border-primary/10">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-gradient-teal flex items-center justify-center">
                <Brain size={13} className="text-white" />
              </div>
              <span className="text-sm font-700 text-foreground">AI Recommendations for You</span>
              <span className="text-xs text-muted-foreground">Based on trending products</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recommendedProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} isRecommended />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Filters + Search Bar ─────────────────────────────────────────── */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
            {/* Type filter tabs */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {FILTER_TABS.map(({ key, label, icon }) => {
                const TabIcon = icon;
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 transition-all duration-150 ${
                      filter === key
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-secondary-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <TabIcon size={13} />
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{key === 'all' ? 'All' : label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1" />

            {/* Advanced Filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-600 transition-all duration-150 ${
                showFilters || priceRange !== 'all' ?'border-primary bg-primary/5 text-primary' :'border-border text-secondary-foreground hover:text-foreground hover:border-primary/40'
              }`}
            >
              <Filter size={13} />
              Filters
              {priceRange !== 'all' && (
                <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center">1</span>
              )}
            </button>

            {/* Sort dropdown */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-600 text-secondary-foreground hover:text-foreground hover:border-primary/40 transition-all duration-150 bg-white"
              >
                <ArrowUpDown size={13} />
                <span>{currentSortLabel}</span>
                <ChevronDown size={11} className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-xl shadow-card-lg p-1.5 z-50 fade-in">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setSort(opt.key); setSortOpen(false); }}
                      className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-xs font-500 transition-all duration-150 ${
                        sort === opt.key
                          ? 'bg-primary/10 text-primary font-600' :'text-secondary-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      <opt.icon size={12} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="pb-3 border-t border-border pt-3 fade-in">
              <div className="flex flex-wrap gap-4">
                {/* Price Range */}
                <div>
                  <p className="text-xs font-700 text-muted-foreground uppercase tracking-wide mb-2">Price Range</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRICE_RANGES.map((range) => (
                      <button
                        key={range.key}
                        onClick={() => setPriceRange(range.key)}
                        className={`px-3 py-1 rounded-lg text-xs font-600 transition-all duration-150 ${
                          priceRange === range.key
                            ? 'bg-primary text-white' :'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:text-foreground border border-border'
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick filters */}
                <div>
                  <p className="text-xs font-700 text-muted-foreground uppercase tracking-wide mb-2">Quick Filters</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSort('newest')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-600 transition-all duration-150 ${
                        sort === 'newest' ? 'bg-primary text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border'
                      }`}
                    >
                      <Clock size={11} /> New Arrivals
                    </button>
                    <button
                      onClick={() => setSort('popular')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-600 transition-all duration-150 ${
                        sort === 'popular' ? 'bg-primary text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border'
                      }`}
                    >
                      <TrendingUp size={11} /> Popular
                    </button>
                    <button
                      onClick={() => setSort('best_sellers')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-600 transition-all duration-150 ${
                        sort === 'best_sellers' ? 'bg-primary text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border'
                      }`}
                    >
                      <Star size={11} /> Best Sellers
                    </button>
                    <button
                      onClick={() => setSort('featured')}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-600 transition-all duration-150 ${
                        sort === 'featured' ? 'bg-primary text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border'
                      }`}
                    >
                      <Award size={11} /> Featured
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-screen-xl mx-auto px-6 lg:px-8 py-10 w-full">
        {/* Result count + semantic search indicator */}
        {!loading && !error && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {sorted.length === 0
                  ? 'No products found'
                  : `${sorted.length} product${sorted.length !== 1 ? 's' : ''} found`}
                {filter !== 'all' && (
                  <span className="ml-1">
                    in <span className="font-600 text-foreground">{FILTER_TABS.find((f) => f.key === filter)?.label}</span>
                  </span>
                )}
              </p>
              {semanticSearchIds !== null && debouncedSearch.length >= 3 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1 font-600">
                  <Sparkles size={10} /> AI Search Active
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <button
                onClick={() => { setFilter('all'); setSearch(''); setDebouncedSearch(''); setPriceRange('all'); setSemanticSearchIds(null); }}
                className="text-xs font-600 text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                <X size={12} /> Clear all
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
            <button onClick={fetchProducts} className="btn-primary mt-4 text-sm px-5 py-2">Retry</button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <SlidersHorizontal size={24} className="text-muted-foreground" />
            </div>
            <p className="text-base font-600 text-foreground mb-1">No products match your filters</p>
            <p className="text-sm text-muted-foreground mb-5">Try adjusting your search or clearing the active filters.</p>
            <button
              onClick={() => { setFilter('all'); setSearch(''); setDebouncedSearch(''); setPriceRange('all'); setSemanticSearchIds(null); }}
              className="btn-secondary text-sm px-5 py-2"
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {sorted.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isRecommended={recommendedIds.includes(product.id) && !debouncedSearch}
                wishlistIds={wishlistIds}
                onCompare={handleCompare}
              />
            ))}
          </div>
        )}
      </main>

      <PublicFooter />

      {/* Compare floating bar */}
      {compareList.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl border border-primary/30 shadow-xl px-5 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <GitCompare size={16} className="text-primary" />
            <span className="text-sm font-700 text-foreground">{compareList.length} products selected</span>
          </div>
          <div className="flex items-center gap-2">
            {compareList.map((p) => (
              <span key={p.id} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-600 flex items-center gap-1">
                {p.name.slice(0, 12)}{p.name.length > 12 ? '…' : ''}
                <button onClick={() => setCompareList((prev) => prev.filter((x) => x.id !== p.id))} className="hover:text-red-500 transition-colors">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <Link
            href={`/compare`}
            className="bg-primary text-white text-xs font-700 px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            <GitCompare size={12} /> Compare Now
          </Link>
          <button onClick={() => setCompareList([])} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      {sortOpen && <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />}
    </div>
  );
}
