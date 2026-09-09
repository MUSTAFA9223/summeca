import { createServerClient } from '@supabase/ssr';
import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
]);

const VERIFIABLE_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'email_change',
  'email',
]);

type PendingCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse['cookies']['set']>[2];
};

function safeNext(value: string | null, type: EmailOtpType): string {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return type === 'email_change' ? '/user-dashboard/settings' : '/user-dashboard';
}

function invalidLinkResponse(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/sign-up-login-screen';
  url.search = '';
  url.searchParams.set('auth_error', 'invalid_or_expired_link');
  const response = NextResponse.redirect(url, { status: 303 });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')?.trim() ?? '';
  const rawType = request.nextUrl.searchParams.get('type');
  const type = rawType && ALLOWED_TYPES.has(rawType as EmailOtpType)
    ? (rawType as EmailOtpType)
    : null;

  if (!type || !tokenHash) return invalidLinkResponse(request);

  // Recovery links are deliberately not consumed on GET. Email security scanners
  // commonly prefetch links, so the one-time recovery token is only consumed when
  // the user submits a new password on /reset-password.
  if (type === 'recovery') {
    const url = request.nextUrl.clone();
    url.pathname = '/reset-password';
    url.search = '';
    url.searchParams.set('token_hash', tokenHash);
    url.searchParams.set('type', 'recovery');
    url.searchParams.set('confirm', '1');

    const response = NextResponse.redirect(url, { status: 303 });
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    return response;
  }

  if (!VERIFIABLE_TYPES.has(type)) return invalidLinkResponse(request);

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

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  await new Promise<void>((resolve) => setTimeout(resolve, 0));

  if (error || !data.user) {
    console.warn('[auth/confirm] Email token verification failed:', error?.code || error?.message || 'missing_user');
    return invalidLinkResponse(request);
  }

  const destination = new URL(safeNext(request.nextUrl.searchParams.get('next'), type), request.nextUrl.origin);
  if (type === 'email_change') destination.searchParams.set('email_changed', '1');
  if (type === 'signup' || type === 'invite' || type === 'email') destination.searchParams.set('email_confirmed', '1');

  const response = NextResponse.redirect(destination, { status: 303 });
  pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  responseHeaders.forEach((value, key) => response.headers.set(key, value));
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  return response;
}
