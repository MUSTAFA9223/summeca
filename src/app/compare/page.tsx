'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, GitCompare, Package, Plus, Search, Star, X } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
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
  category: string;
  thumbnail_url: string | null;
  tags: string[] | null;
  plans?: Plan[];
  avg_rating?: number;
  review_count?: number;
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

function billingLabel(period: BillingPeriod) {
  if (period === 'monthly') return 'Monthly';
  if (period === 'yearly') return 'Yearly';
  if (period === 'lifetime') return 'Lifetime';
  return 'One-time';
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    ai_tool: 'AI Tool', api: 'API', plugin: 'Plugin', template: 'Template', dataset: 'Dataset', course: 'Course', other: 'SaaS',
  };
  return labels[category] ?? 'Product';
}

export default function ComparePage() {
  const supabase = useMemo(() => createClient(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, short_desc, category, thumbnail_url, tags,
          plans:product_plans(
            price, currency, billing_period, is_active,
            sale_price, sale_discount_type, sale_discount_value, sale_starts_at, sale_ends_at
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!alive) return;
      if (error) {
        console.error('Comparison catalog load failed:', error.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as Product[];
      const ids = rows.map((product) => product.id);
      const ratingMap: Record<string, { sum: number; count: number }> = {};

      if (ids.length) {
        const { data: reviews } = await supabase
          .from('reviews')
          .select('product_id, rating')
          .in('product_id', ids)
          .eq('moderation_status', 'approved');
        for (const review of reviews ?? []) {
          if (!ratingMap[review.product_id]) ratingMap[review.product_id] = { sum: 0, count: 0 };
          ratingMap[review.product_id].sum += Number(review.rating) || 0;
          ratingMap[review.product_id].count += 1;
        }
      }

      const enriched = rows.map((product) => ({
        ...product,
        avg_rating: ratingMap[product.id] ? ratingMap[product.id].sum / ratingMap[product.id].count : 0,
        review_count: ratingMap[product.id]?.count ?? 0,
      }));
      setProducts(enriched);
      setSelectedIds(enriched.slice(0, Math.min(2, enriched.length)).map((product) => product.id));
      setLoading(false);
    }

    load();
    return () => { alive = false; };
  }, [supabase]);

  const selected = selectedIds.map((id) => products.find((product) => product.id === id)).filter(Boolean) as Product[];
  const candidates = products.filter((product) => !selectedIds.includes(product.id) && (
    !query.trim() || product.name.toLowerCase().includes(query.toLowerCase()) || product.category.toLowerCase().includes(query.toLowerCase())
  ));

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="pt-[68px]">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-screen-xl px-6 py-16 lg:px-8">
            <div className="flex items-center gap-2 text-primary"><GitCompare size={18} /><span className="text-xs font-bold uppercase tracking-wider">Comparison</span></div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground sm:text-5xl">Compare published products</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Compare only facts stored on active SUMMECA products and plans. No inferred platform support, trial availability, or “best value” claims are generated here.</p>
          </div>
        </section>

        <section className="mx-auto max-w-screen-xl px-6 py-12 lg:px-8">
          {loading ? (
            <div className="h-64 animate-pulse rounded-3xl border border-border bg-secondary/30" />
          ) : products.length === 0 ? (
            <div className="rounded-3xl border border-border bg-card p-12 text-center">
              <Package size={30} className="mx-auto text-primary" />
              <h2 className="mt-4 text-xl font-bold text-foreground">Nothing to compare yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">Published products will become available for comparison after the first production product is launched.</p>
            </div>
          ) : (
            <>
              <div className="mb-8 rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-bold text-foreground">Choose up to four products</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{selected.length} selected</p>
                  </div>
                  {selected.length < 4 && (
                    <div className="relative w-full sm:max-w-sm">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find another product" className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" />
                    </div>
                  )}
                </div>
                {selected.length < 4 && candidates.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {candidates.slice(0, 8).map((product) => (
                      <button key={product.id} onClick={() => setSelectedIds((ids) => [...ids, product.id])} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:border-primary/40">
                        <Plus size={12} /> {product.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selected.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Choose a published product to start comparing.</div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                  <table className="w-full min-w-[760px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="w-44 p-4 text-left font-semibold text-muted-foreground">Product</th>
                        {selected.map((product) => (
                          <th key={product.id} className="min-w-52 border-l border-border p-4 text-left align-top">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-bold text-foreground">{product.name}</div>
                                <div className="mt-1 text-xs font-normal text-muted-foreground">{categoryLabel(product.category)}</div>
                              </div>
                              <button onClick={() => setSelectedIds((ids) => ids.filter((id) => id !== product.id))} aria-label={`Remove ${product.name}`} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"><X size={14} /></button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <CompareRow label="Starting price" products={selected} render={(product) => {
                        const plan = lowestPlan(product.plans);
                        if (!plan) return 'No active offer';
                        return money(pricingFor(plan).finalPrice, plan.currency);
                      }} />
                      <CompareRow label="Billing options" products={selected} render={(product) => {
                        const periods = Array.from(new Set((product.plans ?? []).filter((plan) => plan.is_active).map((plan) => billingLabel(plan.billing_period))));
                        return periods.length ? periods.join(', ') : 'No active offer';
                      }} />
                      <CompareRow label="Approved rating" products={selected} render={(product) => (product.avg_rating ?? 0) > 0 ? `${product.avg_rating?.toFixed(1)} / 5 (${product.review_count})` : 'No approved reviews'} />
                      <CompareRow label="Published tags" products={selected} render={(product) => (product.tags ?? []).length ? (product.tags ?? []).join(', ') : '—'} />
                      <tr>
                        <th className="border-t border-border p-4 text-left font-semibold text-muted-foreground">Details</th>
                        {selected.map((product) => (
                          <td key={product.id} className="border-l border-t border-border p-4">
                            <Link href={`/products/${product.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">View product <ArrowRight size={12} /></Link>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function CompareRow({ label, products, render }: { label: string; products: Product[]; render: (product: Product) => string }) {
  return (
    <tr>
      <th className="border-t border-border p-4 text-left font-semibold text-muted-foreground">{label}</th>
      {products.map((product) => (
        <td key={product.id} className="border-l border-t border-border p-4 text-secondary-foreground">
          {label === 'Approved rating' && (product.avg_rating ?? 0) > 0 ? <span className="inline-flex items-center gap-1"><Star size={12} className="fill-current text-amber-500" />{render(product)}</span> : render(product)}
        </td>
      ))}
    </tr>
  );
}
