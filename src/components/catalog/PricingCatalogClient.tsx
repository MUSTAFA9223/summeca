'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Package, ShieldCheck } from 'lucide-react';
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
  short_desc: string | null;
  category: string;
  plans?: Plan[];
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

export default function PricingCatalogClient() {
  const supabase = useMemo(() => createClient(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data, error: loadError } = await supabase
        .from('products')
        .select(`
          id, name, slug, short_desc, category,
          plans:product_plans(
            id, name, description, price, currency, billing_period, features,
            is_active, sort_order, sale_price, sale_discount_type,
            sale_discount_value, sale_starts_at, sale_ends_at
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!alive) return;
      if (loadError) {
        console.error('Pricing catalog load failed:', loadError.message);
        setError('Published pricing could not be loaded. Please try again.');
        setProducts([]);
      } else {
        setProducts(((data ?? []) as Product[]).map((product) => ({
          ...product,
          plans: (product.plans ?? [])
            .filter((plan) => plan.is_active)
            .sort((a, b) => a.sort_order - b.sort_order),
        })).filter((product) => (product.plans?.length ?? 0) > 0));
      }
      setLoading(false);
    }

    load();
    return () => { alive = false; };
  }, [supabase]);

  return (
    <main className="min-h-[70vh] bg-background pt-[68px]">
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center lg:px-8 lg:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Published Pricing</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground sm:text-5xl">Real offers. No placeholder tiers.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Every price on this page comes from an active SUMMECA product plan and is the same plan used by checkout.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-screen-xl px-6 py-12 lg:px-8 lg:py-16">
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl border border-border bg-secondary/30" />)}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center text-sm text-destructive">{error}</div>
        ) : products.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-12 text-center">
            <Package className="mx-auto text-primary" size={32} />
            <h2 className="mt-4 text-2xl font-bold text-foreground">No production pricing is published yet</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The previous demo tiers have been removed. The first real product and its active plan will appear here automatically after it is reviewed and published.
            </p>
            <Link href="/products" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              Open product catalog <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {products.map((product) => (
              <article key={product.id} className="rounded-3xl border border-border bg-card p-6 lg:p-8">
                <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">{product.category.replaceAll('_', ' ')}</p>
                    <h2 className="mt-1 text-2xl font-bold text-foreground">{product.name}</h2>
                    {product.short_desc && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{product.short_desc}</p>}
                  </div>
                  <Link href={`/products/${product.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                    Product details <ArrowRight size={14} />
                  </Link>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {(product.plans ?? []).map((plan) => {
                    const pricing = pricingFor(plan);
                    return (
                      <div key={plan.id} className="flex h-full flex-col rounded-2xl border border-border bg-background p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-foreground">{plan.name}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">{billingLabel(plan.billing_period)}</p>
                          </div>
                          {pricing.onSale && pricing.discountPercent > 0 && (
                            <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-bold text-success">Save {pricing.discountPercent}%</span>
                          )}
                        </div>

                        <div className="mt-5">
                          {pricing.onSale && (
                            <div className="text-xs text-muted-foreground line-through">{money(pricing.regularPrice, plan.currency)}</div>
                          )}
                          <div className="text-3xl font-black text-foreground">
                            {money(pricing.finalPrice, plan.currency)}
                            {pricing.finalPrice > 0 && <span className="text-sm font-normal text-muted-foreground">{suffix(plan.billing_period)}</span>}
                          </div>
                        </div>

                        {plan.description && <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.description}</p>}
                        {(plan.features?.length ?? 0) > 0 && (
                          <ul className="mt-5 space-y-2.5">
                            {(plan.features ?? []).slice(0, 12).map((feature) => (
                              <li key={feature} className="flex items-start gap-2 text-sm text-secondary-foreground">
                                <CheckCircle2 className="mt-0.5 shrink-0 text-primary" size={14} />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        <Link href={`/products/${product.slug}`} className="mt-auto pt-6">
                          <span className="btn-primary flex w-full items-center justify-center gap-2 text-sm">
                            Review this offer <ArrowRight size={14} />
                          </span>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-6 text-secondary-foreground">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={18} />
            <p>
              Monthly and yearly labels describe the plan period shown by SUMMECA. Automatic renewal applies only when checkout and the payment provider explicitly state that a recurring billing agreement is being created. Access is granted only after a free order is completed or a paid transaction is verified server-side.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
