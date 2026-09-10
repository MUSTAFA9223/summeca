'use client';

import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, LayoutDashboard, Package, Search, Star, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getEffectivePrice } from '@/lib/pricing';

type BillingPeriod = 'one_time' | 'monthly' | 'yearly' | 'lifetime';
type CatalogKind = 'all' | 'ai' | 'saas' | 'digital';
type SortMode = 'featured' | 'newest' | 'price_asc' | 'price_desc';

interface ProductPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billing_period: BillingPeriod;
  is_active: boolean;
  sort_order: number;
  sale_price: number | null;
  sale_discount_type: 'percentage' | 'fixed_amount' | null;
  sale_discount_value: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  short_desc: string | null;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  tags: string[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  plans?: ProductPlan[];
  avg_rating?: number;
  review_count?: number;
}

interface CatalogClientProps {
  kind?: CatalogKind;
  title: string;
  description: string;
  eyebrow?: string;
}

const AI_CATEGORIES = ['ai_tool', 'api', 'plugin'];
const DIGITAL_CATEGORIES = ['template', 'dataset'];

const CATEGORY_LABELS: Record<string, string> = {
  ai_tool: 'AI Tool',
  api: 'API',
  plugin: 'Plugin',
  template: 'Template',
  dataset: 'Dataset',
  course: 'Course',
  other: 'SaaS',
};

function kindForCategory(category: string): Exclude<CatalogKind, 'all'> {
  if (AI_CATEGORIES.includes(category)) return 'ai';
  if (DIGITAL_CATEGORIES.includes(category)) return 'digital';
  return 'saas';
}

function pricingFor(plan: ProductPlan) {
  try {
    return getEffectivePrice(plan);
  } catch {
    const regularPrice = Number(plan.price) || 0;
    return {
      regularPrice,
      salePrice: null,
      finalPrice: regularPrice,
      discountAmount: 0,
      discountPercent: 0,
      onSale: false,
    };
  }
}

function lowestPlan(plans?: ProductPlan[]) {
  const active = (plans ?? []).filter((plan) => plan.is_active);
  if (!active.length) return null;
  return active.reduce((lowest, plan) =>
    pricingFor(plan).finalPrice < pricingFor(lowest).finalPrice ? plan : lowest,
  );
}

