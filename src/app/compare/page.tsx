'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/client';
import { trackEvent } from '@/lib/analytics';
import { GitCompare, X, Package, CheckCircle2, ArrowRight, Plus, Trophy, Loader2 } from 'lucide-react';

interface ProductPlan {
  price: number;
  billing_period: string;
  is_active: boolean;
  sort_order: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  short_desc: string;
  description: string;
  category: string;
  thumbnail_url: string;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  plans?: ProductPlan[];
  avg_rating?: number;
  review_count?: number;
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  ai_tool: { label: 'AI Tool', cls: 'bg-primary/10 text-primary' },
  api: { label: 'API', cls: 'bg-primary/10 text-primary' },
  plugin: { label: 'Plugin', cls: 'bg-accent/10 text-accent' },
  template: { label: 'Template', cls: 'bg-warning/10 text-warning' },
  dataset: { label: 'Dataset', cls: 'bg-info/10 text-info' },
  course: { label: 'Course', cls: 'bg-success/10 text-success' },
  other: { label: 'SaaS', cls: 'bg-secondary text-secondary-foreground' },
};

function getLowestPrice(plans?: ProductPlan[]): number | null {
  if (!plans || plans.length === 0) return null;
  const active = plans.filter((p) => p.is_active);
  if (active.length === 0) return null;
  return Math.min(...active.map((p) => p.price));
}

function formatPrice(price: number | null): string {
  if (price === null || price === 0) return 'Free';
  return `$${price % 1 === 0 ? price : price.toFixed(2)}`;
}

function getFeatures(product: Product): string[] {
  const meta = product.metadata as Record<string, unknown>;
  if (Array.isArray(meta?.features)) return (meta.features as string[]).slice(0, 6);
  if (Array.isArray(meta?.key_features)) return (meta.key_features as string[]).slice(0, 6);
  return product.tags?.slice(0, 4) ?? [];
}

function getAICapabilities(product: Product): string {
  const meta = product.metadata as Record<string, unknown>;
  if (typeof meta?.ai_capabilities === 'string') return meta.ai_capabilities as string;
  const cat = product.category;
  if (['ai_tool', 'api', 'plugin'].includes(cat)) return 'AI-Powered';
  return '—';
}

function getPlatforms(product: Product): string {
  const meta = product.metadata as Record<string, unknown>;
  if (typeof meta?.platforms === 'string') return meta.platforms as string;
  if (Array.isArray(meta?.platforms)) return (meta.platforms as string[]).join(', ');
  return 'Web, API';
}

function getAccessType(product: Product): string {
  const plans = product.plans?.filter((p) => p.is_active) ?? [];
  if (plans.length === 0) return 'Free';
  const hasLifetime = plans.some((p) => p.billing_period === 'lifetime');
  const hasMonthly = plans.some((p) => p.billing_period === 'monthly');
  if (hasLifetime) return 'Lifetime Access';
  if (hasMonthly) return 'Subscription';
  return 'One-time';
}

function getBestValueIndex(products: Product[]): number {
  let bestIdx = 0;
  let bestScore = -Infinity;
  products.forEach((p, i) => {
    const price = getLowestPrice(p.plans) ?? 0;
    const rating = p.avg_rating ?? 0;
    const reviews = p.review_count ?? 0;
    const score = rating * 10 + reviews * 0.1 - price * 0.05;
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  });
  return bestIdx;
}

