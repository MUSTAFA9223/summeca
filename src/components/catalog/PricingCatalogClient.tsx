import Link from 'next/link';
import { ArrowRight, CheckCircle2, Package, ShieldCheck } from 'lucide-react';
import { getEffectivePrice } from '@/lib/pricing';
import {
  getPublicCatalog,
  type PublicCatalogPlan,
} from '@/lib/catalog/publicCatalog';

function pricingFor(plan: PublicCatalogPlan) {
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

function billingLabel(period: PublicCatalogPlan['billing_period']) {
  if (period === 'monthly') return 'Monthly access';
  if (period === 'yearly') return 'Yearly access';
  if (period === 'lifetime') return 'Lifetime';
  return 'One-time';
}

function suffix(period: PublicCatalogPlan['billing_period']) {
  if (period === 'monthly') return '/mo';
  if (period === 'yearly') return '/yr';
  if (period === 'lifetime') return ' lifetime';
  return '';
}

export default async function PricingCatalogClient() {
  const products = await getPublicCatalog();

  return (
    <main className="min-h-[70vh] bg-background pt-[68px]">
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-5xl px-6 py-14 text-center sm:py-16 lg:px-8 lg:py-20">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Transparent Pricing</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground sm:text-5xl">
            Pick the tool your store needs. See the price first.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Prices below come directly from active SUMMECA production plans. No placeholder tiers and no hidden contact-sales step.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-screen-xl px-6 py-12 lg:px-8 lg:py-16">
        {products.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-card p-8 text-center sm:p-12">
            <Package className="mx-auto text-primary" size={32} />
            <h2 className="mt-4 text-2xl font-bold text-foreground">Pricing is temporarily unavailable</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              We could not load the active production catalog. Product pages remain the source of truth for currently available offers.
            </p>
            <Link href="/products" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline">
              Open product catalog <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {products.map((product) => (
              <article key={product.id} className="rounded-3xl border border-border bg-card p-5 sm:p-6 lg:p-8">
                <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {product.category.replaceAll('_', ' ')}
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-foreground">{product.name}</h2>
                    {product.short_desc && (
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        {product.short_desc}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/products/${product.slug}`}
                    className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    Product details <ArrowRight size={14} />
                  </Link>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {product.plans.map((plan) => {
                    const pricing = pricingFor(plan);
                    return (
                      <div key={plan.id} className="flex h-full flex-col rounded-2xl border border-border bg-background p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-foreground">{plan.name}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">{billingLabel(plan.billing_period)}</p>
                          </div>
                          {pricing.onSale && pricing.discountPercent > 0 && (
                            <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-bold text-success">
                              Save {pricing.discountPercent}%
                            </span>
                          )}
                        </div>

                        <div className="mt-5">
                          {pricing.onSale && (
                            <div className="text-xs text-muted-foreground line-through">
                              {money(pricing.regularPrice, plan.currency)}
                            </div>
                          )}
                          <div className="text-3xl font-black text-foreground">
                            {money(pricing.finalPrice, plan.currency)}
                            {pricing.finalPrice > 0 && (
                              <span className="text-sm font-normal text-muted-foreground">
                                {suffix(plan.billing_period)}
                              </span>
                            )}
                          </div>
                        </div>

                        {plan.description && (
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                        )}
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
                          <span className="btn-primary flex min-h-11 w-full items-center justify-center gap-2 text-sm">
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
