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

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const rawType = request.nextUrl.searchParams.get('type');
  const type = rawType && ALLOWED_TYPES.has(rawType as EmailOtpType)
    ? (rawType as EmailOtpType)
    : null;

  const successUrl = request.nextUrl.clone();
  successUrl.search = '';
  successUrl.pathname = type === 'recovery' ? '/reset-password' : '/user-dashboard';

  const errorUrl = request.nextUrl.clone();
  errorUrl.search = '';
  errorUrl.pathname = type === 'recovery' ? '/reset-password' : '/sign-up-login-screen';
  errorUrl.searchParams.set('auth_error', 'invalid_or_expired_link');

  if (!tokenHash || !type) {
    return NextResponse.redirect(errorUrl, { status: 303 });
  }

  const pendingCookies: Array<{
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }> = [];
  const pendingHeaders: Record<string, string> = {};

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet, headers) {
            pendingCookies.splice(0, pendingCookies.length, ...cookiesToSet);
            if (headers) Object.assign(pendingHeaders, headers);
          },
        },
      },
    );

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      console.error('Auth token hash verification failed:', error.message);
      return NextResponse.redirect(errorUrl, { status: 303 });
    }

    const response = NextResponse.redirect(successUrl, { status: 303 });
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, {
        ...(options as any),
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false,
      });
    });
    Object.entries(pendingHeaders).forEach(([key, value]) => response.headers.set(key, value));
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    return response;
  } catch (error) {
    console.error('Auth confirmation failed:', error);
    return NextResponse.redirect(errorUrl, { status: 303 });
  }
}
