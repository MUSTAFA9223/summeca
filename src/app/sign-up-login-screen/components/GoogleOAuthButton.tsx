'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';

interface GoogleOAuthButtonProps {
  label: string;
}

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/user-dashboard';
  return value;
}

function getCanonicalBase() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured;
  return window.location.origin;
}

export default function GoogleOAuthButton({ label }: GoogleOAuthButtonProps) {
  const [loading, setLoading] = useState(false);

  const startGoogleAuth = () => {
    if (loading) return;
    setLoading(true);

    try {
      const currentUrl = new URL(window.location.href);
      const referralCode = (currentUrl.searchParams.get('ref') || '').trim().toUpperCase();
      const next = getSafeNext(currentUrl.searchParams.get('next'));

      // Start OAuth through SUMMECA's server endpoint. The server stores the PKCE
      // verifier using a first-party Set-Cookie response before redirecting to
      // Google, which is more reliable on mobile browsers and embedded webviews
      // than relying on a client-side cookie write immediately before navigation.
      const authStartUrl = new URL('/auth/google', getCanonicalBase());
      authStartUrl.searchParams.set('next', next);
      if (referralCode) authStartUrl.searchParams.set('ref', referralCode);
      window.location.assign(authStartUrl.toString());
    } catch (error: unknown) {
      setLoading(false);
      toast.error(error instanceof Error ? error.message : 'Google sign-in is not available right now.');
    }
  };

  return (
    <button
      type="button"
      onClick={startGoogleAuth}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-secondary disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 mb-4"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 0 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      <span className="text-sm font-600 text-foreground">{loading ? 'Connecting to Google…' : label}</span>
    </button>
  );
}
