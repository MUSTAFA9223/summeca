import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

type PendingCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse['cookies']['set']>[2];
};

function getCanonicalOrigin() {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || 'https://summeca.com').trim();
  try {
    return new URL(configured).origin;
  } catch {
    return 'https://summeca.com';
  }
}

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/user-dashboard';
  return value;
}

export async function GET(request: NextRequest) {
  const canonicalOrigin = getCanonicalOrigin();
  const requestUrl = new URL(request.url);
  const next = getSafeNext(requestUrl.searchParams.get('next'));
  const referralCode = (requestUrl.searchParams.get('ref') || '')
    .trim()
    .toUpperCase()
    .slice(0, 64);

  const callbackUrl = new URL('/auth/callback', canonicalOrigin);
  callbackUrl.searchParams.set('next', next);
  if (referralCode) callbackUrl.searchParams.set('ref', referralCode);

  const pendingCookies: PendingCookie[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        experimental: {
          appendPkceFlowIdToRedirects: true,
        },
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options });
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
      skipBrowserRedirect: true,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error || !data.url) {
    console.error('[google-oauth] Failed to initialize OAuth:', error?.message || 'missing_provider_url');
    const loginUrl = new URL('/sign-up-login-screen', canonicalOrigin);
    loginUrl.searchParams.set('oauth_error', 'google_start_failed');
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  const response = NextResponse.redirect(data.url);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, {
      ...options,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
    });
  });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
