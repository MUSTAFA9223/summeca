'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/analytics';
import { Brain, Sparkles, ArrowRight, Zap, LayoutDashboard, FileText, Package, Star } from 'lucide-react';
import WishlistButton from '@/components/WishlistButton';

interface ProductPlan {
  price: number;
  billing_period: string;
  is_active: boolean;
}

interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  short_desc: string;
  category: string;
  thumbnail_url: string;
  tags: string[];
  metadata: Record<string, unknown>;
  plans?: ProductPlan[];
  avg_rating?: number;
  review_count?: number;
}

const TYPE_ICON: Record<string, React.ComponentType<any>> = {
  ai_tool: Zap, api: Zap, plugin: Zap,
  template: FileText, dataset: FileText,
  course: LayoutDashboard, other: LayoutDashboard,
};

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

interface RecommendedForYouProps {
  context?: {
    currentProductId?: string;
    currentCategory?: string;
  };
  title?: string;
  subtitle?: string;
  maxItems?: number;
  wishlistIds?: string[];
}

export default function RecommendedForYou({
  context = {},
  title = 'Recommended For You',
  subtitle = 'AI-powered picks based on your interests and activity',
  maxItems = 4,
  wishlistIds = [],
}: RecommendedForYouProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      // Get user's wishlist for personalization
      let wishlistCategories: string[] = [];
      if (user) {
        const { data: wishlistData } = await supabase
          .from('wishlist_items')
          .select('products:product_id(category)')
          .eq('user_id', user.id)
          .limit(10);

        if (wishlistData) {
          wishlistCategories = wishlistData
            .map((w) => (w.products as { category?: string } | null)?.category)
            .filter(Boolean) as string[];
        }
      }

      const res = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...context,
          userInterests: wishlistCategories,
        }),
      });

      if (res.ok) {
        const data = await res.json() as { recommendations: RecommendedProduct[] };
        const recs = data.recommendations ?? [];

        // Enrich with ratings
        if (recs.length > 0) {
          const { data: reviewsData } = await supabase
            .from('reviews')
            .select('product_id, rating')
            .in('product_id', recs.map((r) => r.id));

          const ratingMap: Record<string, { sum: number; count: number }> = {};
          if (reviewsData) {
            for (const r of reviewsData) {
              if (!ratingMap[r.product_id]) ratingMap[r.product_id] = { sum: 0, count: 0 };
              ratingMap[r.product_id].sum += r.rating;
              ratingMap[r.product_id].count += 1;
            }
          }

          const enriched = recs.map((p) => ({
            ...p,
            avg_rating: ratingMap[p.id] ? ratingMap[p.id].sum / ratingMap[p.id].count : 0,
            review_count: ratingMap[p.id]?.count ?? 0,
          }));

          setProducts(enriched.slice(0, maxItems));
        } else {
          setProducts([]);
        }
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [user, context.currentProductId, context.currentCategory, maxItems]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  if (loading) {
    return (
      <div className="py-8">
        <div className="flex items-center gap-2 mb-6">
          <Brain size={18} className="text-primary" />
          <h2 className="text-lg font-700 text-foreground">{title}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="w-10 h-10 rounded-xl shimmer" />
              <div className="w-3/4 h-3 rounded shimmer" />
              <div className="w-full h-2 rounded shimmer" />
              <div className="w-1/2 h-2 rounded shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-teal flex items-center justify-center">
            <Brain size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-700 text-foreground">{title}</h2>
            <p className="text-xs text-secondary-foreground">{subtitle}</p>
          </div>
        </div>
        <Link
          href="/products"
          className="flex items-center gap-1 text-xs font-600 text-primary hover:text-primary/80 transition-colors"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {products.map((product) => {
          const lowestPrice = getLowestPrice(product.plans);
          const badge = TYPE_BADGE[product.category] ?? { label: 'Product', cls: 'bg-secondary text-secondary-foreground' };
          const CategoryIcon = TYPE_ICON[product.category] ?? Package;

          return (
            <div key={product.id} className="group relative bg-white rounded-2xl border border-border p-4 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
              {/* AI Pick badge */}
              <div className="absolute -top-2 -right-2 bg-gradient-teal text-white text-[10px] font-700 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <Sparkles size={8} /> AI Pick
              </div>

              {/* Wishlist button */}
              <div className="absolute top-3 right-3">
                <WishlistButton
                  productId={product.id}
                  productName={product.name}
                  initialWishlisted={wishlistIds.includes(product.id)}
                  size="sm"
                />
              </div>

              <Link
                href={`/products/${product.slug}`}
                onClick={() => trackEvent('recommendation_click', { product_id: product.id, product_name: product.name })}
                className="block"
              >
                <div className="flex items-start gap-2 mb-3 pr-8">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0">
                    {product.thumbnail_url ? (
                      <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover rounded-xl" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <CategoryIcon size={18} className="text-primary" />
                    )}
                  </div>
                  <span className={`text-xs font-600 px-1.5 py-0.5 rounded-full ${badge.cls} mt-0.5`}>{badge.label}</span>
                </div>

                <h3 className="text-sm font-700 text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
                  {product.name}
                </h3>
                <p className="text-xs text-secondary-foreground leading-relaxed mb-3 line-clamp-2">
                  {product.short_desc}
                </p>

                {product.avg_rating && product.avg_rating > 0 ? (
                  <div className="flex items-center gap-1 mb-3">
                    <Star size={10} className="text-warning fill-warning" />
                    <span className="text-xs font-600 text-foreground">{product.avg_rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({product.review_count})</span>
                  </div>
                ) : (
                  <div className="mb-3 h-4" />
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm font-700 text-foreground">
                    {lowestPrice === null || lowestPrice === 0 ? (
                      <span className="text-success">Free</span>
                    ) : (
                      <>${lowestPrice}<span className="text-xs font-400 text-muted-foreground">/mo</span></>
                    )}
                  </span>
                  <span className="text-xs font-600 text-primary group-hover:underline flex items-center gap-1">
                    View <ArrowRight size={10} />
                  </span>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
