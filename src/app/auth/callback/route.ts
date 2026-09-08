import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function getSafeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/user-dashboard';
  }
  return value;
}

type PendingCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse['cookies']['set']>[2];
};

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const flowId = searchParams.get('sb_flow_id');
  const requestedNext = getSafeNext(searchParams.get('next'));
  const referralCode = (searchParams.get('ref') || '').trim().toUpperCase();

  if (!code) {
    const loginUrl = new URL('/sign-up-login-screen', origin);
    loginUrl.searchParams.set('oauth_error', 'missing_code');
    return NextResponse.redirect(loginUrl);
  }

  // Keep cookies produced by exchangeCodeForSession and attach them directly to
  // the redirect response. This is important on serverless/Cloudflare runtimes,
  // where mutating Next's global cookie store does not reliably propagate to a
  // separately-created redirect response.
  const pendingCookies: PendingCookie[] = [];
  const responseHeaders = new Headers();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options });
          });
          Object.entries(headers ?? {}).forEach(([key, value]) => {
            responseHeaders.set(key, value);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );

  // supabase-js currently defers the SIGNED_IN notification to a macrotask.
  // Give the SSR cookie adapter one turn to receive and persist the session.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));

  if (error || !data.user) {
    console.error('Google OAuth callback failed:', error?.message || 'No user returned');
    const loginUrl = new URL('/sign-up-login-screen', origin);
    loginUrl.searchParams.set('oauth_error', 'callback_failed');
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  if (referralCode) {
    const { error: referralError } = await supabase.rpc('claim_referral_code', {
      code: referralCode,
    });
    if (referralError) {
      console.warn('Referral claim after Google OAuth failed:', referralError.message);
    }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', data.user.id)
    .maybeSingle();

  const destination = profile?.is_admin ? '/admin' : requestedNext;
  const response = NextResponse.redirect(new URL(destination, origin));

  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  responseHeaders.forEach((value, key) => response.headers.set(key, value));
  response.headers.set('Cache-Control', 'private, no-store');

  return response;
}
