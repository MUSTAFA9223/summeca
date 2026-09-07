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

  if (type === 'recovery' && tokenHash) {
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

  const errorUrl = request.nextUrl.clone();
  errorUrl.pathname = '/sign-up-login-screen';
  errorUrl.search = '';
  errorUrl.searchParams.set('auth_error', 'invalid_or_expired_link');
  return NextResponse.redirect(errorUrl, { status: 303 });
}