export default function ComparePage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchProducts();
    trackEvent('comparison_open', {});
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data: productsData } = await supabase
        .from('products')
        .select(`
          id, name, slug, short_desc, description, category, thumbnail_url,
          tags, metadata, created_at,
          plans:product_plans(price, billing_period, is_active, sort_order)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('product_id, rating');

      const ratingMap: Record<string, { sum: number; count: number }> = {};
      if (reviewsData) {
        for (const r of reviewsData) {
          if (!ratingMap[r.product_id]) ratingMap[r.product_id] = { sum: 0, count: 0 };
          ratingMap[r.product_id].sum += r.rating;
          ratingMap[r.product_id].count += 1;
        }
      }

      const enriched: Product[] = (productsData ?? []).map((p) => ({
        ...p,
        avg_rating: ratingMap[p.id] ? ratingMap[p.id].sum / ratingMap[p.id].count : 0,
        review_count: ratingMap[p.id]?.count ?? 0,
      }));

      setAllProducts(enriched);
      // Pre-select first 2 products
      if (enriched.length >= 2) {
        setSelectedProducts(enriched.slice(0, 2));
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const addProduct = (product: Product) => {
    if (selectedProducts.length >= 4) return;
    if (selectedProducts.find((p) => p.id === product.id)) return;
    setSelectedProducts((prev) => [...prev, product]);
    setShowPicker(false);
    setSearchQuery('');
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const filteredProducts = allProducts.filter((p) =>
    !selectedProducts.find((s) => s.id === p.id) &&
    (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const bestValueIdx = selectedProducts.length > 0 ? getBestValueIndex(selectedProducts) : -1;

  const compareRows = [
    { label: 'Category', getValue: (p: Product) => TYPE_BADGE[p.category]?.label ?? 'Product' },
    { label: 'Starting Price', getValue: (p: Product) => formatPrice(getLowestPrice(p.plans)) },
    { label: 'AI Capabilities', getValue: (p: Product) => getAICapabilities(p) },
    { label: 'Platforms', getValue: (p: Product) => getPlatforms(p) },
    { label: 'Access Type', getValue: (p: Product) => getAccessType(p) },
    { label: 'Rating', getValue: (p: Product) => p.avg_rating && p.avg_rating > 0 ? `${p.avg_rating.toFixed(1)} ★` : 'No reviews' },
    { label: 'Reviews', getValue: (p: Product) => `${p.review_count ?? 0} reviews` },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNav />

      {/* Hero */}
      <section className="pt-24 pb-10 bg-gradient-to-br from-[#F0FDFA] to-white border-b border-border">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-teal flex items-center justify-center">
              <GitCompare size={16} className="text-white" />
            </div>
            <span className="text-xs font-700 uppercase tracking-widest text-primary">Product Comparison</span>
          </div>
          <h1 className="text-3xl font-800 text-foreground mb-2">
            Compare <span className="text-gradient-primary">Products</span> Side by Side
          </h1>
          <p className="text-sm text-secondary-foreground max-w-xl">
            Compare up to 4 products to find the perfect fit for your needs. See features, pricing, and ratings at a glance.
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-screen-xl mx-auto px-4 lg:px-8 py-10 w-full">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Product selector row */}
            <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: `repeat(${Math.max(selectedProducts.length + (selectedProducts.length < 4 ? 1 : 0), 2)}, minmax(0, 1fr))` }}>
              {selectedProducts.map((product, idx) => {
                const badge = TYPE_BADGE[product.category] ?? { label: 'Product', cls: 'bg-secondary text-secondary-foreground' };
                const isBest = idx === bestValueIdx;
                return (
                  <div key={product.id} className={`relative rounded-2xl border-2 p-4 bg-white transition-all duration-300 ${isBest ? 'border-primary shadow-lg' : 'border-border'}`}>
                    {isBest && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-teal text-white text-xs font-700 px-3 py-1 rounded-full flex items-center gap-1 shadow-sm whitespace-nowrap">
                        <Trophy size={11} /> Best Value
                      </div>
                    )}
                    <button
                      onClick={() => removeProduct(product.id)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-secondary text-muted-foreground hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"
                    >
                      <X size={12} />
                    </button>
                    <div className="flex flex-col items-center text-center pt-2">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-3">
                        {product.thumbnail_url ? (
                          <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover rounded-xl" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <Package size={24} className="text-primary" />
                        )}
                      </div>
                      <span className={`text-xs font-600 px-2 py-0.5 rounded-full mb-2 ${badge.cls}`}>{badge.label}</span>
                      <h3 className="text-sm font-700 text-foreground mb-1 line-clamp-2">{product.name}</h3>
                      <p className="text-xs text-secondary-foreground line-clamp-2 mb-3">{product.short_desc}</p>
                      <Link
                        href={`/products/${product.slug}`}
                        className="text-xs font-600 text-primary hover:underline flex items-center gap-1"
                      >
                        View Details <ArrowRight size={10} />
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* Add product slot */}
              {selectedProducts.length < 4 && (
                <div className="relative">
                  <button
                    onClick={() => setShowPicker(!showPicker)}
                    className="w-full h-full min-h-[180px] rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-white hover:bg-primary/5 flex flex-col items-center justify-center gap-2 transition-all duration-200 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Plus size={20} className="text-primary" />
                    </div>
                    <span className="text-sm font-600 text-primary">Add Product</span>
                    <span className="text-xs text-muted-foreground">{4 - selectedProducts.length} slots remaining</span>
                  </button>

                  {/* Product picker dropdown */}
                  {showPicker && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
                      <div className="p-3 border-b border-border">
                        <input
                          type="text"
                          placeholder="Search products..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full text-sm px-3 py-2 rounded-lg border border-border outline-none focus:ring-2 focus:ring-primary/30"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {filteredProducts.slice(0, 10).map((p) => (
                          <button
                            key={p.id}
                            onClick={() => addProduct(p)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Package size={14} className="text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-600 text-foreground truncate">{p.name}</div>
                              <div className="text-xs text-muted-foreground">{TYPE_BADGE[p.category]?.label ?? 'Product'}</div>
                            </div>
                          </button>
                        ))}
                        {filteredProducts.length === 0 && (
                          <div className="px-4 py-6 text-center text-sm text-muted-foreground">No products found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Comparison table */}
            {selectedProducts.length >= 2 && (
              <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
                  <h2 className="text-base font-700 text-foreground">Detailed Comparison</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-6 py-3 text-xs font-700 uppercase tracking-wider text-muted-foreground w-36">Feature</th>
                        {selectedProducts.map((p, idx) => (
                          <th key={p.id} className={`px-4 py-3 text-center text-xs font-700 text-foreground ${idx === bestValueIdx ? 'bg-primary/5' : ''}`}>
                            <span className="line-clamp-1">{p.name}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compareRows.map((row, rowIdx) => (
                        <tr key={row.label} className={`border-b border-border/50 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-secondary/30'}`}>
                          <td className="px-6 py-3 text-xs font-600 text-secondary-foreground">{row.label}</td>
                          {selectedProducts.map((p, idx) => (
                            <td key={p.id} className={`px-4 py-3 text-center text-sm text-foreground ${idx === bestValueIdx ? 'bg-primary/5 font-600' : ''}`}>
                              {row.getValue(p)}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {/* Features row */}
                      <tr className="border-b border-border/50">
                        <td className="px-6 py-3 text-xs font-600 text-secondary-foreground align-top">Key Features</td>
                        {selectedProducts.map((p, idx) => {
                          const features = getFeatures(p);
                          return (
                            <td key={p.id} className={`px-4 py-3 ${idx === bestValueIdx ? 'bg-primary/5' : ''}`}>
                              {features.length > 0 ? (
                                <ul className="space-y-1">
                                  {features.map((f, fi) => (
                                    <li key={fi} className="flex items-center gap-1.5 text-xs text-foreground">
                                      <CheckCircle2 size={11} className="text-primary flex-shrink-0" />
                                      <span className="line-clamp-1">{f}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* CTA row */}
                      <tr>
                        <td className="px-6 py-4 text-xs font-600 text-secondary-foreground">Action</td>
                        {selectedProducts.map((p, idx) => (
                          <td key={p.id} className={`px-4 py-4 text-center ${idx === bestValueIdx ? 'bg-primary/5' : ''}`}>
                            <Link
                              href={`/products/${p.slug}`}
                              className={`inline-flex items-center gap-1.5 text-xs font-600 px-4 py-2 rounded-lg transition-colors ${
                                idx === bestValueIdx
                                  ? 'bg-primary text-white hover:bg-primary/90' :'bg-secondary text-foreground hover:bg-secondary/80'
                              }`}
                            >
                              View Details <ArrowRight size={11} />
                            </Link>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedProducts.length < 2 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <GitCompare size={28} className="text-primary" />
                </div>
                <h2 className="text-lg font-700 text-foreground mb-2">Select at least 2 products to compare</h2>
                <p className="text-sm text-secondary-foreground">Use the &quot;Add Product&quot; button above to get started.</p>
              </div>
            )}
          </>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
