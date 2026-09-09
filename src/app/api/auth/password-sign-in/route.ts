import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

type PendingCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse['cookies']['set']>[2];
};

function getSafeNext(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/sign-up-login-screen')) return null;
  return value;
}

export async function POST(request: NextRequest) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  if ((origin && origin !== requestOrigin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const rate = checkRateLimit(`password-sign-in:${getRequestIdentity(request)}`, {
    limit: 20,
    windowMs: 15 * 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))),
          'Cache-Control': 'private, no-store',
        },
      },
    );
  }

  let body: { email?: unknown; password?: unknown; next?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const requestedNext = getSafeNext(body.next);

  if (!email || email.length > 320 || !password || password.length > 256) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 });
  }

  const pendingCookies: PendingCookie[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options });
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) {
    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  let destination = requestedNext ?? '/user-dashboard';
  if (!requestedNext) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profile?.is_admin === true) destination = '/admin';
  }

  const response = NextResponse.json(
    { success: true, destination },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );

  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, {
      ...options,
      path: options?.path || '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
    });
  }

  return response;
}
