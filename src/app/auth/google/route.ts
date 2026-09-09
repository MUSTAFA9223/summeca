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

function getAuthCookiePrefix(): string | null {
  try {
    const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

function getCanonicalCookieDomain(): string | null {
  try {
    const hostname = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://summeca.com').hostname
      .toLowerCase()
      .replace(/^www\./, '');
    return hostname === 'summeca.com' ? hostname : null;
  } catch {
    return null;
  }
}

function clearStaleAuthCookies(request: NextRequest, response: NextResponse) {
  const prefix = getAuthCookiePrefix();
  if (!prefix) return;

  for (const cookie of request.cookies.getAll()) {
    if (!cookie.name.startsWith(prefix)) continue;
    response.cookies.set(cookie.name, '', {
      path: '/',
      expires: new Date(0),
      maxAge: 0,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
    });
  }
}

function appendDomainAuthCookieCleanup(request: NextRequest, response: NextResponse) {
  const prefix = getAuthCookiePrefix();
  const domain = getCanonicalCookieDomain();
  if (!prefix || !domain) return;

  const names = new Set(
    request.cookies.getAll()
      .filter((cookie) => cookie.name.startsWith(prefix))
      .map((cookie) => cookie.name),
  );
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  for (const name of names) {
    response.headers.append(
      'Set-Cookie',
      `${name}=; Path=/; Domain=${domain}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secure}`,
    );
  }
}

function disableCaching(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
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
        // A new OAuth flow does not need an old auth session. Starting from a clean
        // cookie view avoids stale Chrome chunk data poisoning the PKCE flow.
        getAll() {
          return [];
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
    disableCaching(response);
    return response;
  }

  const response = NextResponse.redirect(data.url);
  clearStaleAuthCookies(request, response);
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, {
      ...options,
      path: options?.path || '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
    });
  });
  appendDomainAuthCookieCleanup(request, response);
  disableCaching(response);
  return response;
}
