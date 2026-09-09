import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

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

function getAuthCookiePrefix(): string | null {
  try {
    const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
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

function disableCaching(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
}

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
    const response = NextResponse.redirect(loginUrl);
    disableCaching(response);
    return response;
  }

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

  await new Promise<void>((resolve) => setTimeout(resolve, 0));

  if (error || !data.user) {
    console.error('Google OAuth callback failed:', error?.message || 'No user returned');
    const loginUrl = new URL('/sign-up-login-screen', origin);
    loginUrl.searchParams.set('oauth_error', 'callback_failed');
    const response = NextResponse.redirect(loginUrl);
    disableCaching(response);
    return response;
  }

  if (referralCode) {
    const service = createServiceClient();
    const { error: referralError } = await service.rpc('claim_referral_code_for_user', {
      code: referralCode,
      user_id: data.user.id,
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

  // Remove stale cookie generations first, then let the freshly-exchanged session
  // overwrite the active chunk names. Obsolete higher-numbered chunks stay deleted.
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
  responseHeaders.forEach((value, key) => response.headers.set(key, value));
  disableCaching(response);

  return response;
}
