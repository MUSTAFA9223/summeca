'use client';

import { useState } from 'react';
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
import { getEffectivePrice } from '@/lib/pricing';
import type { PublicCatalogProduct } from '@/lib/catalog/publicCatalog';

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

type Product = PublicCatalogProduct;

interface CatalogClientProps {
  kind?: CatalogKind;
  title: string;
  description: string;
  eyebrow?: string;
  initialProducts: PublicCatalogProduct[];
}

const AI_CATEGORIES = ['ai_tool', 'api', 'plugin'];
const DIGITAL_CATEGORIES = ['template', 'dataset'];

const CATEGORY_LABELS: Record<string, string> = {
  ai_tool: 'AI Assistant',
  api: 'Developer Tool',
  plugin: 'Extension',
  template: 'Ready-to-use Kit',
  dataset: 'Data Resource',
  course: 'Learning Guide',
  saas: 'Business Software',
  saas_app: 'Business Software',
  other: 'Business Software',
};

function categoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? 'Digital Product';
}

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
    pricingFor(plan).finalPrice < pricingFor(lowest).finalPrice ? plan : lowest
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

function isRecommended(product: Product) {
  return product.slug === 'summeca-invoiceflow';
}

function InteractiveProductCard({ product, index }: { product: Product; index: number }) {
  const plan = lowestPlan(product.plans as ProductPlan[] | undefined);
  const price = plan ? pricingFor(plan) : null;
  const type = kindForCategory(product.category);
  const Icon = type === 'ai' ? Zap : type === 'digital' ? FileText : LayoutDashboard;
  const recommended = isRecommended(product);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="summeca-catalog-enter group relative block h-full rounded-[22px] outline-none transition duration-200 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b1117] motion-reduce:transform-none"
      style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
    >
      <article className={`relative flex h-full min-h-[480px] flex-col overflow-hidden rounded-[22px] border bg-[#101820] p-4 shadow-[0_16px_42px_rgba(0,0,0,.24)] transition duration-200 group-hover:shadow-[0_22px_54px_rgba(0,0,0,.34)] ${recommended ? 'border-cyan-300/45 ring-1 ring-cyan-300/10' : 'border-slate-700/80 group-hover:border-cyan-300/35'}`}>
        <Product3DShowcase
          name={product.name}
          thumbnailUrl={product.thumbnail_url}
          category={product.category}
          eyebrow={categoryLabel(product.category)}
          variant="card"
          className="relative z-10"
        />

        <div className="relative z-20 flex flex-1 flex-col px-2 pb-2 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.17em] text-cyan-300">
                <Icon size={12} />
                {categoryLabel(product.category)}
              </p>
              <h2 className="mt-2 text-xl font-black leading-6 tracking-tight text-white transition-colors group-hover:text-cyan-100">
                {product.name}
              </h2>
            </div>
            {recommended ? (
              <span className="shrink-0 rounded-md border border-cyan-300/25 bg-cyan-300/12 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-100">
                Recommended
              </span>
            ) : isFeatured(product) ? (
              <span className="shrink-0 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-200">
                Featured
              </span>
            ) : null}
          </div>

          <p className="mt-3 line-clamp-2 min-h-[42px] text-sm leading-5 text-slate-400">
            {product.short_desc || product.description || 'See the real preview, included features, and current offer.'}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(product.tags ?? []).slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[10px] font-semibold text-slate-400">
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
                  {price.onSale && <span className="text-[11px] text-slate-500 line-through">{money(price.regularPrice, plan.currency)}</span>}
                  <span className="text-2xl font-black tracking-tight text-white">
                    {money(price.finalPrice, plan.currency)}
                    <span className="ml-0.5 text-xs font-normal text-slate-500">{billingSuffix(plan.billing_period)}</span>
                  </span>
                </div>
              )}
            </div>
            <span className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan-300 px-4 text-xs font-black text-[#062027] transition duration-200 group-hover:bg-cyan-200 group-hover:shadow-[0_8px_24px_rgba(34,211,238,.16)]">
              View product <ArrowRight size={14} />
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
  initialProducts,
}: CatalogClientProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('featured');
  const [filter, setFilter] = useState<CatalogKind>(kind);

  const products: Product[] = initialProducts;

  const visible = products
    .filter((product) => {
      const effectiveFilter = kind === 'all' ? filter : kind;
      if (effectiveFilter !== 'all' && kindForCategory(product.category) !== effectiveFilter) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        (product.short_desc ?? '').toLowerCase().includes(q) ||
        (product.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === 'featured') {
        const recommendedDelta = Number(isRecommended(b)) - Number(isRecommended(a));
        if (recommendedDelta) return recommendedDelta;
        const featuredDelta = Number(isFeatured(b)) - Number(isFeatured(a));
        if (featuredDelta) return featuredDelta;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      const aPlan = lowestPlan(a.plans as ProductPlan[] | undefined);
      const bPlan = lowestPlan(b.plans as ProductPlan[] | undefined);
      const aPrice = aPlan ? pricingFor(aPlan).finalPrice : Number.POSITIVE_INFINITY;
      const bPrice = bPlan ? pricingFor(bPlan).finalPrice : Number.POSITIVE_INFINITY;
      return sort === 'price_asc' ? aPrice - bPrice : bPrice - aPrice;
    });

  return (
    <main className="min-h-[75vh] bg-[#070b10] pt-[68px] text-white">
      <style>{`
        @keyframes summeca-catalog-enter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .summeca-catalog-enter { animation: summeca-catalog-enter .5s cubic-bezier(.2,.8,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .summeca-catalog-enter { animation: none; } }
      `}</style>
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
          <div className="summeca-catalog-enter inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
            <Sparkles size={13} /> {eyebrow}
          </div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="summeca-catalog-enter max-w-4xl" style={{ animationDelay: '45ms' }}>
              <h1 className="text-4xl font-black leading-[0.98] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">{title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">{description}</p>
              <div className="mt-7 flex flex-wrap gap-3 text-xs font-bold text-slate-300">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2"><Boxes size={14} className="text-cyan-300" /> Actual product previews</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2"><ShieldCheck size={14} className="text-cyan-300" /> Protected checkout</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2"><Sparkles size={14} className="text-cyan-300" /> Dedicated landing pages</span>
              </div>
            </div>
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-slate-200 transition hover:-translate-y-0.5 hover:border-cyan-300/30 hover:text-cyan-200 motion-reduce:transform-none">
              View pricing <ArrowRight size={14} />
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
              placeholder="Search products"
              className="w-full rounded-lg border border-white/10 bg-white/[0.035] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40 focus:bg-white/[0.05]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {kind === 'all' && (['all', 'ai', 'saas', 'digital'] as CatalogKind[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-lg px-3.5 py-2.5 text-xs font-bold transition ${filter === value ? 'bg-cyan-300 text-[#041014] shadow-[0_8px_24px_rgba(34,211,238,.18)]' : 'border border-white/10 bg-white/[0.035] text-slate-400 hover:border-cyan-300/25 hover:text-white'}`}
              >
                {value === 'all' ? 'All' : value === 'ai' ? 'AI' : value === 'saas' ? 'Software' : 'Digital products'}
              </button>
            ))}
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="rounded-lg border border-white/10 bg-white/[0.035] px-3.5 py-2.5 text-xs font-bold text-slate-400 outline-none transition hover:border-cyan-300/25 hover:text-white focus:border-cyan-300/35"
              aria-label="Sort products"
            >
              <option value="featured">Recommended</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-[32px] border border-white/10 bg-white/[0.03] p-12 text-center">
            <Package className="mx-auto text-cyan-300" size={34} />
            <h2 className="mt-4 text-xl font-black text-white">No matching products</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">Try another search or filter. Only active published offers appear here.</p>
          </div>
        ) : (
          <div className="grid items-stretch gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((product, index) => <InteractiveProductCard key={product.id} product={product} index={index} />)}
          </div>
        )}
      </section>
    </main>
  );
}
