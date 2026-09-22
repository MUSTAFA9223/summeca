'use client';

import { useState, type PointerEvent as ReactPointerEvent } from 'react';
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
  X,
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
const DIGITAL_KIT_CATEGORIES = ['dataset', 'course', 'other', 'digital_kit'];
const TEMPLATE_CATEGORIES = ['template'];

const CATEGORY_LABELS: Record<string, string> = {
  ai_tool: 'AI Workflow',
  api: 'Developer Tool',
  plugin: 'Extension',
  template: 'Business Template',
  dataset: 'Digital Kit',
  course: 'Digital Kit',
  digital_kit: 'Digital Kit',
  saas: 'Business SaaS',
  saas_app: 'Business SaaS',
  other: 'Digital Kit',
};

const CATALOG_AR: Record<string, string> = {
  'SUMMECA Catalog': 'كتالوج SUMMECA',
  Catalog: 'الكتالوج',
  'Published digital products': 'المنتجات الرقمية المنشورة',
  'Browse only production offers currently published by SUMMECA. Prices, currencies, billing periods, and sale pricing come directly from the active product plans used at checkout.':
    'تصفّح عروض SUMMECA المنشورة حاليًا فقط. الأسعار والعملات وفترات الفوترة وأسعار التخفيض تأتي مباشرة من خطط المنتجات النشطة المستخدمة عند الدفع.',
  'Actual product previews': 'معاينات حقيقية للمنتجات',
  'Protected checkout': 'دفع محمي',
  'Dedicated landing pages': 'صفحات مخصصة لكل منتج',
  'View pricing': 'عرض الأسعار',
  'Search products': 'ابحث في المنتجات',
  'Clear search': 'مسح البحث',
  'Sort products': 'ترتيب المنتجات',
  'All products': 'كل المنتجات',
  'AI workflows': 'سير عمل بالذكاء الاصطناعي',
  'Business SaaS': 'برمجيات SaaS للأعمال',
  'Digital kits & templates': 'الحزم والقوالب الرقمية',
  Recommended: 'موصى به',
  Featured: 'مميز',
  Newest: 'الأحدث',
  'Price: low to high': 'السعر: من الأقل إلى الأعلى',
  'Price: high to low': 'السعر: من الأعلى إلى الأقل',
  product: 'منتج',
  products: 'منتجات',
  'Starting at': 'يبدأ من',
  'No active offer': 'لا يوجد عرض نشط',
  Free: 'مجاني',
  'View product': 'عرض المنتج',
  'No products match your search.': 'لا توجد منتجات تطابق بحثك.',
  'Try a different search or remove the active filters.': 'جرّب بحثًا مختلفًا أو أزل الفلاتر النشطة.',
  'Clear search and filters': 'مسح البحث والفلاتر',
  'AI Workflow': 'سير عمل بالذكاء الاصطناعي',
  'Digital Kit': 'حزمة رقمية',
  'Business Template': 'قالب أعمال',
  'Developer Tool': 'أداة للمطورين',
  Extension: 'إضافة',
  'Digital Product': 'منتج رقمي',
  'SaaS workspace': 'مساحة عمل SaaS',
  'AI-assisted workspace': 'مساحة عمل بمساعدة الذكاء الاصطناعي',
  'Downloadable digital kit': 'حزمة رقمية قابلة للتنزيل',
  'Business template': 'قالب أعمال',
  'See the real preview, included features, and current offer.': 'شاهد المعاينة الحقيقية والميزات المضمنة والعرض الحالي.',
};

function normalizedCategory(category: string) {
  return category.trim().toLowerCase();
}

function categoryLabel(product: Product) {
  if (product.slug === 'summeca-invoiceflow') return 'Business SaaS';
  if (product.slug === 'summeca-leadfollow-ai') return 'AI Workflow';
  return CATEGORY_LABELS[normalizedCategory(product.category)] ?? 'Digital Product';
}

function kindForCategory(category: string): Exclude<CatalogKind, 'all'> {
  const normalized = normalizedCategory(category);
  if (AI_CATEGORIES.includes(normalized)) return 'ai';
  if (DIGITAL_KIT_CATEGORIES.includes(normalized) || TEMPLATE_CATEGORIES.includes(normalized)) {
    return 'digital';
  }
  return 'saas';
}

function productTypeLabel(product: Product) {
  if (product.slug === 'summeca-invoiceflow') return 'SaaS workspace';
  if (product.slug === 'summeca-leadfollow-ai') return 'AI-assisted workspace';

  const category = normalizedCategory(product.category);
  if (TEMPLATE_CATEGORIES.includes(category)) return 'Business template';
  if (DIGITAL_KIT_CATEGORIES.includes(category)) return 'Downloadable digital kit';
  if (AI_CATEGORIES.includes(category)) return 'AI-assisted workspace';
  return 'SaaS workspace';
}

