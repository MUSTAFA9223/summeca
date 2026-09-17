'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Boxes,
  Check,
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
import { useLanguage } from '@/contexts/LanguageContext';
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
const DIGITAL_CATEGORIES = ['template', 'dataset', 'course', 'other'];

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  ai_tool: { en: 'AI Workflow', ar: 'سير عمل بالذكاء الاصطناعي' },
  api: { en: 'AI Workflow', ar: 'سير عمل بالذكاء الاصطناعي' },
  plugin: { en: 'AI Workflow', ar: 'سير عمل بالذكاء الاصطناعي' },
  template: { en: 'Business Template', ar: 'قالب أعمال' },
  dataset: { en: 'Digital Kit', ar: 'حزمة رقمية' },
  course: { en: 'Digital Kit', ar: 'حزمة رقمية' },
  saas: { en: 'Business SaaS', ar: 'برنامج SaaS للأعمال' },
  saas_app: { en: 'Business SaaS', ar: 'برنامج SaaS للأعمال' },
  other: { en: 'Digital Kit', ar: 'حزمة رقمية' },
};

const UI = {
  en: {
    actualPreviews: 'Actual product previews',
    protectedCheckout: 'Protected checkout',
    landingPages: 'Dedicated landing pages',
    viewPricing: 'View pricing',
    search: 'Search products',
    all: 'All',
    ai: 'AI workflows',
    saas: 'Business SaaS',
    digital: 'Digital products',
    sort: 'Sort products',
    recommendedSort: 'Recommended',
    newest: 'Newest',
    lowHigh: 'Price: low to high',
    highLow: 'Price: high to low',
    product: 'product',
    products: 'products',
    recommended: 'Recommended',
    featured: 'Featured',
    startingAt: 'Starting at',
    noOffer: 'No active offer',
    free: 'Free',
    viewProduct: 'View product',
    fallbackDescription: 'See the real preview, included features, and current offer.',
    emptyTitle: 'No products match your search.',
    emptyDescription: 'Try another search or filter. Only active published offers appear here.',
    clear: 'Clear search & filters',
    selected: 'Selected',
    digitalProduct: 'Digital Product',
    saasWorkspace: 'SaaS workspace',
    aiWorkspace: 'AI-assisted workspace',
    digitalKit: 'Downloadable digital kit',
    businessTemplate: 'Business template',
  },
  ar: {
    actualPreviews: 'معاينات حقيقية للمنتجات',
    protectedCheckout: 'دفع محمي',
    landingPages: 'صفحات هبوط مخصصة',
    viewPricing: 'عرض الأسعار',
    search: 'ابحث في المنتجات',
    all: 'الكل',
    ai: 'سير عمل بالذكاء الاصطناعي',
    saas: 'SaaS للأعمال',
    digital: 'المنتجات الرقمية',
    sort: 'ترتيب المنتجات',
    recommendedSort: 'الموصى به',
    newest: 'الأحدث',
    lowHigh: 'السعر: من الأقل إلى الأعلى',
    highLow: 'السعر: من الأعلى إلى الأقل',
    product: 'منتج',
    products: 'منتجات',
    recommended: 'موصى به',
    featured: 'مميز',
    startingAt: 'يبدأ من',
    noOffer: 'لا يوجد عرض نشط',
    free: 'مجاني',
    viewProduct: 'عرض المنتج',
    fallbackDescription: 'اطّلع على المعاينة الحقيقية والميزات المتضمنة والعرض الحالي.',
    emptyTitle: 'لا توجد منتجات تطابق بحثك.',
    emptyDescription: 'جرّب بحثًا أو فلترًا آخر. تظهر هنا العروض النشطة والمنشورة فقط.',
    clear: 'مسح البحث والفلاتر',
    selected: 'محدد',
    digitalProduct: 'منتج رقمي',
    saasWorkspace: 'مساحة عمل SaaS',
    aiWorkspace: 'مساحة عمل بمساعدة الذكاء الاصطناعي',
    digitalKit: 'حزمة رقمية قابلة للتنزيل',
    businessTemplate: 'قالب أعمال',
  },
} as const;

function normalizeCategory(category: string) {
  return category.trim().toLowerCase();
}

function categoryLabel(category: string, language: 'en' | 'ar') {
  return CATEGORY_LABELS[normalizeCategory(category)]?.[language] ?? UI[language].digitalProduct;
}

