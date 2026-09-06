import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith('/api/') && !['GET','HEAD','OPTIONS'].includes(request.method) && path !== '/api/payment/webhook') {
    const origin = request.headers.get('origin');
    if ((origin && origin !== request.nextUrl.origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
      return NextResponse.json({error:'Invalid request origin'}, {status:403});
    }
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
            supabaseResponse.cookies.set(name, value, { ...options, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', httpOnly: false });
          });
          supabaseResponse.headers.set('Cache-Control', 'private, no-store');
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Preserve refreshed cookies on redirects and keep authenticated responses out of shared caches.
  const finish = (response: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie));
    if (user || path.startsWith('/auth/') || path === '/reset-password' || path.startsWith('/api/')) response.headers.set('Cache-Control','private, no-store');
    return response;
  };
  const pathname = request.nextUrl.pathname;
  const isUserDashboard = pathname.startsWith('/user-dashboard');
  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');

  if (!user && isUserDashboard) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-up-login-screen';
    return finish(NextResponse.redirect(url));
  }

  if (isAdminPage || isAdminApi) {
    if (!user) {
      if (isAdminApi) {
        return finish(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const url = request.nextUrl.clone();
      url.pathname = '/sign-up-login-screen';
      url.searchParams.set('next', pathname);
      return finish(NextResponse.redirect(url));
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      if (isAdminApi) {
        return finish(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
      }

      const url = request.nextUrl.clone();
      url.pathname = '/';
      return finish(NextResponse.redirect(url));
    }
  }

  if (
    user &&
    (pathname === '/sign-up-login-screen' ||
      pathname === '/login' ||
      pathname === '/signup')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/user-dashboard';
    return finish(NextResponse.redirect(url));
  }

  return finish(supabaseResponse);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
