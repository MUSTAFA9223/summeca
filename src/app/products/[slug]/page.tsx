'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  LayoutDashboard,
  Package,
  ShieldCheck,
  Star,
  Wallet,
} from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import WishlistButton from '@/components/WishlistButton';
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

    load();
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
      <div className="min-h-screen bg-background">
        <PublicNav />
        <main className="mx-auto max-w-screen-xl px-6 pb-20 pt-28 lg:px-8">
          <div className="h-10 w-2/3 animate-pulse rounded-xl bg-secondary" />
          <div className="mt-5 h-5 w-full animate-pulse rounded-lg bg-secondary" />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl border border-border bg-secondary/30" />)}
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
          <Link href="/products" className="btn-primary mt-6 inline-flex items-center gap-2">Browse published products <ArrowRight size={14} /></Link>
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

  if (isSaasSalesSlug(product.slug)) {
    return <SaasProductSalesExperience product={product} plans={plans} />;
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <PublicNav />
      <main className="pt-[68px]">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto grid max-w-screen-xl gap-10 px-6 py-14 lg:grid-cols-[1fr_320px] lg:px-8 lg:py-18">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Link href="/products" className="hover:text-primary">Products</Link>
                <span>/</span>
                <span className="capitalize">{product.category.replaceAll('_', ' ')}</span>
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight text-foreground sm:text-5xl">{product.name}</h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">
                {product.short_desc || product.description || 'Product details are available below.'}
              </p>

              {selectedPlan && selectedPricing && (
                <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-primary">
                    {selectedPlan.name} · {money(selectedPricing.finalPrice, selectedPlan.currency)}{selectedPricing.finalPrice > 0 ? suffix(selectedPlan.billing_period) : ''}
                  </span>
                  <span className="rounded-full border border-border bg-card px-3 py-1.5 text-secondary-foreground">
                    {isSaas ? 'Account access' : isDigital ? 'Protected ZIP delivery' : 'Account-based delivery'}
                  </span>
                  <span className="rounded-full border border-border bg-card px-3 py-1.5 text-secondary-foreground">
                    {paymentSummary}
                  </span>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {averageRating > 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Star size={14} className="fill-current text-amber-500" />
                    <span className="font-bold text-foreground">{averageRating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({reviews.length} approved review{reviews.length === 1 ? '' : 's'})</span>
                  </div>
                )}
                <WishlistButton productId={product.id} productName={product.name} size="sm" />
              </div>
            </div>
            <div className="flex min-h-56 items-center justify-center overflow-hidden rounded-3xl border border-border bg-card">
              {product.thumbnail_url
                ? <img src={product.thumbnail_url} alt={product.name} className="h-full max-h-72 w-full object-cover" />
                : <Package size={56} className="text-primary/50" />}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-screen-xl px-6 py-12 lg:px-8 lg:py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Available offers</p>
              <h2 className="mt-1 text-2xl font-bold text-foreground">Choose your plan</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Select a plan below. The exact product, plan, price and currency are checked again by the protected checkout flow.
              </p>
            </div>
            <Link href="/pricing" className="hidden text-sm font-semibold text-primary hover:underline sm:inline">All pricing</Link>
          </div>

          {plans.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
              <p className="font-semibold text-foreground">No active offer is available for this product.</p>
              <p className="mt-2 text-sm text-muted-foreground">The product must have an active production plan before checkout can begin.</p>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {plans.map((plan) => {
                  const pricing = pricingFor(plan);
                  const selected = selectedPlan?.id === plan.id;
                  return (
                    <article
                      key={plan.id}
                      className={`flex h-full flex-col rounded-2xl border p-6 text-left shadow-sm transition ${
                        selected
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border bg-card hover:border-primary/30 hover:shadow-md'
                      }`}
                    >
                      <div className="flex w-full items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                            {selected && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Selected</span>}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{billingLabel(plan.billing_period)}</p>
                        </div>
                        {pricing.onSale && pricing.discountPercent > 0 && (
                          <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-bold text-success">Save {pricing.discountPercent}%</span>
                        )}
                      </div>
                      <div className="mt-5">
                        {pricing.onSale && <p className="text-xs text-muted-foreground line-through">{money(pricing.regularPrice, plan.currency)}</p>}
                        <p className="text-3xl font-black text-foreground">
                          {money(pricing.finalPrice, plan.currency)}
                          {pricing.finalPrice > 0 && <span className="text-sm font-normal text-muted-foreground">{suffix(plan.billing_period)}</span>}
                        </p>
                      </div>
                      {plan.description && <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.description}</p>}
                      {(plan.features?.length ?? 0) > 0 && (
                        <ul className="mt-5 space-y-2.5">
                          {(plan.features ?? []).map((feature) => (
                            <li key={feature} className="flex items-start gap-2 text-sm text-secondary-foreground">
                              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-primary" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        aria-pressed={selected}
                        className={`mt-auto rounded-xl border px-4 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                          selected
                            ? 'border-primary bg-primary text-white'
                            : 'border-border bg-background text-foreground hover:border-primary/40 hover:text-primary'
                        }`}
                      >
                        {selected ? 'Selected plan' : `Select ${plan.name}`}
                      </button>
                    </article>
                  );
                })}
              </div>

              {selectedPlan && selectedPricing && (
                <div className="mt-8 grid gap-6 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
                  <div>
                    <div className="flex items-center gap-2 text-primary">
                      {isSaas ? <LayoutDashboard size={18} /> : isDigital ? <Download size={18} /> : <Package size={18} />}
                      <p className="text-xs font-bold uppercase tracking-wider">What you get</p>
                    </div>
                    <h3 className="mt-2 text-xl font-bold text-foreground">{selectedPlan.name} · {billingLabel(selectedPlan.billing_period)}</h3>
                    <p className="mt-2 text-sm leading-6 text-secondary-foreground">
                      {isSaas
                        ? 'After verified payment, access is unlocked in your SUMMECA account. This SaaS product does not require a downloadable ZIP package.'
                        : isDigital
                          ? 'After verified payment, the purchase appears in your SUMMECA account and the protected ZIP package becomes available through the configured download entitlement.'
                          : 'After the protected checkout completes, the product is delivered according to its configured account entitlement.'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-primary" />Provider-confirmed payment</span>
                      <span className="inline-flex items-center gap-1.5"><Wallet size={13} className="text-primary" />{paymentSummary}</span>
                    </div>
                  </div>
                  <div className="min-w-[220px] rounded-2xl border border-border bg-background/80 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selected plan</p>
                    <p className="mt-1 font-bold text-foreground">{selectedPlan.name}</p>
                    <p className="mt-2 text-2xl font-black text-foreground">
                      {money(selectedPricing.finalPrice, selectedPlan.currency)}
                      {selectedPricing.finalPrice > 0 && <span className="text-xs font-normal text-muted-foreground">{suffix(selectedPlan.billing_period)}</span>}
                    </p>
                    {selectedPricing.finalPrice > 0 && providerCheckComplete && availableProviders.length === 0 ? (
                      <div className="mt-4 rounded-xl bg-secondary px-4 py-3 text-center text-sm font-semibold text-muted-foreground">
                        Payment temporarily unavailable
                      </div>
                    ) : (
                      <Link href={checkoutHref} className="btn-primary mt-4 flex items-center justify-center gap-2 text-sm">
                        {ctaLabel} <ArrowRight size={14} />
                      </Link>
                    )}
                    <p className="mt-3 text-center text-[11px] leading-4 text-muted-foreground">
                      Payment is confirmed by the provider before paid access is unlocked.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="border-y border-border bg-secondary/20">
          <div className="mx-auto grid max-w-screen-xl gap-8 px-6 py-12 lg:grid-cols-[1fr_360px] lg:px-8 lg:py-16">
            <div>
              <h2 className="text-2xl font-bold text-foreground">About this product</h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-secondary-foreground">
                {product.description || product.short_desc || 'No additional description has been published.'}
              </p>
              {(product.tags?.length ?? 0) > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {(product.tags ?? []).map((tag) => <span key={tag} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">{tag}</span>)}
                </div>
              )}
            </div>
            <aside className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div className="flex items-center gap-2 text-primary"><ShieldCheck size={18} /><h3 className="font-bold">Purchase & access notes</h3></div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-secondary-foreground">
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
              <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold text-primary">
                <Link href="/refunds" className="hover:underline">Refund Policy</Link>
                <Link href="/terms" className="hover:underline">Terms</Link>
                <Link href="/support" className="hover:underline">Support</Link>
              </div>
            </aside>
          </div>
        </section>

        {reviews.length > 0 && (
          <section className="mx-auto max-w-screen-xl px-6 py-12 lg:px-8 lg:py-16">
            <h2 className="text-2xl font-bold text-foreground">Approved customer reviews</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <article key={review.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-foreground">{review.reviewer_name || 'Customer'}</span>
                    {review.is_verified && <span className="text-xs font-semibold text-success">Verified buyer</span>}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, index) => <Star key={index} size={12} className={index < Math.round(review.rating) ? 'fill-current' : 'opacity-20'} />)}
                  </div>
                  {review.title && <h3 className="mt-3 text-sm font-bold text-foreground">{review.title}</h3>}
                  {review.body && <p className="mt-2 text-sm leading-6 text-muted-foreground">{review.body}</p>}
                  <p className="mt-4 text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString('en-US')}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
      <PublicFooter />

      {selectedPlan && selectedPricing && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
        >
          <div className="mx-auto flex max-w-screen-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-muted-foreground">{selectedPlan.name} · {billingLabel(selectedPlan.billing_period)}</p>
              <p className="text-lg font-black text-foreground">{money(selectedPricing.finalPrice, selectedPlan.currency)}{selectedPricing.finalPrice > 0 ? suffix(selectedPlan.billing_period) : ''}</p>
            </div>
            {selectedPricing.finalPrice > 0 && providerCheckComplete && availableProviders.length === 0 ? (
              <span className="rounded-xl bg-secondary px-4 py-3 text-xs font-semibold text-muted-foreground">Unavailable</span>
            ) : (
              <Link href={checkoutHref} className="btn-primary shrink-0 px-4 py-3 text-sm">
                {ctaLabel}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

