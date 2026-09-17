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
        const recommended = withOffer.find((product) => product.slug === 'summeca-invoiceflow') ?? null;
        const featured = withOffer.filter((product) => Boolean(product.metadata?.featured || product.metadata?.is_featured));
        const ordered = [
          ...(recommended ? [recommended] : []),
          ...featured.filter((product) => product.id !== recommended?.id),
          ...withOffer.filter((product) => product.id !== recommended?.id && !featured.some((item) => item.id === product.id)),
        ];
        setProducts(ordered.slice(0, 4));
      }
      setLoading(false);
    }
    void load();
    return () => { alive = false; };
  }, [supabase]);

  return (
    <section className="bg-white py-20 sm:py-24">
      <style>{`
        @keyframes summeca-featured-enter {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .summeca-featured-enter { animation: summeca-featured-enter .5s cubic-bezier(.2,.8,.2,1) both; }
        @media (prefers-reduced-motion: reduce) { .summeca-featured-enter { animation: none; } }
      `}</style>
      <div className="mx-auto max-w-screen-xl px-6 lg:px-8">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="summeca-featured-enter">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-3 py-1">
              <Sparkles size={11} className="text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Featured Products</span>
            </div>
            <h2 className="text-3xl font-extrabold text-foreground">Tools ready to use</h2>
            <p className="mt-2 max-w-md text-sm text-secondary-foreground">Pick a product, review the real preview, and choose the plan that fits.</p>
          </div>
          <Link href="/products" className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-primary transition hover:gap-2 hover:underline">View all products <ArrowRight size={14} /></Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl border border-border bg-secondary/30" />)}</div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-border bg-secondary/20 p-10 text-center">
            <Package size={24} className="mx-auto mb-3 text-primary" />
            <p className="font-bold text-foreground">New products are being prepared.</p>
            <p className="mt-1 text-sm text-muted-foreground">Only active offers are shown here.</p>
          </div>
        ) : (
          <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product, index) => {
              const plan = lowestPlan(product.plans)!;
              const pricing = pricingFor(plan);
              const recommended = product.slug === 'summeca-invoiceflow';
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className={`summeca-featured-enter group relative flex h-full min-h-[310px] flex-col rounded-2xl border bg-card p-5 transition duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transform-none ${recommended ? 'border-primary/35 shadow-md shadow-primary/10' : 'border-border hover:border-primary/30'}`}
                  style={{ animationDelay: `${index * 65}ms` }}
                >
                  {recommended && (
                    <span className="absolute right-4 top-4 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                      Recommended
                    </span>
                  )}
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-primary/8 transition duration-200 group-hover:scale-[1.03] motion-reduce:transform-none">
                    {product.thumbnail_url ? <img src={product.thumbnail_url} alt={`${product.name} preview`} className="h-full w-full object-cover" /> : <Package size={22} className="text-primary" />}
                  </div>
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-primary">{categoryLabel(product.category)}</p>
                  <h3 className="mt-1 text-base font-black leading-6 text-foreground transition-colors group-hover:text-primary">{product.name}</h3>
                  <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">{product.short_desc || product.description || 'See the product preview and included features.'}</p>
                  <div className="mt-auto border-t border-border pt-4">
                    <div className="flex items-baseline gap-1.5">
                      {pricing.onSale && <span className="text-[10px] text-muted-foreground line-through">{money(pricing.regularPrice, plan.currency)}</span>}
                      <span className={`text-base font-black ${pricing.finalPrice === 0 ? 'text-success' : 'text-foreground'}`}>{money(pricing.finalPrice, plan.currency)}{pricing.finalPrice > 0 && <span className="text-xs font-normal text-muted-foreground">{suffix(plan.billing_period)}</span>}</span>
                    </div>
                    <span className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/8 px-3 text-xs font-black text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                      View product <ArrowRight size={13} />
                    </span>
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