function kindForCategory(category: string): Exclude<CatalogKind, 'all'> {
  const normalized = normalizeCategory(category);
  if (AI_CATEGORIES.includes(normalized)) return 'ai';
  if (DIGITAL_CATEGORIES.includes(normalized)) return 'digital';
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

function money(value: number, currency: string, language: 'en' | 'ar') {
  if (value === 0) return UI[language].free;
  try {
    return new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency || 'USD'} ${value % 1 === 0 ? value : value.toFixed(2)}`;
  }
}

function billingSuffix(period: BillingPeriod, language: 'en' | 'ar') {
  if (language === 'ar') {
    if (period === 'monthly') return '/شهر';
    if (period === 'yearly') return '/سنة';
    if (period === 'lifetime') return ' مدى الحياة';
    return '';
  }
  if (period === 'monthly') return '/mo';
  if (period === 'yearly') return '/yr';
  if (period === 'lifetime') return ' lifetime';
  return '';
}

function isFeatured(product: Product) {
  return Boolean(product.metadata?.featured || product.metadata?.is_featured);
}

function isRecommended(product: Product) {
  return product.slug.toLowerCase().includes('invoiceflow');
}

function catalogPriority(product: Product) {
  const slug = product.slug.toLowerCase();
  const category = normalizeCategory(product.category);
  if (slug.includes('invoiceflow')) return 0;
  if (slug.includes('leadfollow')) return 1;
  if (category === 'template') return 3;
  return 2;
}

function productTypeLabel(product: Product, language: 'en' | 'ar') {
  const slug = product.slug.toLowerCase();
  const category = normalizeCategory(product.category);
  if (slug.includes('invoiceflow')) return UI[language].saasWorkspace;
  if (slug.includes('leadfollow')) return UI[language].aiWorkspace;
  if (category === 'template') return UI[language].businessTemplate;
  if (kindForCategory(category) === 'digital') return UI[language].digitalKit;
  if (kindForCategory(category) === 'ai') return UI[language].aiWorkspace;
  return UI[language].saasWorkspace;
}

function InteractiveProductCard({
  product,
  index,
  language,
}: {
  product: Product;
  index: number;
  language: 'en' | 'ar';
}) {
  const copy = UI[language];
  const plan = lowestPlan(product.plans as ProductPlan[] | undefined);
  const price = plan ? pricingFor(plan) : null;
  const type = kindForCategory(product.category);
  const Icon = type === 'ai' ? Zap : type === 'digital' ? FileText : LayoutDashboard;
  const recommended = isRecommended(product);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="summeca-catalog-enter group relative block h-full rounded-[22px] outline-none transition duration-200 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-4 focus-visible:ring-offset-background motion-reduce:transform-none"
      style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
      aria-label={`${copy.viewProduct}: ${product.name}`}
    >
      <article
        className={`relative flex h-full min-h-[480px] flex-col overflow-hidden rounded-[22px] border bg-card p-4 text-card-foreground shadow-[0_16px_42px_rgba(0,0,0,.12)] transition duration-200 dark:bg-[#101820] dark:shadow-[0_16px_42px_rgba(0,0,0,.24)] group-hover:shadow-[0_22px_54px_rgba(0,0,0,.18)] dark:group-hover:shadow-[0_22px_54px_rgba(0,0,0,.34)] ${
          recommended
            ? 'border-cyan-400/50 ring-1 ring-cyan-400/10'
            : 'border-border group-hover:border-cyan-400/40 dark:border-slate-700/80'
        }`}
      >
        <Product3DShowcase
          name={product.name}
          thumbnailUrl={product.thumbnail_url}
          category={product.category}
          eyebrow={categoryLabel(product.category, language)}
          variant="card"
          className="relative z-10"
        />

        <div className="relative z-20 flex flex-1 flex-col px-2 pb-2 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.17em] text-cyan-600 dark:text-cyan-300">
                <Icon size={12} aria-hidden="true" />
                {categoryLabel(product.category, language)}
              </p>
              <h2 className="mt-2 text-xl font-black leading-6 tracking-tight text-foreground transition-colors group-hover:text-cyan-700 dark:text-white dark:group-hover:text-cyan-100">
                {product.name}
              </h2>
              <p className="mt-1.5 text-xs font-semibold text-muted-foreground">
                {productTypeLabel(product, language)}
              </p>
            </div>
            {recommended ? (
              <span className="shrink-0 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-100">
                {copy.recommended}
              </span>
            ) : isFeatured(product) ? (
              <span className="shrink-0 rounded-md border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-200">
                {copy.featured}
              </span>
            ) : null}
          </div>

          <p className="mt-3 line-clamp-2 min-h-[42px] text-sm leading-5 text-muted-foreground dark:text-slate-400">
            {product.short_desc || product.description || copy.fallbackDescription}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(product.tags ?? []).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-border bg-secondary/55 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400"
              >
                {tag}
              </span>
            ))}
            {(product.avg_rating ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground dark:text-slate-400">
                <Star size={12} className="fill-current text-amber-400" aria-hidden="true" />
                <span className="font-bold text-foreground dark:text-white">{product.avg_rating?.toFixed(1)}</span>
                <span>({product.review_count})</span>
              </span>
            )}
          </div>

          <div className="mt-auto flex flex-col items-stretch gap-4 border-t border-border pt-5 sm:flex-row sm:items-end sm:justify-between dark:border-white/[0.08]">
            <div className="min-w-0">
              <p className="mb-1 text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground dark:text-slate-500">
                {copy.startingAt}
              </p>
              {!plan || !price ? (
                <span className="text-sm font-semibold text-muted-foreground dark:text-slate-400">{copy.noOffer}</span>
              ) : price.finalPrice === 0 ? (
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-300">{copy.free}</span>
              ) : (
                <div className="flex flex-wrap items-baseline gap-1.5" dir="ltr">
                  {price.onSale && (
                    <span className="text-[11px] text-muted-foreground line-through dark:text-slate-500">
                      {money(price.regularPrice, plan.currency, language)}
                    </span>
                  )}
                  <span className="text-2xl font-black tracking-tight text-foreground dark:text-white">
                    {money(price.finalPrice, plan.currency, language)}
                    <span className="ms-0.5 text-xs font-normal text-muted-foreground dark:text-slate-500">
                      {billingSuffix(plan.billing_period, language)}
                    </span>
                  </span>
                </div>
              )}
            </div>
            <span className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 text-xs font-black text-[#062027] transition duration-200 group-hover:bg-cyan-200 group-hover:shadow-[0_8px_24px_rgba(34,211,238,.16)]">
              {copy.viewProduct} <ArrowRight size={14} className="rtl:rotate-180" aria-hidden="true" />
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
  const { language: activeLanguage } = useLanguage();
  const language: 'en' | 'ar' = activeLanguage === 'ar' ? 'ar' : 'en';
  const copy = UI[language];
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('featured');
  const [filter, setFilter] = useState<CatalogKind>(kind);

  const products: Product[] = initialProducts;
  const effectiveFilter = kind === 'all' ? filter : kind;
  const normalizedQuery = query.trim().toLocaleLowerCase(language === 'ar' ? 'ar' : 'en');

  const visible = products
    .filter((product) => {
      if (effectiveFilter !== 'all' && kindForCategory(product.category) !== effectiveFilter) {
        return false;
      }
      if (!normalizedQuery) return true;
      return (
        product.name.toLocaleLowerCase().includes(normalizedQuery) ||
        (product.short_desc ?? '').toLocaleLowerCase().includes(normalizedQuery) ||
        (product.description ?? '').toLocaleLowerCase().includes(normalizedQuery) ||
        categoryLabel(product.category, language).toLocaleLowerCase().includes(normalizedQuery) ||
        productTypeLabel(product, language).toLocaleLowerCase().includes(normalizedQuery) ||
        (product.tags ?? []).some((tag) => tag.toLocaleLowerCase().includes(normalizedQuery))
      );
    })
    .sort((a, b) => {
      if (sort === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sort === 'featured') {
        const priorityDelta = catalogPriority(a) - catalogPriority(b);
        if (priorityDelta) return priorityDelta;
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

  const clearSearchAndFilters = () => {
    setQuery('');
    setSort('featured');
    if (kind === 'all') setFilter('all');
  };

  const filterLabel = (value: CatalogKind) => {
    if (value === 'all') return copy.all;
    if (value === 'ai') return copy.ai;
    if (value === 'saas') return copy.saas;
    return copy.digital;
  };

  return (
    <main className="min-h-[75vh] bg-background pt-[68px] text-foreground dark:bg-[#070b10] dark:text-white">
      <style>{`
        @keyframes summeca-catalog-enter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .summeca-catalog-enter { animation: summeca-catalog-enter .5s cubic-bezier(.2,.8,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .summeca-catalog-enter { animation: none; } }
      `}</style>

      <section className="relative overflow-hidden border-b border-border dark:border-white/[0.08]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_18%,rgba(34,211,238,.14),transparent_29%),radial-gradient(circle_at_14%_52%,rgba(20,184,166,.10),transparent_30%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.11]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(34,211,238,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.2) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'linear-gradient(to bottom, black, transparent 82%)',
          }}
        />
        <div className="relative mx-auto max-w-screen-xl px-5 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
          <div className="summeca-catalog-enter inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
            <Sparkles size={13} aria-hidden="true" /> {eyebrow}
          </div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="summeca-catalog-enter max-w-4xl" style={{ animationDelay: '45ms' }}>
              <h1 className="text-4xl font-black leading-[0.98] tracking-[-0.04em] text-foreground sm:text-5xl lg:text-6xl dark:text-white">
                {title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg dark:text-slate-400">
                {description}
              </p>
              <div className="mt-7 flex flex-wrap gap-3 text-xs font-bold text-secondary-foreground dark:text-slate-300">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-2 dark:border-white/10 dark:bg-white/[0.035]">
                  <Boxes size={14} className="text-cyan-600 dark:text-cyan-300" aria-hidden="true" /> {copy.actualPreviews}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-2 dark:border-white/10 dark:bg-white/[0.035]">
                  <ShieldCheck size={14} className="text-cyan-600 dark:text-cyan-300" aria-hidden="true" /> {copy.protectedCheckout}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3.5 py-2 dark:border-white/10 dark:bg-white/[0.035]">
                  <Sparkles size={14} className="text-cyan-600 dark:text-cyan-300" aria-hidden="true" /> {copy.landingPages}
                </span>
              </div>
            </div>
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card/60 px-5 py-3 text-sm font-bold text-secondary-foreground transition hover:-translate-y-0.5 hover:border-cyan-400/40 hover:text-cyan-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 motion-reduce:transform-none dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:text-cyan-200"
            >
              {copy.viewPricing} <ArrowRight size={14} className="rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-screen-xl px-5 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-9 flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3.5 dark:text-slate-500"
                size={16}
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.search}
                aria-label={copy.search}
                inputMode="search"
                className="min-h-11 w-full rounded-lg border border-border bg-card/60 py-3 pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/15 rtl:pl-4 rtl:pr-10 dark:border-white/10 dark:bg-white/[0.035] dark:text-white dark:placeholder:text-slate-600"
              />
            </div>

            <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
              <div className="flex min-w-max items-center gap-2 whitespace-nowrap">
                {kind === 'all' &&
                  (['all', 'ai', 'saas', 'digital'] as CatalogKind[]).map((value) => {
                    const selected = filter === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        aria-pressed={selected}
                        className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
                          selected
                            ? 'border border-cyan-400/40 bg-cyan-300 text-[#041014] shadow-[0_8px_24px_rgba(34,211,238,.18)]'
                            : 'border border-border bg-card/60 text-muted-foreground hover:border-cyan-400/35 hover:text-foreground dark:border-white/10 dark:bg-white/[0.035] dark:text-slate-400 dark:hover:text-white'
                        }`}
                      >
                        {selected && <Check size={13} aria-hidden="true" />}
                        {filterLabel(value)}
                        {selected && <span className="sr-only"> ({copy.selected})</span>}
                      </button>
                    );
                  })}
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                  className="min-h-11 shrink-0 rounded-lg border border-border bg-card/60 px-3.5 py-2.5 text-xs font-bold text-muted-foreground outline-none transition hover:border-cyan-400/35 hover:text-foreground focus:border-cyan-400/45 focus:ring-2 focus:ring-cyan-400/15 dark:border-white/10 dark:bg-[#111922] dark:text-slate-300 dark:hover:text-white"
                  aria-label={copy.sort}
                >
                  <option value="featured">{copy.recommendedSort}</option>
                  <option value="newest">{copy.newest}</option>
                  <option value="price_asc">{copy.lowHigh}</option>
                  <option value="price_desc">{copy.highLow}</option>
                </select>
              </div>
            </div>
          </div>

          <p className="text-sm font-semibold text-muted-foreground dark:text-slate-400" aria-live="polite" aria-atomic="true">
            {visible.length} {visible.length === 1 ? copy.product : copy.products}
          </p>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-[28px] border border-border bg-card/60 p-8 text-center sm:p-12 dark:border-white/10 dark:bg-white/[0.03]">
            <Package className="mx-auto text-cyan-600 dark:text-cyan-300" size={34} aria-hidden="true" />
            <h2 className="mt-4 text-xl font-black text-foreground dark:text-white">{copy.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground dark:text-slate-400">
              {copy.emptyDescription}
            </p>
            <button
              type="button"
              onClick={clearSearchAndFilters}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 text-sm font-bold text-cyan-800 transition hover:bg-cyan-400/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 dark:text-cyan-200"
            >
              {copy.clear}
            </button>
          </div>
        ) : (
          <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {visible.map((product, index) => (
              <InteractiveProductCard
                key={product.id}
                product={product}
                index={index}
                language={language}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
