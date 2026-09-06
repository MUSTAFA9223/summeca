import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

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
  const isAuthEntry = path === '/sign-up-login-screen' || path === '/login' || path === '/signup';

  // Public pages and ordinary APIs do not need a Supabase network request in
  // middleware. This prevents every asset/page navigation from spending Worker
  // CPU and making an auth request at the edge.
  if (!isUserDashboard && !isAdminPage && !isAdminApi && !isAuthEntry) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
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
    return finish(NextResponse.redirect(url));
  }

  if (isAdminPage || isAdminApi) {
    if (!user) {
      if (isAdminApi) return finish(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      const url = request.nextUrl.clone();
      url.pathname = '/sign-up-login-screen';
      url.searchParams.set('next', path);
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

  if (user && isAuthEntry) {
    const url = request.nextUrl.clone();
    // Resolve the role once here so a signed-in admin is not sent through the
    // customer dashboard first.
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    url.pathname = profile?.is_admin ? '/admin' : '/user-dashboard';
    return finish(NextResponse.redirect(url));
  }

  return finish(supabaseResponse);
}

export const config = {
  // Run auth middleware only where authentication/authorization is actually
  // required. Public storefront pages bypass it completely.
  matcher: [
    '/user-dashboard/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
    '/sign-up-login-screen',
    '/login',
    '/signup',
    '/api/:path*',
  ],
};
