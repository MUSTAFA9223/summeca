'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const SESSION_STORAGE_KEY = 'summeca:analytics-session';
const SESSION_WINDOW_MS = 30 * 60 * 1000;

type StoredSession = {
  key: string;
  lastSeen: number;
};

function newSessionKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function getOrCreateSessionKey() {
  const now = Date.now();
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredSession;
      if (
        parsed?.key &&
        typeof parsed.lastSeen === 'number' &&
        now - parsed.lastSeen < SESSION_WINDOW_MS
      ) {
        window.localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({ key: parsed.key, lastSeen: now } satisfies StoredSession)
        );
        return parsed.key;
      }
    }
  } catch {
    // Storage may be blocked; a temporary session key still lets analytics work.
  }

  const key = newSessionKey();
  try {
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ key, lastSeen: now } satisfies StoredSession)
    );
  } catch {
    // Ignore storage failures.
  }
  return key;
}

export default function VisitorTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedRoute = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!['summeca.com', 'www.summeca.com'].includes(window.location.hostname)) return;
    if (!pathname || pathname.startsWith('/admin')) return;

    const query = searchParams?.toString() || '';
    const route = query ? `${pathname}?${query}` : pathname;
    if (lastTrackedRoute.current === route) return;
    lastTrackedRoute.current = route;

    const sessionKey = getOrCreateSessionKey();
    const utmSource = searchParams?.get('utm_source') || '';

    fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionKey,
        path: route,
        referrer: document.referrer || '',
        utmSource,
      }),
      keepalive: true,
    }).catch(() => {
      // Analytics must never interfere with the storefront experience.
    });
  }, [pathname, searchParams]);

  return null;
}
