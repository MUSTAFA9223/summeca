import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

function getSafeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/user-dashboard';
  }
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const requestedNext = getSafeNext(searchParams.get('next'));

  if (!code) {
    const loginUrl = new URL('/sign-up-login-screen', origin);
    loginUrl.searchParams.set('oauth_error', 'missing_code');
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error('Google OAuth callback failed:', error?.message || 'No user returned');
    const loginUrl = new URL('/sign-up-login-screen', origin);
    loginUrl.searchParams.set('oauth_error', 'callback_failed');
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', data.user.id)
    .maybeSingle();

  const destination = profile?.is_admin ? '/admin' : requestedNext;
  return NextResponse.redirect(new URL(destination, origin));
}
