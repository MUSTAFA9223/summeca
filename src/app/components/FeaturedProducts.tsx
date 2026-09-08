'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, LayoutDashboard, Package, Sparkles, Star, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getEffectivePrice } from '@/lib/pricing';

type BillingPeriod = 'one_time' | 'monthly' | 'yearly' | 'lifetime';

interface ProductPlan {
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

interface Product {
  id: string;
  name: string;
  slug: string;
  short_desc: string | null;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  plans?: ProductPlan[];
}

const AI_CATEGORIES = ['ai_tool', 'api', 'plugin'];
const DIGITAL_CATEGORIES = ['template', 'dataset', 'course'];

function productType(category: string) {
  if (AI_CATEGORIES.includes(category)) return 'ai';
  if (DIGITAL_CATEGORIES.includes(category)) return 'digital';
  return 'saas';
}

function lowestPlan(plans?: ProductPlan[]) {
  const active = (plans ?? []).filter((plan) => plan.is_active);
  if (!active.length) return null;
  return active.reduce((lowest, plan) => {
    try {
      return getEffectivePrice(plan).finalPrice < getEffectivePrice(lowest).finalPrice ? plan : lowest;
    } catch {
      return Number(plan.price) < Number(lowest.price) ? plan : lowest;
    }
  });
}

function pricing(plan: ProductPlan | null) {
  if (!plan) return null;
  try {
    return getEffectivePrice(plan);
  } catch {
    const value = Number(plan.price) || 0;
    return { regularPrice: value, finalPrice: value, onSale: false };
  }
}

function money(value: number, currency = 'USD') {
  if (value === 0) return 'Free';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: currency || 'USD',
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency || 'USD'} ${value.toFixed(value % 1 === 0 ? 0 : 2)}`;
  }
}

function suffix(period: BillingPeriod) {
  if (period === 'monthly') return '/mo';
  if (period === 'yearly') return '/yr';
  if (period === 'lifetime') return ' lifetime';
  return '';
}

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, short_desc, description, category, thumbnail_url, metadata, created_at,
          plans:product_plans(
            price, currency, billing_period, is_active, sort_order,
            sale_price, sale_discount_type, sale_discount_value, sale_starts_at, sale_ends_at
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(12);

      if (!alive) return;
      if (error) {
        console.error('Failed to load featured products:', error);
        setProducts([]);
      } else {
        const rows = (data ?? []) as Product[];
        const featured = rows.filter((p) => Boolean(p.metadata?.featured || p.metadata?.is_featured));
        setProducts((featured.length ? featured : rows).slice(0, 4));
      }
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [supabase]);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 border border-primary/15 mb-3">
              <Sparkles size={11} className="text-primary" />
              <span className="text-xs font-600 text-primary uppercase tracking-wider">Featured Products</span>
            </div>
            <h2 className="text-3xl font-800 text-foreground">Tools that drive real results</h2>
            <p className="text-secondary-foreground mt-2 text-sm max-w-md">
              Explore active products and plans available from SUMMECA.
            </p>
          </div>
          <Link href="/products" className="flex items-center gap-1.5 text-sm font-600 text-primary hover:text-primary/80 transition-colors whitespace-nowrap">
            View all products <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Loading featured products">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-56 rounded-2xl border border-border bg-secondary/30 animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-border bg-secondary/20 p-10 text-center">
            <Package size={24} className="mx-auto text-primary mb-3" />
            <p className="font-700 text-foreground">New products are being prepared.</p>
            <p className="text-sm text-muted-foreground mt-1">Browse the catalog for currently available items.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map((product) => {
              const type = productType(product.category);
              const plan = lowestPlan(product.plans);
              const price = pricing(plan);
              const Icon = type === 'ai' ? Zap : type === 'digital' ? FileText : LayoutDashboard;
              const gradient = type === 'ai' ? 'from-[#F0FDFA] to-[#ECFEFF]' : type === 'digital' ? 'from-[#FFF7ED] to-[#FFFBEB]' : 'from-[#EFF6FF] to-[#F0FDFA]';
              return (
                <Link key={product.id} href={`/products/${product.slug}`} className={`group relative rounded-2xl border border-border bg-gradient-to-br ${gradient} p-5 card-hover block overflow-hidden`}>
                  <div className="flex items-start justify-between mb-4 relative">
                    <div className="w-11 h-11 rounded-xl bg-white shadow-card flex items-center justify-center overflow-hidden">
                      {product.thumbnail_url ? <img src={product.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Icon size={20} className="text-primary" />}
                    </div>
                    <span className="text-xs font-600 px-2.5 py-1 rounded-full bg-primary/10 text-primary">{product.category.replaceAll('_', ' ')}</span>
                  </div>
                  <h3 className="text-sm font-700 text-foreground mb-1.5 group-hover:text-primary transition-colors">{product.name}</h3>
                  <p className="text-xs text-secondary-foreground leading-relaxed mb-5 line-clamp-2">{product.short_desc || product.description || 'Product details available on the product page.'}</p>
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      {!plan || !price || price.finalPrice === 0 ? <span className="text-sm font-700 text-success">Free</span> : (
                        <div className="flex flex-wrap items-baseline gap-1.5">
                          {price.onSale && <span className="text-[10px] text-muted-foreground line-through">{money(price.regularPrice, plan.currency)}</span>}
                          <span className="text-sm font-700 text-foreground">{money(price.finalPrice, plan.currency)}<span className="text-xs font-400 text-muted-foreground">{suffix(plan.billing_period)}</span></span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-600 text-primary flex items-center gap-1 group-hover:gap-2 transition-all">View <ArrowRight size={11} /></span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 pt-8 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-secondary-foreground"><Zap size={14} className="text-primary" /><span className="font-500">Instant digital access where available</span></div>
          <div className="flex items-center gap-2 text-sm text-secondary-foreground"><Star size={14} className="text-primary" /><span className="font-500">Prices shown from active plans</span></div>
        </div>
      </div>
    </section>
  );
}
