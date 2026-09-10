'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Package, ShieldCheck, Star } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import WishlistButton from '@/components/WishlistButton';
import SaasProductSalesExperience, { isSaasSalesSlug } from '@/components/catalog/SaasProductSalesExperience';
import { createClient } from '@/lib/supabase/client';
import { getEffectivePrice } from '@/lib/pricing';

type BillingPeriod = 'one_time' | 'monthly' | 'yearly' | 'lifetime';

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
  if (period === 'lifetime') return 'Lifetime';
  return 'One-time';
}

function suffix(period: BillingPeriod) {
  if (period === 'monthly') return '/mo';
  if (period === 'yearly') return '/yr';
  if (period === 'lifetime') return ' lifetime';
  return '';
}

export default function ProductDetailPage() {
  const params = useParams();
  const slug = String(params?.slug ?? '');
  const supabase = useMemo(() => createClient(), []);
  const [product, setProduct] = useState<Product | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
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
      setProduct(productData as Product);
      setPlans((plansResult.data ?? []) as Plan[]);
      setReviews((reviewsResult.data ?? []) as Review[]);
      setLoading(false);
    }

    load();
    return () => { alive = false; };
  }, [slug, supabase]);

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

  if (isSaasSalesSlug(product.slug)) {
    return <SaasProductSalesExperience product={product} plans={plans} />;
  }

  return (
    <div className="min-h-screen bg-background">
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
              <h2 className="mt-1 text-2xl font-bold text-foreground">Choose a published plan</h2>
            </div>
            <Link href="/pricing" className="text-sm font-semibold text-primary hover:underline">All pricing</Link>
          </div>

          {plans.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
              <p className="font-semibold text-foreground">No active offer is available for this product.</p>
              <p className="mt-2 text-sm text-muted-foreground">The product must have an active production plan before checkout can begin.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {plans.map((plan) => {
                const pricing = pricingFor(plan);
                return (
                  <article key={plan.id} className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
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
                    <Link
                      href={`/checkout?product_id=${encodeURIComponent(product.id)}&plan_id=${encodeURIComponent(plan.id)}`}
                      className="btn-primary mt-auto flex items-center justify-center gap-2 pt-3 text-sm"
                    >
                      {pricing.finalPrice === 0 ? 'Continue with free offer' : 'Continue to checkout'} <ArrowRight size={14} />
                    </Link>
                  </article>
                );
              })}
            </div>
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
                <li>• Downloads appear only when the purchased product includes a configured download entitlement.</li>
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
    </div>
  );
}