function catalogPriority(product: Product) {
  if (product.slug === 'summeca-invoiceflow') return 0;
  if (product.slug === 'summeca-leadfollow-ai') return 1;

  const category = normalizedCategory(product.category);
  if (DIGITAL_KIT_CATEGORIES.includes(category)) return 2;
  if (TEMPLATE_CATEGORIES.includes(category)) return 3;
  return 4;
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

function updateCardTilt(event: ReactPointerEvent<HTMLElement>) {
  if (event.pointerType === 'touch') return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const rect = event.currentTarget.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
  const rotateX = (0.5 - y) * 8;
  const rotateY = (x - 0.5) * 10;

  event.currentTarget.style.setProperty('--card-rotate-x', `${rotateX.toFixed(2)}deg`);
  event.currentTarget.style.setProperty('--card-rotate-y', `${rotateY.toFixed(2)}deg`);
  event.currentTarget.style.setProperty('--card-glare-x', `${(x * 100).toFixed(1)}%`);
  event.currentTarget.style.setProperty('--card-glare-y', `${(y * 100).toFixed(1)}%`);
}

function resetCardTilt(event: ReactPointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty('--card-rotate-x', '0deg');
  event.currentTarget.style.setProperty('--card-rotate-y', '0deg');
  event.currentTarget.style.setProperty('--card-glare-x', '50%');
  event.currentTarget.style.setProperty('--card-glare-y', '35%');
}

function InteractiveProductCard({
  product,
  index,
  isArabic,
  localize,
}: {
  product: Product;
  index: number;
  isArabic: boolean;
  localize: (value: string) => string;
}) {
  const plan = lowestPlan(product.plans as ProductPlan[] | undefined);
  const price = plan ? pricingFor(plan) : null;
  const type = kindForCategory(product.category);
  const Icon = type === 'ai' ? Zap : type === 'digital' ? FileText : LayoutDashboard;
  const recommended = isRecommended(product);
  const displayCategory = localize(categoryLabel(product));
  const displayType = localize(productTypeLabel(product));
  const description = localize(
    product.short_desc ||
      product.description ||
      'See the real preview, included features, and current offer.'
  );

  return (
    <Link
      href={`/products/${product.slug}`}
      aria-label={`${localize('View product')}: ${localize(product.name)}`}
      className="summeca-catalog-enter group relative block h-full rounded-[22px] outline-none transition duration-200 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b1117] motion-reduce:transform-none"
      style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
    >
      <article
        onPointerMove={updateCardTilt}
        onPointerLeave={resetCardTilt}
        onPointerCancel={resetCardTilt}
        className={`summeca-product-card-3d relative flex h-full min-h-[510px] flex-col overflow-hidden rounded-[22px] border bg-[#101820] p-4 shadow-[0_16px_42px_rgba(0,0,0,.24)] transition-[border-color,box-shadow] duration-200 group-hover:shadow-[0_24px_64px_rgba(0,0,0,.42)] ${
          recommended
            ? 'border-cyan-300/45 ring-1 ring-cyan-300/10'
            : 'border-slate-700/80 group-hover:border-cyan-300/35'
        }`}
      >
        <Product3DShowcase
          name={localize(product.name)}
          thumbnailUrl={product.thumbnail_url}
          category={product.category}
          eyebrow={displayCategory}
          variant="card"
          className="summeca-product-card-3d-preview relative z-10"
        />

        <div className="summeca-product-card-3d-content relative z-20 flex flex-1 flex-col px-2 pb-2 pt-5">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.13em] text-cyan-300">
                <Icon size={12} aria-hidden="true" />
                <span>{displayCategory}</span>
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{displayType}</p>
              <h2 className="mt-2 line-clamp-2 text-xl font-black leading-6 tracking-tight text-white transition-colors group-hover:text-cyan-100">
                {localize(product.name)}
              </h2>
            </div>
            {recommended ? (
              <span className="shrink-0 rounded-md border border-cyan-300/25 bg-cyan-300/12 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-100">
                {localize('Recommended')}
              </span>
            ) : isFeatured(product) ? (
              <span className="shrink-0 rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-200">
                {localize('Featured')}
              </span>
            ) : null}
          </div>

          <p className="mt-3 line-clamp-3 min-h-[60px] text-sm leading-5 text-slate-400">
            {description}
          </p>

          <div className="mt-4 flex min-h-8 flex-wrap items-start gap-2">
            {(product.tags ?? []).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="max-w-full truncate rounded-md border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-[10px] font-semibold text-slate-400"
              >
                {localize(tag)}
              </span>
            ))}
            {(product.avg_rating ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <Star size={12} className="fill-current text-amber-400" aria-hidden="true" />
                <span className="font-bold text-white">{product.avg_rating?.toFixed(1)}</span>
                <span>({product.review_count})</span>
              </span>
            )}
          </div>

          <div className="mt-auto border-t border-white/[0.08] pt-5">
            <p className="mb-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
              {localize('Starting at')}
            </p>
            {!plan || !price ? (
              <span className="text-sm font-semibold text-slate-400">{localize('No active offer')}</span>
            ) : price.finalPrice === 0 ? (
              <span className="text-xl font-black text-emerald-300">{localize('Free')}</span>
            ) : (
              <div dir="ltr" className="flex flex-wrap items-baseline gap-1.5">
                {price.onSale && (
                  <span className="text-[11px] text-slate-500 line-through">
                    {money(price.regularPrice, plan.currency)}
                  </span>
                )}
                <span className="text-2xl font-black tracking-tight text-white">
                  {money(price.finalPrice, plan.currency)}
                  <span className="ml-0.5 text-xs font-normal text-slate-500">
                    {billingSuffix(plan.billing_period)}
                  </span>
                </span>
              </div>
            )}

            <span className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 text-xs font-black text-[#062027] transition duration-200 group-hover:bg-cyan-200 group-hover:shadow-[0_8px_24px_rgba(34,211,238,.16)]">
              {localize('View product')}
              <ArrowRight
                size={14}
                aria-hidden="true"
                className={isArabic ? 'rotate-180' : undefined}
              />
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
  const { isArabic, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('featured');
  const [filter, setFilter] = useState<CatalogKind>(kind);

  const localize = (value: string) => {
    if (!isArabic) return value;
    return CATALOG_AR[value] ?? t(value);
  };

  const products: Product[] = initialProducts;

  const visible = products
    .filter((product) => {
      const effectiveFilter = kind === 'all' ? filter : kind;
      if (effectiveFilter !== 'all' && kindForCategory(product.category) !== effectiveFilter) {
        return false;
      }
      const q = query.trim().toLocaleLowerCase(isArabic ? 'ar' : 'en');
      if (!q) return true;
      const searchable = [
        product.name,
        localize(product.name),
        product.short_desc ?? '',
        product.short_desc ? localize(product.short_desc) : '',
        categoryLabel(product),
        productTypeLabel(product),
        ...(product.tags ?? []),
      ];
      return searchable.some((value) =>
        value.toLocaleLowerCase(isArabic ? 'ar' : 'en').includes(q)
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

  const resetSearchAndFilters = () => {
    setQuery('');
    if (kind === 'all') setFilter('all');
  };

  const filterOptions: Array<{ value: CatalogKind; label: string }> = [
    { value: 'all', label: 'All products' },
    { value: 'ai', label: 'AI workflows' },
    { value: 'saas', label: 'Business SaaS' },
    { value: 'digital', label: 'Digital kits & templates' },
  ];

  return (
    <main
      dir={isArabic ? 'rtl' : 'ltr'}
      className="min-h-[75vh] overflow-x-clip bg-[#070b10] pt-[68px] text-white"
    >
      <style>{`
        @keyframes summeca-catalog-enter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .summeca-catalog-enter { animation: summeca-catalog-enter .22s cubic-bezier(.2,.8,.2,1) both; }
        .summeca-product-card-3d {
          --card-rotate-x: 0deg;
          --card-rotate-y: 0deg;
          --card-glare-x: 50%;
          --card-glare-y: 35%;
          transform: perspective(1100px) rotateX(var(--card-rotate-x)) rotateY(var(--card-rotate-y)) translateZ(0);
          transform-style: preserve-3d;
          transform-origin: center;
          will-change: transform;
          backface-visibility: hidden;
          transition:
            transform 170ms cubic-bezier(.2,.8,.2,1),
            border-color 200ms ease,
            box-shadow 200ms ease;
        }
        .summeca-product-card-3d::after {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 40;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0;
          background:
            radial-gradient(
              circle at var(--card-glare-x) var(--card-glare-y),
              rgba(103, 232, 249, .18) 0,
              rgba(34, 211, 238, .07) 18%,
              transparent 46%
            );
          mix-blend-mode: screen;
          transition: opacity 180ms ease;
        }
        .summeca-product-card-3d-preview,
        .summeca-product-card-3d-content {
          transform: translateZ(0);
          transition: transform 170ms cubic-bezier(.2,.8,.2,1);
          backface-visibility: hidden;
        }
        @media (hover: hover) and (pointer: fine) {
          .summeca-product-card-3d:hover::after { opacity: 1; }
          .summeca-product-card-3d-preview { transform: translateZ(28px); }
          .summeca-product-card-3d-content { transform: translateZ(18px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .summeca-catalog-enter { animation: none; }
          .summeca-product-card-3d,
          .summeca-product-card-3d-preview,
          .summeca-product-card-3d-content {
            transform: none !important;
            transition: none !important;
          }
          .summeca-product-card-3d::after { display: none; }
        }
      `}</style>

      <section className="relative overflow-hidden border-b border-white/[0.08]">
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
        <div className="relative mx-auto max-w-screen-xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
          <div className="summeca-catalog-enter inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">
            <Sparkles size={13} aria-hidden="true" /> {localize(eyebrow)}
          </div>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="summeca-catalog-enter max-w-4xl" style={{ animationDelay: '45ms' }}>
              <h1 className="text-4xl font-black leading-[1.02] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
                {localize(title)}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
                {localize(description)}
              </p>
              <div className="mt-7 flex flex-wrap gap-3 text-xs font-bold text-slate-300">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2">
                  <Boxes size={14} className="text-cyan-300" aria-hidden="true" />
                  {localize('Actual product previews')}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2">
                  <ShieldCheck size={14} className="text-cyan-300" aria-hidden="true" />
                  {localize('Protected checkout')}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2">
                  <Sparkles size={14} className="text-cyan-300" aria-hidden="true" />
                  {localize('Dedicated landing pages')}
                </span>
              </div>
            </div>
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-slate-200 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-reduce:transform-none"
            >
              {localize('View pricing')}
              <ArrowRight
                size={14}
                aria-hidden="true"
                className={isArabic ? 'rotate-180' : undefined}
              />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-screen-xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-9 flex flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div role="search" className="relative w-full md:max-w-md">
              <Search
                aria-hidden="true"
                className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${
                  isArabic ? 'right-3.5' : 'left-3.5'
                }`}
                size={16}
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={localize('Search products')}
                aria-label={localize('Search products')}
                className={`min-h-11 w-full rounded-lg border border-white/10 bg-white/[0.035] py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50 focus:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-cyan-300/30 ${
                  isArabic ? 'pl-11 pr-10 text-right' : 'pl-10 pr-11 text-left'
                }`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label={localize('Clear search')}
                  title={localize('Clear search')}
                  className={`absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${
                    isArabic ? 'left-1.5' : 'right-1.5'
                  }`}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max items-center gap-2 whitespace-nowrap">
                {kind === 'all' &&
                  filterOptions.map((option) => {
                    const selected = filter === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFilter(option.value)}
                        aria-pressed={selected}
                        className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                          selected
                            ? 'border border-cyan-200 bg-cyan-300 text-[#041014] shadow-[0_8px_24px_rgba(34,211,238,.18)]'
                            : 'border border-white/10 bg-white/[0.035] text-slate-400 hover:border-cyan-300/25 hover:text-white'
                        }`}
                      >
                        {selected && <Check size={13} aria-hidden="true" />}
                        {localize(option.label)}
                      </button>
                    );
                  })}
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                  className="min-h-11 shrink-0 rounded-lg border border-white/10 bg-[#101820] px-3.5 py-2.5 text-xs font-bold text-slate-300 outline-none transition hover:border-cyan-300/25 hover:text-white focus:border-cyan-300/50 focus-visible:ring-2 focus-visible:ring-cyan-300/30"
                  aria-label="Sort products"
                  title={localize('Sort products')}
                >
                  <option value="featured">{localize('Recommended')}</option>
                  <option value="newest">{localize('Newest')}</option>
                  <option value="price_asc">{localize('Price: low to high')}</option>
                  <option value="price_desc">{localize('Price: high to low')}</option>
                </select>
              </div>
            </div>
          </div>

          <p className="text-sm font-semibold text-slate-400" aria-live="polite" aria-atomic="true">
            {visible.length} {localize(visible.length === 1 ? 'product' : 'products')}
          </p>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-5 py-12 text-center sm:p-12">
            <Package className="mx-auto text-cyan-300" size={34} aria-hidden="true" />
            <h2 className="mt-4 text-xl font-black text-white">
              {localize('No products match your search.')}
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
              {localize('Try a different search or remove the active filters.')}
            </p>
            {(query || (kind === 'all' && filter !== 'all')) && (
              <button
                type="button"
                onClick={resetSearchAndFilters}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-2.5 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                {localize('Clear search and filters')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {visible.map((product, index) => (
              <InteractiveProductCard
                key={product.id}
                product={product}
                index={index}
                isArabic={isArabic}
                localize={localize}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
