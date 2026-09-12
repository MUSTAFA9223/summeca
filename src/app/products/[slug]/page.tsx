'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileCheck2,
  LayoutDashboard,
  Layers3,
  Package,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Wallet,
} from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import WishlistButton from '@/components/WishlistButton';
import Product3DShowcase from '@/components/catalog/Product3DShowcase';
import SaasProductSalesExperience, { isSaasSalesSlug } from '@/components/catalog/SaasProductSalesExperience';
import { createClient } from '@/lib/supabase/client';
import { getEffectivePrice } from '@/lib/pricing';

type BillingPeriod = 'one_time' | 'monthly' | 'yearly' | 'lifetime';

type ProviderAvailability = {
  crypto: boolean | null;
  payoneer: boolean | null;
  fastspring: boolean | null;
};

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_period: BillingPeriod;
  features: string[] | null;
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
  description: string | null;
  short_desc: string | null;
  category: string;
  thumbnail_url: string | null;
  tags: string[] | null;
}

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  reviewer_name: string | null;
  is_verified: boolean;
  created_at: string;
}

function pricingFor(plan: Plan) {
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

function billingLabel(period: BillingPeriod) {
  if (period === 'monthly') return 'Monthly access';
  if (period === 'yearly') return 'Yearly access';
  if (period === 'lifetime') return 'Lifetime access';
  return 'One-time purchase';
}

function suffix(period: BillingPeriod) {
  if (period === 'monthly') return '/mo';
  if (period === 'yearly') return '/yr';
  if (period === 'lifetime') return ' lifetime';
  return '';
}

function isSaasProduct(product: Product) {
  return product.slug === 'summeca-invoiceflow' || product.slug === 'summeca-leadfollow-ai';
}

function isDigitalProduct(product: Product) {
  return product.category === 'template' || product.category === 'dataset';
}

function productCtaLabel(product: Product, plan: Plan, finalPrice: number) {
  if (finalPrice === 0) return 'Continue with free offer';
  if (product.slug === 'summeca-invoiceflow') return 'Get InvoiceFlow';
  if (product.slug === 'summeca-leadfollow-ai') return 'Get LeadFollow AI';
  if (product.slug === 'conversion-rescue-kit-starter') return 'Get Starter Kit';
  if (product.slug === 'conversion-rescue-kit-pro') return 'Get Pro Kit';
  if (product.slug === 'conversion-rescue-kit-ultimate') return 'Get Ultimate Kit';
  return `Get ${plan.name}`;
}

function categoryLabel(category: string) {
  return category.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ProductDetailPage() {
  const params = useParams();
  const slug = String(params?.slug ?? '');
  const supabase = useMemo(() => createClient(), []);
  const [product, setProduct] = useState<Product | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [providerAvailability, setProviderAvailability] = useState<ProviderAvailability>({
    crypto: null,
    payoneer: null,
    fastspring: null,
  });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let alive = true;

    async function load() {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name, slug, description, short_desc, category, thumbnail_url, tags')
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle();

      if (!alive) return;
      if (productError || !productData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const [plansResult, reviewsResult] = await Promise.all([
        supabase
          .from('product_plans')
          .select('id, name, description, price, currency, billing_period, features, is_active, sort_order, sale_price, sale_discount_type, sale_discount_value, sale_starts_at, sale_ends_at')
          .eq('product_id', productData.id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('reviews')
          .select('id, rating, title, body, reviewer_name, is_verified, created_at')
          .eq('product_id', productData.id)
          .eq('moderation_status', 'approved')
          .order('created_at', { ascending: false })
          .limit(12),
      ]);

      if (!alive) return;
      const activePlans = (plansResult.data ?? []) as Plan[];
      setProduct(productData as Product);
      setPlans(activePlans);
      setSelectedPlanId((current) => current || activePlans[0]?.id || '');
      setReviews((reviewsResult.data ?? []) as Review[]);
      setLoading(false);
    }

    void load();
    return () => { alive = false; };
  }, [slug, supabase]);

  useEffect(() => {
    let alive = true;

    async function checkProvider(url: string): Promise<boolean | null> {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) return null;
        const data = await response.json() as { available?: boolean };
        return data.available === true;
      } catch {
        return null;
      }
    }

    async function loadProviderAvailability() {
      const [crypto, payoneer, fastspring] = await Promise.all([
        checkProvider('/api/payment/crypto-status'),
        checkProvider('/api/payment/payoneer-status'),
        checkProvider('/api/payment/fastspring-status'),
      ]);
      if (!alive) return;
      setProviderAvailability({ crypto, payoneer, fastspring });
    }

    void loadProviderAvailability();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b10]">
        <PublicNav />
        <main className="mx-auto max-w-screen-xl px-6 pb-20 pt-32 lg:px-8">
          <div className="h-5 w-40 animate-pulse rounded-full bg-white/10" />
          <div className="mt-6 h-14 w-3/4 animate-pulse rounded-2xl bg-white/10" />
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-[32px] bg-white/[0.04]" />
            <div className="h-[480px] animate-pulse rounded-[32px] bg-white/[0.04]" />
          </div>
        </main>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNav />
        <main className="mx-auto flex max-w-xl flex-col items-center px-6 pb-20 pt-40 text-center">
          <Package size={34} className="text-primary" />
          <h1 className="mt-5 text-2xl font-bold text-foreground">Product not available</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">This product is not currently published for customers.</p>
          <Link href="/products" className="btn-primary mt-6 inline-flex items-center gap-2">
            Browse published products <ArrowRight size={14} />
          </Link>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length
    : 0;
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;
  const selectedPricing = selectedPlan ? pricingFor(selectedPlan) : null;
  const isSaas = isSaasProduct(product);
  const isDigital = isDigitalProduct(product);
  const availableProviders = [
    providerAvailability.crypto === true ? 'Crypto' : null,
    providerAvailability.payoneer === true ? 'Payoneer' : null,
    providerAvailability.fastspring === true ? 'FastSpring' : null,
  ].filter((provider): provider is string => Boolean(provider));
  const providerCheckComplete = Object.values(providerAvailability).every((value) => value !== null);
  const checkoutHref = selectedPlan
    ? `/checkout?product_id=${encodeURIComponent(product.id)}&plan_id=${encodeURIComponent(selectedPlan.id)}`
    : '/products';
  const ctaLabel = selectedPlan && selectedPricing
    ? productCtaLabel(product, selectedPlan, selectedPricing.finalPrice)
    : 'Choose a plan';
  const paymentSummary = selectedPricing?.finalPrice === 0
    ? 'No payment required for this offer.'
    : availableProviders.length > 0
      ? `${availableProviders.join(' / ')} checkout available.`
      : providerCheckComplete
        ? 'Payment methods are temporarily unavailable.'
        : 'Checking live payment availability…';
  const canCheckout = Boolean(
    selectedPlan
      && selectedPricing
      && (selectedPricing.finalPrice === 0 || !providerCheckComplete || availableProviders.length > 0),
  );
  const selectedFeatures = selectedPlan?.features ?? [];
  const heroFeatures = selectedFeatures.length > 0
    ? selectedFeatures.slice(0, 4)
    : (product.tags ?? []).slice(0, 4);

  if (isSaasSalesSlug(product.slug)) {
    return <SaasProductSalesExperience product={product} plans={plans} />;
  }

  return (
    <div className="min-h-screen bg-[#070b10] pb-24 text-white md:pb-0">
      <PublicNav />
      <main className="overflow-hidden pt-[68px]">
        <section className="relative min-h-[650px] overflow-hidden border-b border-white/[0.08]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_73%_26%,rgba(34,211,238,.15),transparent_30%),radial-gradient(circle_at_12%_58%,rgba(20,184,166,.09),transparent_31%)]" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.10]"
            style={{
              backgroundImage: 'linear-gradient(rgba(34,211,238,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.18) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'linear-gradient(to bottom, black, transparent 90%)',
            }}
          />
          <div className="relative mx-auto grid max-w-screen-xl items-center gap-10 px-6 py-12 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-16">
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Link href="/products" className="font-bold text-cyan-300 transition hover:text-cyan-200">Products</Link>
                <span>/</span>
                <span>{categoryLabel(product.category)}</span>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                <Sparkles size={13} />
                Premium digital product
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
                {product.name}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
                {product.short_desc || product.description || 'A production-ready SUMMECA product built to make a focused workflow faster and easier to execute.'}
              </p>

              {heroFeatures.length > 0 && (
                <div className="mt-7 grid gap-2 sm:grid-cols-2">
                  {heroFeatures.map((feature) => (
                    <span key={feature} className="flex items-start gap-2 text-sm leading-6 text-slate-300">
                      <CheckCircle2 size={15} className="mt-1 shrink-0 text-cyan-300" />
                      {feature}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-end gap-6">
                {selectedPlan && selectedPricing ? (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Current offer</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      {selectedPricing.onSale && (
                        <span className="text-sm text-slate-600 line-through">
                          {money(selectedPricing.regularPrice, selectedPlan.currency)}
                        </span>
                      )}
                      <span className="text-4xl font-black text-white">
                        {money(selectedPricing.finalPrice, selectedPlan.currency)}
                      </span>
                      {selectedPricing.finalPrice > 0 && (
                        <span className="text-sm font-semibold text-slate-500">{suffix(selectedPlan.billing_period)}</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{selectedPlan.name} · {billingLabel(selectedPlan.billing_period)}</p>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-400">No active offer is available right now.</p>
                )}
                <WishlistButton productId={product.id} productName={product.name} size="sm" />
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {canCheckout ? (
                  <Link
                    href={checkoutHref}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-cyan-300 px-7 text-sm font-black text-[#041014] shadow-[0_16px_42px_rgba(34,211,238,.22)] transition hover:-translate-y-1 hover:shadow-[0_22px_54px_rgba(34,211,238,.32)]"
                  >
                    {ctaLabel} <ArrowRight size={16} />
                  </Link>
                ) : (
                  <span className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-7 text-sm font-bold text-slate-500">
                    Payment temporarily unavailable
                  </span>
                )}
                <Link
                  href="#plans"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-7 text-sm font-bold text-slate-200 transition hover:border-cyan-300/30 hover:text-cyan-200"
                >
                  Compare offers
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 text-[11px] font-bold text-slate-500">
                <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-cyan-300" /> Provider-confirmed checkout</span>
                <span className="inline-flex items-center gap-1.5"><Wallet size={13} className="text-cyan-300" /> {paymentSummary}</span>
                {averageRating > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <Star size={12} className="fill-current text-amber-400" />
                    {averageRating.toFixed(1)} · {reviews.length} approved review{reviews.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>

            <Product3DShowcase
              name={product.name}
              thumbnailUrl={product.thumbnail_url}
              category={product.category}
              eyebrow={categoryLabel(product.category)}
              variant="hero"
              badge="Pointer reactive"
              className="relative z-10"
            />
          </div>
        </section>

        <section className="border-b border-white/[0.08] bg-[#090e14]">
          <div className="mx-auto grid max-w-screen-xl gap-4 px-6 py-8 sm:grid-cols-3 lg:px-8">
            {[
              {
                icon: Layers3,
                title: 'Clear deliverable',
                text: isDigital ? 'Protected digital delivery tied to the completed order.' : 'Account-based access tied to the completed order.',
              },
              {
                icon: ShieldCheck,
                title: 'Protected purchase',
                text: 'The server verifies product, plan, price and payment state before access.',
              },
              {
                icon: Target,
                title: 'Built for action',
                text: 'Focused content and assets designed around a practical business workflow.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                <Icon size={19} className="text-cyan-300" />
                <h2 className="mt-3 text-sm font-black text-white">{title}</h2>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="plans" className="scroll-mt-24 mx-auto max-w-screen-xl px-6 py-14 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Choose your offer</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Pick the version that fits what you need</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
              Select a plan below. The exact product, plan, price and currency are checked again by the protected checkout flow.
            </p>
          </div>

          {plans.length === 0 ? (
            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.025] p-9 text-center">
              <p className="font-bold text-white">No active offer is available for this product.</p>
              <p className="mt-2 text-sm text-slate-500">A production plan must be active before checkout can begin.</p>
            </div>
          ) : (
            <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {plans.map((plan) => {
                const pricing = pricingFor(plan);
                const selected = selectedPlan?.id === plan.id;
                return (
                  <article
                    key={plan.id}
                    className={`relative flex h-full flex-col overflow-hidden rounded-[28px] border p-6 transition ${
                      selected
                        ? 'border-cyan-300/45 bg-cyan-300/[0.055] shadow-[0_24px_65px_rgba(34,211,238,.08)]'
                        : 'border-white/10 bg-white/[0.025] hover:border-cyan-300/25'
                    }`}
                  >
                    {selected && <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black text-white">{plan.name}</h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{billingLabel(plan.billing_period)}</p>
                      </div>
                      {selected && (
                        <span className="rounded-full bg-cyan-300 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#041014]">Selected</span>
                      )}
                    </div>
                    <div className="mt-6">
                      {pricing.onSale && (
                        <p className="text-xs text-slate-600 line-through">{money(pricing.regularPrice, plan.currency)}</p>
                      )}
                      <p className="text-3xl font-black text-white">
                        {money(pricing.finalPrice, plan.currency)}
                        {pricing.finalPrice > 0 && <span className="text-sm font-normal text-slate-500">{suffix(plan.billing_period)}</span>}
                      </p>
                      {pricing.onSale && pricing.discountPercent > 0 && (
                        <p className="mt-1 text-xs font-bold text-emerald-300">Save {pricing.discountPercent}%</p>
                      )}
                    </div>
                    {plan.description && <p className="mt-4 text-sm leading-6 text-slate-400">{plan.description}</p>}
                    {(plan.features?.length ?? 0) > 0 && (
                      <ul className="mt-5 space-y-2.5">
                        {(plan.features ?? []).map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-sm leading-5 text-slate-300">
                            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-cyan-300" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      aria-pressed={selected}
                      className={`mt-auto rounded-xl border px-4 py-3 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                        selected
                          ? 'border-cyan-300 bg-cyan-300 text-[#041014]'
                          : 'border-white/10 bg-white/[0.03] text-white hover:border-cyan-300/30 hover:text-cyan-200'
                      }`}
                    >
                      {selected ? 'Selected plan' : `Select ${plan.name}`}
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          {selectedPlan && selectedPricing && (
            <div className="mt-8 grid gap-7 overflow-hidden rounded-[32px] border border-cyan-300/18 bg-[radial-gradient(circle_at_88%_20%,rgba(34,211,238,.10),transparent_28%),rgba(255,255,255,.025)] p-6 lg:grid-cols-[1fr_320px] lg:items-center lg:p-8">
              <div>
                <div className="flex items-center gap-2 text-cyan-300">
                  {isSaas ? <LayoutDashboard size={18} /> : isDigital ? <Download size={18} /> : <Package size={18} />}
                  <p className="text-xs font-black uppercase tracking-[0.18em]">What you get</p>
                </div>
                <h3 className="mt-3 text-2xl font-black text-white">{selectedPlan.name}</h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                  {isSaas
                    ? 'After verified payment, access is unlocked in your SUMMECA account. This SaaS product does not require a downloadable ZIP package.'
                    : isDigital
                      ? 'After verified payment, the purchase appears in your SUMMECA account and the protected ZIP package becomes available through the configured download entitlement.'
                      : 'After the protected checkout completes, the product is delivered according to its configured account entitlement.'}
                </p>
                <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-cyan-300" /> Provider-confirmed payment</span>
                  <span className="inline-flex items-center gap-1.5"><Wallet size={13} className="text-cyan-300" /> {paymentSummary}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#070b10]/75 p-5 backdrop-blur-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Selected offer</p>
                <p className="mt-1 font-black text-white">{selectedPlan.name}</p>
                <p className="mt-2 text-3xl font-black text-white">
                  {money(selectedPricing.finalPrice, selectedPlan.currency)}
                  {selectedPricing.finalPrice > 0 && <span className="text-xs font-normal text-slate-500">{suffix(selectedPlan.billing_period)}</span>}
                </p>
                {canCheckout ? (
                  <Link href={checkoutHref} className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-full bg-cyan-300 px-5 text-sm font-black text-[#041014] transition hover:bg-cyan-200">
                    {ctaLabel} <ArrowRight size={14} />
                  </Link>
                ) : (
                  <div className="mt-5 rounded-xl bg-white/[0.04] px-4 py-3 text-center text-sm font-semibold text-slate-500">
                    Payment temporarily unavailable
                  </div>
                )}
                <p className="mt-3 text-center text-[10px] leading-4 text-slate-600">
                  Access is unlocked only after the payment provider confirms the transaction.
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="border-y border-white/[0.08] bg-[#090e14]">
          <div className="mx-auto grid max-w-screen-xl gap-10 px-6 py-14 lg:grid-cols-[1.12fr_.88fr] lg:px-8 lg:py-20">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">About the product</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Everything important before you buy</h2>
              <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-400">
                {product.description || product.short_desc || 'No additional description has been published.'}
              </p>
              {(product.tags?.length ?? 0) > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {(product.tags ?? []).map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-400">{tag}</span>
                  ))}
                </div>
              )}
            </div>

            <aside className="rounded-[28px] border border-cyan-300/16 bg-cyan-300/[0.035] p-6">
              <div className="flex items-center gap-2 text-cyan-300">
                <ShieldCheck size={18} />
                <h3 className="font-black">Purchase & access notes</h3>
              </div>
              <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-400">
                <li>• Paid access is granted only after the payment provider confirms the transaction server-side.</li>
                <li>• Free offers are completed through the protected order flow before access is granted.</li>
                {isSaas ? (
                  <li>• This SaaS product unlocks inside your SUMMECA account after verified payment; it is not presented as a downloadable ZIP.</li>
                ) : isDigital ? (
                  <li>• The protected digital download appears in your SUMMECA account only after the purchase is confirmed.</li>
                ) : (
                  <li>• Delivery follows the product entitlement configured for this offer.</li>
                )}
                <li>• Monthly or yearly labels describe the plan period. Automatic renewal exists only if checkout explicitly states recurring billing.</li>
                <li>• Refund requests are reviewed under the published Refund Policy; this page does not promise a guaranteed refund window.</li>
              </ul>
              <div className="mt-5 flex flex-wrap gap-3 text-xs font-bold text-cyan-300">
                <Link href="/refunds" className="hover:underline">Refund Policy</Link>
                <Link href="/terms" className="hover:underline">Terms</Link>
                <Link href="/support" className="hover:underline">Support</Link>
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto max-w-screen-xl px-6 py-14 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">How it works</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">From product page to protected access</h2>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {[
              ['01', 'Choose your offer', 'Select the active plan that matches the version or access level you want.'],
              ['02', 'Complete protected checkout', 'SUMMECA re-checks the exact product, plan, price, currency and payment readiness.'],
              ['03', 'Receive verified access', isDigital ? 'The protected download becomes available after the completed order is confirmed.' : 'The configured account entitlement is unlocked after the completed order is confirmed.'],
            ].map(([number, title, text]) => (
              <article key={number} className="rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-6">
                <span className="text-3xl font-black text-cyan-300/35">{number}</span>
                <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </section>

        {reviews.length > 0 && (
          <section className="border-y border-white/[0.08] bg-[#090e14]">
            <div className="mx-auto max-w-screen-xl px-6 py-14 lg:px-8 lg:py-20">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Customer feedback</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Approved customer reviews</h2>
              <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-white">{review.reviewer_name || 'Customer'}</span>
                      {review.is_verified && <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Verified buyer</span>}
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-amber-400">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star key={index} size={12} className={index < Math.round(review.rating) ? 'fill-current' : 'opacity-20'} />
                      ))}
                    </div>
                    {review.title && <h3 className="mt-3 text-sm font-black text-white">{review.title}</h3>}
                    {review.body && <p className="mt-2 text-sm leading-6 text-slate-400">{review.body}</p>}
                    <p className="mt-4 text-xs text-slate-600">{new Date(review.created_at).toLocaleDateString('en-US')}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="mx-auto max-w-screen-xl px-6 py-14 lg:px-8 lg:py-20">
          <div className="relative overflow-hidden rounded-[34px] border border-cyan-300/18 bg-[radial-gradient(circle_at_85%_20%,rgba(34,211,238,.15),transparent_30%),rgba(255,255,255,.025)] p-7 sm:p-10">
            <div className="relative z-10 max-w-3xl">
              <div className="flex items-center gap-2 text-cyan-300">
                <FileCheck2 size={18} />
                <p className="text-xs font-black uppercase tracking-[0.18em]">Ready when you are</p>
              </div>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Get {product.name} through the protected SUMMECA checkout.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
                Your selected plan, current price and delivery entitlement stay connected to the same verified order flow.
              </p>
              {canCheckout && selectedPlan && selectedPricing && (
                <Link href={checkoutHref} className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cyan-300 px-7 text-sm font-black text-[#041014] transition hover:bg-cyan-200">
                  {ctaLabel} · {money(selectedPricing.finalPrice, selectedPlan.currency)} <ArrowRight size={15} />
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />

      {selectedPlan && selectedPricing && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#070b10]/95 px-4 pt-3 shadow-[0_-12px_30px_rgba(0,0,0,.35)] backdrop-blur-xl md:hidden"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
        >
          <div className="mx-auto flex max-w-screen-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-bold text-slate-500">{selectedPlan.name} · {billingLabel(selectedPlan.billing_period)}</p>
              <p className="text-lg font-black text-white">
                {money(selectedPricing.finalPrice, selectedPlan.currency)}
                {selectedPricing.finalPrice > 0 ? suffix(selectedPlan.billing_period) : ''}
              </p>
            </div>
            {canCheckout ? (
              <Link href={checkoutHref} className="shrink-0 rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-[#041014]">
                {ctaLabel}
              </Link>
            ) : (
              <span className="rounded-xl bg-white/[0.04] px-4 py-3 text-xs font-semibold text-slate-500">Unavailable</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
