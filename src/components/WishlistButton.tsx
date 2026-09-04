'use client';

import React, { useState, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/analytics';

interface WishlistButtonProps {
  productId: string;
  productName?: string;
  initialWishlisted?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  onToggle?: (wishlisted: boolean) => void;
}

export default function WishlistButton({
  productId,
  productName,
  initialWishlisted = false,
  size = 'sm',
  className = '',
  onToggle,
}: WishlistButtonProps) {
  const { user } = useAuth();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [loading, setLoading] = useState(false);

  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!user) {
        window.location.href = '/sign-up-login-screen';
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/wishlist/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: productId }),
        });
        if (res.ok) {
          const data = await res.json() as { wishlisted: boolean };
          setWishlisted(data.wishlisted);
          onToggle?.(data.wishlisted);

          if (data.wishlisted) {
            trackEvent('wishlist_add', { product_id: productId, product_name: productName });
          } else {
            trackEvent('wishlist_remove', { product_id: productId, product_name: productName });
          }
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    },
    [user, productId, productName, onToggle]
  );

  const iconSize = size === 'sm' ? 14 : 18;
  const btnSize = size === 'sm' ?'w-7 h-7' :'w-9 h-9';

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      className={`${btnSize} rounded-full flex items-center justify-center transition-all duration-200 ${
        wishlisted
          ? 'bg-red-50 text-red-500 hover:bg-red-100' :'bg-white/80 text-muted-foreground hover:text-red-400 hover:bg-red-50'
      } shadow-sm border border-border/60 ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <Heart
        size={iconSize}
        className={`transition-all duration-200 ${wishlisted ? 'fill-red-500' : ''}`}
      />
    </button>
  );
}