function money(value: number, currency: string) {
  if (value === 0) return 'Free';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency || 'USD'} ${value % 1 === 0 ? value : value.toFixed(2)}`;
  }
}

function billingSuffix(period: BillingPeriod) {
  if (period === 'monthly') return '/mo';
  if (period === 'yearly') return '/yr';
  if (period === 'lifetime') return ' lifetime';
  return '';
}

function isFeatured(product: Product) {
  return Boolean(product.metadata?.featured || product.metadata?.is_featured);
}

function InteractiveProductCard({ product }: { product: Product }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  const [active, setActive] = useState(false);
  const plan = lowestPlan(product.plans);
  const price = plan ? pricingFor(plan) : null;
  const type = kindForCategory(product.category);
  const Icon = type === 'ai' ? Zap : type === 'digital' ? FileText : LayoutDashboard;

  function handleMove(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (typeof window !== 'undefined') {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const touchPointer = window.matchMedia('(hover: none)').matches;
      if (reducedMotion || touchPointer) return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    setTilt({ x: (0.5 - y) * 10, y: (x - 0.5) * 12 });
    setGlow({ x: x * 100, y: y * 100 });
    setActive(true);
  }

  function resetTilt() {
    setTilt({ x: 0, y: 0 });
    setGlow({ x: 50, y: 50 });
    setActive(false);
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      onMouseMove={handleMove}
      onMouseLeave={resetTilt}
      onBlur={resetTilt}
      className="group relative block h-full rounded-[28px] outline-none transition-[filter] duration-300 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{
        transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${active ? 'translateY(-5px) scale(1.012)' : 'translateY(0) scale(1)'}`,
        transformStyle: 'preserve-3d',
        transition: active ? 'transform 90ms linear, filter 220ms ease' : 'transform 420ms cubic-bezier(.2,.8,.2,1), filter 220ms ease',
        willChange: 'transform',
        filter: active ? 'drop-shadow(0 24px 34px rgba(15, 23, 42, 0.16))' : 'drop-shadow(0 12px 22px rgba(15, 23, 42, 0.08))',
      }}
    >
      <article
        className="relative flex h-full min-h-[430px] flex-col overflow-hidden rounded-[28px] border border-border/80 bg-card/95 p-4 backdrop-blur-xl transition-colors duration-300 group-hover:border-primary/40"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(20, 184, 166, 0.20), transparent 34%), linear-gradient(135deg, rgba(255,255,255,0.06), transparent 42%)`,
          }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-primary/5 blur-3xl" />

        <div
          className="relative h-56 overflow-hidden rounded-[22px] border border-border/70 bg-gradient-to-br from-primary/10 via-background to-secondary/50"
          style={{ transform: 'translateZ(34px)', transformStyle: 'preserve-3d' }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'linear-gradient(rgba(148,163,184,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.18) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              transform: 'perspective(420px) rotateX(62deg) scale(1.5) translateY(18%)',
              transformOrigin: 'center bottom',
            }}
          />

          <span
            className="absolute left-4 top-4 z-20 rounded-full border border-white/40 bg-background/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary shadow-sm backdrop-blur"
            style={{ transform: 'translateZ(72px)' }}
          >
            {CATEGORY_LABELS[product.category] ?? 'Product'}
          </span>
          <span
            className="absolute right-4 top-4 z-20 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground shadow-sm backdrop-blur"
            style={{ transform: 'translateZ(60px)' }}
          >
            Interactive view
          </span>

          <div
            className="absolute inset-5 flex items-center justify-center"
            style={{ transform: `translateZ(${active ? 92 : 70}px) translateY(${active ? '-4px' : '0'})`, transition: 'transform 260ms ease' }}
          >
            {product.thumbnail_url ? (
              <img
                src={product.thumbnail_url}
                alt={product.name}
                className="max-h-[175px] w-full object-contain drop-shadow-[0_24px_22px_rgba(15,23,42,0.22)] transition-transform duration-300 group-hover:scale-[1.035]"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-[28px] border border-primary/20 bg-background/80 shadow-2xl backdrop-blur">
                <Icon size={42} className="text-primary" />
              </div>
            )}
          </div>

          <div
            aria-hidden="true"
            className="absolute bottom-4 left-1/2 h-5 w-2/3 -translate-x-1/2 rounded-full bg-slate-900/15 blur-xl"
            style={{ transform: 'translateX(-50%) translateZ(16px)' }}
          />
        </div>

        <div className="relative flex flex-1 flex-col px-2 pb-1 pt-5" style={{ transform: 'translateZ(26px)' }}>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-black leading-6 tracking-tight text-foreground transition-colors group-hover:text-primary">
              {product.name}
            </h2>
            {isFeatured(product) && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">Featured</span>
            )}
          </div>

          <p className="mt-2 line-clamp-3 min-h-[60px] text-sm leading-5 text-muted-foreground">
            {product.short_desc || product.description || 'Product details are available on the product page.'}
          </p>

          {(product.avg_rating ?? 0) > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Star size={12} className="fill-current text-amber-500" />
              <span className="font-semibold text-foreground">{product.avg_rating?.toFixed(1)}</span>
              <span>({product.review_count})</span>
            </div>
          )}

          <div className="mt-auto flex items-end justify-between gap-3 border-t border-border/80 pt-4" style={{ transform: 'translateZ(18px)' }}>
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Starting at</p>
              {!plan || !price ? (
                <span className="text-sm font-semibold text-muted-foreground">No active offer</span>
              ) : price.finalPrice === 0 ? (
                <span className="text-lg font-black text-success">Free</span>
              ) : (
                <div className="flex flex-wrap items-baseline gap-1.5">
                  {price.onSale && <span className="text-[11px] text-muted-foreground line-through">{money(price.regularPrice, plan.currency)}</span>}
                  <span className="text-xl font-black tracking-tight text-foreground">
                    {money(price.finalPrice, plan.currency)}
                    <span className="ml-0.5 text-xs font-normal text-muted-foreground">{billingSuffix(plan.billing_period)}</span>
                  </span>
                </div>
              )}
            </div>
            <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all duration-300 group-hover:gap-2.5 group-hover:shadow-xl group-hover:shadow-primary/25">
              Explore <ArrowRight size={13} />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function CatalogClient({
  kind = 'all',
  title,
  description,
  eyebrow = 'Catalog',
}: CatalogClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('featured');
  const [filter, setFilter] = useState<CatalogKind>(kind);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');
      const { data, error: productsError } = await supabase
        .from('products')
        .select(`
          id, name, slug, short_desc, description, category, thumbnail_url,
          tags, metadata, created_at,
          plans:product_plans(
            id, name, price, currency, billing_period, is_active, sort_order,
            sale_price, sale_discount_type, sale_discount_value, sale_starts_at, sale_ends_at
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!alive) return;
      if (productsError) {
        console.error('Catalog load failed:', productsError.message);
        setError('The catalog could not be loaded. Please try again.');
        setProducts([]);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as Product[];
      const productIds = rows.map((product) => product.id);
      const ratingMap: Record<string, { sum: number; count: number }> = {};

      if (productIds.length) {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('product_id, rating')
          .in('product_id', productIds)
          .eq('moderation_status', 'approved');

        for (const review of reviews ?? []) {
          if (!ratingMap[review.product_id]) ratingMap[review.product_id] = { sum: 0, count: 0 };
          ratingMap[review.product_id].sum += Number(review.rating) || 0;
          ratingMap[review.product_id].count += 1;
        }
      }

      setProducts(rows.map((product) => ({
        ...product,
        avg_rating: ratingMap[product.id]
          ? ratingMap[product.id].sum / ratingMap[product.id].count
          : 0,
        review_count: ratingMap[product.id]?.count ?? 0,
      })));
      setLoading(false);
    }

    load();
    return () => { alive = false; };
  }, [supabase]);

  const visible = products
    .filter((product) => {
      const effectiveFilter = kind === 'all' ? filter : kind;
      if (effectiveFilter !== 'all' && kindForCategory(product.category) !== effectiveFilter) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return product.name.toLowerCase().includes(q)
        || (product.short_desc ?? '').toLowerCase().includes(q)
        || (product.tags ?? []).some((tag) => tag.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === 'featured') {
        const featuredDelta = Number(isFeatured(b)) - Number(isFeatured(a));
        if (featuredDelta) return featuredDelta;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      const aPlan = lowestPlan(a.plans);
      const bPlan = lowestPlan(b.plans);
      const aPrice = aPlan ? pricingFor(aPlan).finalPrice : Number.POSITIVE_INFINITY;
      const bPrice = bPlan ? pricingFor(bPlan).finalPrice : Number.POSITIVE_INFINITY;
      return sort === 'price_asc' ? aPrice - bPrice : bPrice - aPrice;
    });

  return (
    <main className="min-h-[70vh] bg-background pt-[68px]">
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-screen-xl px-6 py-16 lg:px-8 lg:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">{title}</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
            </div>
            <Link href="/pricing" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              View published pricing <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-screen-xl px-6 py-10 lg:px-8 lg:py-14">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search published products"
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {kind === 'all' && (['all', 'ai', 'saas', 'digital'] as CatalogKind[]).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${filter === value ? 'bg-primary text-white' : 'border border-border bg-card text-muted-foreground hover:text-foreground'}`}
              >
                {value === 'all' ? 'All' : value === 'ai' ? 'AI' : value === 'saas' ? 'SaaS' : 'Digital'}
              </button>
            ))}
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground outline-none"
              aria-label="Sort products"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-[430px] animate-pulse rounded-[28px] border border-border bg-secondary/30" />)}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-sm text-destructive">{error}</div>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card p-12 text-center">
            <Package className="mx-auto text-primary" size={30} />
            <h2 className="mt-4 text-xl font-bold text-foreground">No published offers yet</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              SUMMECA is preparing its first production products. Only products with an active, publishable plan will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3 [perspective:1600px]">
            {visible.map((product) => <InteractiveProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>
    </main>
  );
}
