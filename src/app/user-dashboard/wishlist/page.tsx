'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import WishlistButton from '@/components/WishlistButton';
import {
  Heart, ShoppingCart, Zap, LayoutDashboard, FileText, Star, ArrowRight, Package, Loader2
} from 'lucide-react';

interface ProductPlan {
  price: number;
  billing_period: string;
  is_active: boolean;
  sort_order: number;
}

interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  short_desc: string;
  category: string;
  thumbnail_url: string;
  tags: string[];
  metadata: Record<string, unknown>;
  plans?: ProductPlan[];
}

interface WishlistItem {
  id: string;
  created_at: string;
  product_id: string;
  products: WishlistProduct;
}

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

const TYPE_ICON: Record<string, React.ElementType> = {
  ai_tool: Zap,
  api: Zap,
  plugin: Zap,
  template: FileText,
  dataset: FileText,
  course: LayoutDashboard,
  other: LayoutDashboard,
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

function WishlistCard({ item, onRemove }: { item: WishlistItem; onRemove: (id: string) => void }) {
  const product = item.products;
  const lowestPrice = getLowestPrice(product.plans);
  const badge = TYPE_BADGE[product.category] ?? { label: 'Product', cls: 'bg-secondary text-secondary-foreground' };
  const CategoryIcon = TYPE_ICON[product.category] ?? Package;

  return (
    <div className="group relative bg-white rounded-2xl border border-border p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
      {/* Wishlist remove button */}
      <div className="absolute top-3 right-3">
        <WishlistButton
          productId={product.id}
          productName={product.name}
          initialWishlisted={true}
          size="sm"
          onToggle={(w) => { if (!w) onRemove(item.id); }}
        />
      </div>

      {/* Product icon */}
      <div className="flex items-start gap-3 mb-3 pr-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0">
          {product.thumbnail_url ? (
            <img
              src={product.thumbnail_url}
              alt={`${product.name} thumbnail`}
              className="w-full h-full object-cover rounded-xl"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <CategoryIcon size={22} className="text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
          <h3 className="text-sm font-700 text-foreground mt-1 group-hover:text-primary transition-colors line-clamp-1">
            {product.name}
          </h3>
        </div>
      </div>

      <p className="text-xs text-secondary-foreground leading-relaxed mb-4 line-clamp-2">
        {product.short_desc || 'No description available.'}
      </p>

      {/* Tags */}
      {product.tags && product.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {product.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Price + CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div>
          {lowestPrice === 0 || lowestPrice === null ? (
            <span className="text-sm font-700 text-success">Free</span>
          ) : (
            <span className="text-sm font-700 text-foreground tabular-nums">
              {formatPrice(lowestPrice)}
              <span className="text-xs font-400 text-muted-foreground">/mo</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/checkout?product=${product.slug}`}
            className="flex items-center gap-1.5 text-xs font-600 bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ShoppingCart size={11} />
            Get Now
          </Link>
          <Link
            href={`/products/${product.slug}`}
            className="text-xs font-600 text-primary hover:underline flex items-center gap-1"
          >
            View <ArrowRight size={10} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    fetchWishlist();
  }, [user]);

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/wishlist/items');
      if (res.ok) {
        const data = await res.json() as { items: WishlistItem[] };
        setItems(data.items ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  if (authLoading) {
    return (
      <DashboardLayout activeRoute="wishlist">
        <div className="flex items-center justify-center h-64">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeRoute="wishlist">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center">
                <Heart size={16} className="text-white fill-white" />
              </div>
              <h1 className="text-2xl font-800 text-foreground">My Wishlist</h1>
            </div>
            <p className="text-sm text-secondary-foreground">
              {items.length > 0
                ? `${items.length} saved product${items.length !== 1 ? 's' : ''}`
                : 'Save products you love for later'}
            </p>
          </div>
          <Link
            href="/products"
            className="flex items-center gap-1.5 text-sm font-600 text-primary hover:text-primary/80 transition-colors"
          >
            Browse Products <ArrowRight size={14} />
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center mb-5 border border-red-100">
              <Heart size={36} className="text-red-300" />
            </div>
            <h2 className="text-xl font-700 text-foreground mb-2">Your wishlist is empty</h2>
            <p className="text-sm text-secondary-foreground mb-6 max-w-xs">
              Discover amazing AI tools and digital products. Click the heart icon to save your favorites.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-600 text-sm hover:bg-primary/90 transition-colors"
            >
              <Star size={14} />
              Explore Products
            </Link>
          </div>
        )}

        {/* Wishlist grid */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <WishlistCard key={item.id} item={item} onRemove={handleRemove} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
