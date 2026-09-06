'use client';

import React from 'react';
import { Users, TrendingUp, Star } from 'lucide-react';

interface RecentPurchaseToastProps {
  className?: string;
}

/**
 * Intentionally disabled until this component is backed by verified, real
 * purchase events. SUMMECA must never display fabricated customer names,
 * locations, products, timestamps, or purchase activity.
 */
export function RecentPurchaseToast(_props: RecentPurchaseToastProps) {
  return null;
}

interface CustomerCountBadgeProps {
  count?: number;
  className?: string;
}

export function CustomerCountBadge({ count = 0, className = '' }: CustomerCountBadgeProps) {
  if (count <= 0) return null;

  return (
    <div className={`inline-flex items-center gap-2 bg-white rounded-full border border-border px-4 py-2 shadow-sm ${className}`}>
      <div className="flex -space-x-1.5">
        {[...Array(Math.min(4, count))].map((_, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border-2 border-white flex items-center justify-center"
          >
            <Users size={10} className="text-primary" />
          </div>
        ))}
      </div>
      <span className="text-xs font-700 text-foreground">
        {count.toLocaleString('en-US')} customer{count === 1 ? '' : 's'}
      </span>
    </div>
  );
}

interface PopularityIndicatorProps {
  count: number;
  productName?: string;
  className?: string;
}

export function PopularityIndicator({ count, productName, className = '' }: PopularityIndicatorProps) {
  if (count <= 0) return null;

  return (
    <div className={`flex items-center gap-1.5 text-xs text-secondary-foreground ${className}`}>
      <TrendingUp size={12} className="text-primary" />
      <span>
        <span className="font-700 text-foreground">{count}</span> verified purchase{count === 1 ? '' : 's'}
        {productName ? ` for ${productName}` : ''}
      </span>
    </div>
  );
}

interface VerifiedBuyerBadgeProps {
  className?: string;
}

export function VerifiedBuyerBadge({ className = '' }: VerifiedBuyerBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-600 bg-success/10 text-success px-2 py-0.5 rounded-full ${className}`}>
      <Star size={10} className="fill-success" />
      Verified Buyer
    </span>
  );
}

interface SocialProofStripProps {
  productName?: string;
  purchaseCount?: number;
  className?: string;
}

export function SocialProofStrip({ productName, purchaseCount = 0, className = '' }: SocialProofStripProps) {
  if (purchaseCount <= 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <PopularityIndicator count={purchaseCount} productName={productName} />
    </div>
  );
}
