'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Package, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getEffectivePrice } from '@/lib/pricing';

type BillingPeriod = 'one_time' | 'monthly' | 'yearly' | 'lifetime';

interface Plan {
  price: number;
  currency: string;
  billing_period: BillingPeriod;
  is_active: boolean;
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
  metadata: Record<string, unknown> | null;
  plans?: Plan[];
}

function pricingFor(plan: Plan) {
  try {
    return getEffectivePrice(plan);
  } catch {
    const regularPrice = Number(plan.price) || 0;
    return { regularPrice, finalPrice: regularPrice, onSale: false };
  }
}

function lowestPlan(plans?: Plan[]) {
  const active = (plans ?? []).filter((plan) => plan.is_active);
  if (!active.length) return null;
  return active.reduce((lowest, plan) => pricingFor(plan).finalPrice < pricingFor(lowest).finalPrice ? plan : lowest);
}

function money(value: number, currency: string) {
  if (value === 0) return 'Free';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);
  } catch {
    return `${currency} ${value % 1 === 0 ? value : value.toFixed(2)}`;
  }
}

function suffix(period: BillingPeriod) {
  if (period === 'monthly') return '/mo';
  if (period === 'yearly') return '/yr';
  if (period === 'lifetime') return ' lifetime';
  return '';
}

export default function FeaturedProducts() {
  const supabase = useMemo(() => createClient(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, short_desc, description, category, thumbnail_url, metadata,
          plans:product_plans(
            price, currency, billing_period, is_active,
            sale_price, sale_discount_type, sale_discount_value, sale_starts_at, sale_ends_at
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(12);

      if (!alive) return;
      if (error) {
        console.error('Featured product load failed:', error.message);
        setProducts([]);
      } else {
        const rows = (data ?? []) as Product[];
        const withOffer = rows.filter((product) => lowestPlan(product.plans));
        const featured = withOffer.filter((product) => Boolean(product.metadata?.featured || product.metadata?.is_featured));
        setProducts((featured.length ? featured : withOffer).slice(0, 4));
      }
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [supabase]);

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-screen-xl px-6 lg:px-8">
        <div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-3 py-1">
              <Sparkles size={11} className="text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Featured Products</span>
            </div>
            <h2 className="text-3xl font-extrabold text-foreground">Published offers from SUMMECA</h2>
            <p className="mt-2 max-w-md text-sm text-secondary-foreground">Only active products with a real production plan are shown here.</p>
          </div>
          <Link href="/products" className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-primary hover:underline">View all products <ArrowRight size={14} /></Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-56 animate-pulse rounded-2xl border border-border bg-secondary/30" />)}</div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-border bg-secondary/20 p-10 text-center">
            <Package size={24} className="mx-auto mb-3 text-primary" />
            <p className="font-bold text-foreground">The first production product is being prepared.</p>
            <p className="mt-1 text-sm text-muted-foreground">No demo product or placeholder price is being advertised.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => {
              const plan = lowestPlan(product.plans)!;
              const pricing = pricingFor(plan);
              return (
                <Link key={product.id} href={`/products/${product.slug}`} className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-primary/8">
                    {product.thumbnail_url ? <img src={product.thumbnail_url} alt="" className="h-full w-full object-cover" /> : <Package size={20} className="text-primary" />}
                  </div>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-primary">{product.category.replaceAll('_', ' ')}</p>
                  <h3 className="mt-1 text-sm font-bold text-foreground group-hover:text-primary">{product.name}</h3>
                  <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">{product.short_desc || product.description || 'Product details available on the product page.'}</p>
                  <div className="mt-5 border-t border-border pt-4">
                    {pricing.onSale && <span className="mr-1.5 text-[10px] text-muted-foreground line-through">{money(pricing.regularPrice, plan.currency)}</span>}
                    <span className={`text-sm font-bold ${pricing.finalPrice === 0 ? 'text-success' : 'text-foreground'}`}>{money(pricing.finalPrice, plan.currency)}{pricing.finalPrice > 0 && <span className="text-xs font-normal text-muted-foreground">{suffix(plan.billing_period)}</span>}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
