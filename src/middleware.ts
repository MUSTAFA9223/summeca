import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
type SeoLocale = 'en' | 'ar';

const SEO_LANGUAGE_COOKIE_KEY = 'summeca_language';
const CANONICAL_HOST = 'summeca.com';
const PUBLIC_I18N_PATHS = new Set([
  '/',
  '/products',
  '/ai',
  '/saas',
  '/digital',
  '/pricing',
  '/about',
  '/faq',
  '/support',
  '/contact',
  '/status',
  '/refunds',
  '/shipping',
  '/privacy',
  '/terms',
  '/cookies',
]);

function normalizedPath(pathname: string) {
  if (pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

function getPathLocale(pathname: string): SeoLocale | null {
  const match = normalizedPath(pathname).match(/^\/(en|ar)(?=\/|$)/);
  return match ? (match[1] as SeoLocale) : null;
}

function stripLocalePrefix(pathname: string) {
  const cleaned = normalizedPath(pathname);
  const locale = getPathLocale(cleaned);
  if (!locale) return cleaned;
  return cleaned.replace(new RegExp(`^/${locale}(?=/|$)`), '') || '/';
}

function isInternationalSeoPath(pathname: string) {
  const publicPath = stripLocalePrefix(pathname);
  return PUBLIC_I18N_PATHS.has(publicPath) || publicPath.startsWith('/products/');
}

function getAuthCookiePrefix(): string | null {
  try {
    const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getCookiesForSupabase(request: NextRequest) {
  const cookies = request.cookies.getAll();
  const prefix = getAuthCookiePrefix();
  const rawCookieHeader = request.headers.get('cookie');

  if (!prefix || !rawCookieHeader) return cookies;

  // Chrome can send both an older Domain-scoped cookie and a newer host-only
  // cookie with the same Supabase chunk name. Preserve the last occurrence from
  // the raw Cookie header so one stale duplicate cannot shadow the fresh login.
  const authByName = new Map<string, { name: string; value: string }>();
  for (const part of rawCookieHeader.split(';')) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    const name = trimmed.slice(0, separator).trim();
    if (!name.startsWith(prefix)) continue;
    authByName.set(name, {
      name,
      value: decodeCookieValue(trimmed.slice(separator + 1)),
    });
  }

  if (authByName.size === 0) return cookies;
  const nonAuthCookies = cookies.filter((cookie) => !cookie.name.startsWith(prefix));
  return [...nonAuthCookies, ...authByName.values()];
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const pathLocale = getPathLocale(path);
  const isPublicSeoPath = isInternationalSeoPath(path);
  const isCanonicalHost = request.nextUrl.hostname.toLowerCase() === CANONICAL_HOST;

  // Keep one clean public URL: https://summeca.com/... .
  // Legacy /en and /ar URLs permanently collapse to the unprefixed English URL.
  // www is also canonicalized here for routes that pass through middleware.
  if (!isCanonicalHost || (pathLocale && isPublicSeoPath)) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = 'https:';
    canonicalUrl.hostname = CANONICAL_HOST;
    canonicalUrl.port = '';

    if (pathLocale && isPublicSeoPath) {
      canonicalUrl.pathname = stripLocalePrefix(path);
    }

    return NextResponse.redirect(canonicalUrl, 308);
  }

  // Public storefront pages are English-only now. Keep the visible URL
  // unprefixed while still supplying locale/path metadata to the app.
  if (!pathLocale && isPublicSeoPath && ['GET', 'HEAD'].includes(request.method)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-summeca-locale', 'en');
    requestHeaders.set('x-summeca-public-path', path);
    requestHeaders.set('x-summeca-localized-path', path);

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.cookies.set(SEO_LANGUAGE_COOKIE_KEY, 'en', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    response.headers.set('Content-Language', 'en');
    return response;
  }

  // Keep the inexpensive origin protection for state-changing API requests.
  if (path.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method) && path !== '/api/payment/webhook') {
    const origin = request.headers.get('origin');
    if ((origin && origin !== request.nextUrl.origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }
  }

  const isUserDashboard = path.startsWith('/user-dashboard');
  const isAdminPage = path.startsWith('/admin');
  const isAdminApi = path.startsWith('/api/admin');

  // Public storefront/auth pages and ordinary APIs do not need a Supabase
  // network request in middleware. Keeping the sign-in page outside auth
  // middleware is important on Cloudflare's tight Worker CPU budget.
  if (!isUserDashboard && !isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return getCookiesForSupabase(request);
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, {
              ...options,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              httpOnly: false,
            });
          });
          supabaseResponse.headers.set('Cache-Control', 'private, no-store');
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const finish = (response: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };

  if (!user && isUserDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-up-login-screen';
    url.searchParams.set('next', `${path}${request.nextUrl.search}`);
    return finish(NextResponse.redirect(url));
  }

  if (isAdminPage || isAdminApi) {
    if (!user) {
      if (isAdminApi) return finish(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      const url = request.nextUrl.clone();
      url.pathname = '/sign-up-login-screen';
      url.searchParams.set('next', `${path}${request.nextUrl.search}`);
      return finish(NextResponse.redirect(url));
    }

    // Admin authorization stays database-backed; never trust editable user_metadata.
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      if (isAdminApi) return finish(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return finish(NextResponse.redirect(url));
    }
  }

  return finish(supabaseResponse);
}

export const config = {
  matcher: [
    '/',
    '/products/:path*',
    '/ai',
    '/saas',
    '/digital',
    '/pricing',
    '/about',
    '/faq',
    '/support',
    '/contact',
    '/status',
    '/refunds',
    '/shipping',
    '/privacy',
    '/terms',
    '/cookies',
    '/en',
    '/en/:path*',
    '/ar',
    '/ar/:path*',
    '/user-dashboard/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/:path*',
  ],
};
