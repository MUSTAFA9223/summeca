'use client';

import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Boxes,
  FileText,
  LayoutDashboard,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import Product3DShowcase from '@/components/catalog/Product3DShowcase';
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
  const [glow, setGlow] = useState({ x: 50, y: 40 });
  const [active, setActive] = useState(false);
  const plan = lowestPlan(product.plans);
  const price = plan ? pricingFor(plan) : null;
  const type = kindForCategory(product.category);
  const Icon = type === 'ai' ? Zap : type === 'digital' ? FileText : LayoutDashboard;

  function handleMove(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    setGlow({ x: x * 100, y: y * 100 });
    setActive(true);
  }

  function reset() {
    setGlow({ x: 50, y: 40 });
    setActive(false);
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onBlur={reset}
      className="group relative block h-full rounded-[32px] outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#070b10]"
      style={{
        transform: active ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'transform 260ms cubic-bezier(.2,.8,.2,1), filter 260ms ease',
        filter: active
          ? 'drop-shadow(0 34px 45px rgba(0,0,0,.48))'
          : 'drop-shadow(0 18px 28px rgba(0,0,0,.28))',
      }}
    >
      <article className="relative flex h-full min-h-[500px] flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#0b1117]/95 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.04)] backdrop-blur-2xl transition-colors duration-300 group-hover:border-cyan-300/35">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(34,211,238,.13), transparent 31%), linear-gradient(135deg, rgba(255,255,255,.025), transparent 35%)`,
          }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

        <Product3DShowcase
          name={product.name}
          thumbnailUrl={product.thumbnail_url}
          category={product.category}
          eyebrow={CATEGORY_LABELS[product.category] ?? 'Product'}
          variant="card"
          className="relative z-10"
        />

        <div className="relative z-20 flex flex-1 flex-col px-2 pb-2 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.19em] text-cyan-300">
                <Icon size={12} />
                {CATEGORY_LABELS[product.category] ?? 'SUMMECA Product'}
              </p>
              <h2 className="mt-2 text-xl font-black leading-6 tracking-tight text-white transition-colors group-hover:text-cyan-100">
                {product.name}
              </h2>
            </div>
            {isFeatured(product) && (
              <span className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-200">
                Featured
              </span>
            )}
          </div>

          <p className="mt-3 line-clamp-3 min-h-[63px] text-sm leading-5 text-slate-400">
            {product.short_desc || product.description || 'Explore the complete product landing page, included assets and current offer.'}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(product.tags ?? []).slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[10px] font-semibold text-slate-400">
                {tag}
              </span>
            ))}
            {(product.avg_rating ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <Star size={12} className="fill-current text-amber-400" />
                <span className="font-bold text-white">{product.avg_rating?.toFixed(1)}</span>
                <span>({product.review_count})</span>
              </span>
            )}
          </div>

          <div className="mt-auto flex items-end justify-between gap-4 border-t border-white/[0.08] pt-5">
            <div>
              <p className="mb-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">Starting at</p>
              {!plan || !price ? (
                <span className="text-sm font-semibold text-slate-400">No active offer</span>
              ) : price.finalPrice === 0 ? (
                <span className="text-xl font-black text-emerald-300">Free</span>
              ) : (
                <div className="flex flex-wrap items-baseline gap-1.5">
                  {price.onSale && (
                    <span className="text-[11px] text-slate-500 line-through">{money(price.regularPrice, plan.currency)}</span>
                  )}
                  <span className="text-2xl font-black tracking-tight text-white">
                    {money(price.finalPrice, plan.currency)}
                    <span className="ml-0.5 text-xs font-normal text-slate-500">{billingSuffix(plan.billing_period)}</span>
                  </span>
                </div>
              )}
            </div>
            <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-cyan-300 px-5 text-xs font-black text-[#041014] shadow-[0_12px_30px_rgba(34,211,238,.18)] transition-all duration-300 group-hover:gap-3 group-hover:shadow-[0_18px_38px_rgba(34,211,238,.28)]">
              View landing <ArrowRight size={14} />
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

    void load();
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
    <main className="min-h-[75vh] bg-[#070b10] pt-[68px] text-white">
      <section className="relative overflow-hidden border-b border-white/[0.08]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_18%,rgba(34,211,238,.14),transparent_29%),radial-gradient(circle_at_14%_52%,rgba(20,184,166,.10),transparent_30%)]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.11]"
          style={{
            backgroundImage: 'linear-gradient(rgba(34,211,238,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.2) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'linear-gradient(to bottom, black, transparent 82%)',
          }}
        />
        <div className="relative mx-auto max-w-screen-xl px-6 py-16 lg:px-8 lg:py-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
            <Sparkles size={13} />
            {eyebrow}
          </div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-4xl">
              <h1 className="text-4xl font-black leading-[0.98] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
                {title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
                {description}
              </p>
              <div className="mt-7 flex flex-wrap gap-3 text-xs font-bold text-slate-300">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2">
                  <Boxes size={14} className="text-cyan-300" /> Deep 3D product previews
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2">
                  <ShieldCheck size={14} className="text-cyan-300" /> Protected checkout
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2">
                  <Sparkles size={14} className="text-cyan-300" /> Dedicated landing pages
                </span>
              </div>
            </div>
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-300/30 hover:text-cyan-200">
              View published pricing <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-screen-xl px-6 py-10 lg:px-8 lg:py-16">
        <div className="mb-9 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search published products"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.035] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40 focus:bg-white/[0.05]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {kind === 'all' && (['all', 'ai', 'saas', 'digital'] as CatalogKind[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${
                  filter === value
                    ? 'bg-cyan-300 text-[#041014] shadow-[0_8px_24px_rgba(34,211,238,.18)]'
                    : 'border border-white/10 bg-white/[0.035] text-slate-400 hover:border-cyan-300/25 hover:text-white'
                }`}
              >
                {value === 'all' ? 'All' : value === 'ai' ? 'AI' : value === 'saas' ? 'SaaS' : 'Digital'}
              </button>
            ))}
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="rounded-xl border border-white/10 bg-[#0b1117] px-3.5 py-2.5 text-xs font-bold text-slate-300 outline-none focus:border-cyan-300/35"
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
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-[500px] animate-pulse rounded-[32px] border border-white/[0.08] bg-white/[0.035]" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-400/15 bg-red-400/5 p-8 text-center text-sm text-red-200">{error}</div>
        ) : visible.length === 0 ? (
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-12 text-center">
            <Package className="mx-auto text-cyan-300" size={34} />
            <h2 className="mt-4 text-xl font-black text-white">No published offers yet</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
              SUMMECA is preparing its next production products. Only active publishable offers appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((product) => <InteractiveProductCard key={product.id} product={product} />)}
          </div>
        )}
      </section>
    </main>
  );
}
