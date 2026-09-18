'use client';

export type FunnelEvent =
  | 'product_view'
  | 'buy_click'
  | 'trial_started'
  | 'checkout_started'
  | 'payment_method_selected'
  | 'payment_failed'
  | 'payment_completed';

type FunnelMetadata = Record<string, string | number | boolean | null | undefined>;

function sessionKey() {
  if (typeof window === 'undefined') return '';
  const storageKey = 'summeca:funnel:session';
  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing && /^[a-zA-Z0-9:_-]{8,120}$/.test(existing)) return existing;
    const next = 'web_' + window.crypto.randomUUID();
    window.sessionStorage.setItem(storageKey, next);
    return next;
  } catch {
    return 'web_' + window.crypto.randomUUID();
  }
}

export function trackFunnelEvent(eventType: FunnelEvent, metadata: FunnelMetadata = {}) {
  if (typeof window === 'undefined') return;

  const payload = {
    eventType,
    sessionKey: sessionKey(),
    path: window.location.pathname,
    metadata,
  };

  void fetch('/api/analytics/funnel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => {
    // Analytics is best-effort and must never block the customer flow.
  });
}
