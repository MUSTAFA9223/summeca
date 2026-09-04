'use client';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export function trackEvent(eventName: string, eventParams: Record<string, unknown> = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
}

// E-commerce specific events for SUMMECA
export function trackProductView(product: { id: string; name: string; category: string; price?: number }) {
  trackEvent('view_item', {
    currency: 'USD',
    value: product.price ?? 0,
    items: [{
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price ?? 0,
    }],
  });
}

export function trackAddToCart(product: { id: string; name: string; category: string; price: number; planName?: string }) {
  trackEvent('add_to_cart', {
    currency: 'USD',
    value: product.price,
    items: [{
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      item_variant: product.planName,
      price: product.price,
      quantity: 1,
    }],
  });
}

export function trackCheckoutStarted(product: { id: string; name: string; price: number; planName?: string }) {
  trackEvent('begin_checkout', {
    currency: 'USD',
    value: product.price,
    items: [{
      item_id: product.id,
      item_name: product.name,
      item_variant: product.planName,
      price: product.price,
      quantity: 1,
    }],
  });
}

export function trackPurchase(order: { id: string; productName: string; productId: string; amount: number; currency?: string }) {
  trackEvent('purchase', {
    transaction_id: order.id,
    currency: order.currency ?? 'USD',
    value: order.amount,
    items: [{
      item_id: order.productId,
      item_name: order.productName,
      price: order.amount,
      quantity: 1,
    }],
  });
}

export function trackSearch(searchTerm: string, resultsCount: number) {
  trackEvent('search', {
    search_term: searchTerm,
    results_count: resultsCount,
  });
}

// V31 — Wishlist events
export function trackWishlistAdd(product: { id: string; name: string }) {
  trackEvent('wishlist_add', {
    product_id: product.id,
    product_name: product.name,
  });
}

export function trackWishlistRemove(product: { id: string; name: string }) {
  trackEvent('wishlist_remove', {
    product_id: product.id,
    product_name: product.name,
  });
}

// V31 — Comparison event
export function trackComparisonOpen(productIds: string[]) {
  trackEvent('comparison_open', {
    product_ids: productIds.join(','),
    product_count: productIds.length,
  });
}

// V31 — Referral events
export function trackReferralSignup(referralCode: string) {
  trackEvent('referral_signup', {
    referral_code: referralCode,
  });
}

export function trackReferralPurchase(referralCode: string, orderId: string) {
  trackEvent('referral_purchase', {
    referral_code: referralCode,
    order_id: orderId,
  });
}

// V31 — Recommendation click
export function trackRecommendationClick(product: { id: string; name: string }) {
  trackEvent('recommendation_click', {
    product_id: product.id,
    product_name: product.name,
  });
}
