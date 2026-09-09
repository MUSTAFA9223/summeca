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

function noStoreHeaders(extra: Record<string, string> = {}) {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
    ...extra,
  };
}

export async function POST(request: NextRequest) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  if ((origin && origin !== requestOrigin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: noStoreHeaders() });
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
        headers: noStoreHeaders({
          'Retry-After': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))),
        }),
      },
    );
  }

  let body: { email?: unknown; password?: unknown; next?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: noStoreHeaders() });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const requestedNext = getSafeNext(body.next);

  if (!email || email.length > 320 || !password || password.length > 256) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400, headers: noStoreHeaders() });
  }

  const pendingCookies: PendingCookie[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Password sign-in is a fresh authentication operation. Do not let a stale
        // or partially-written Chrome cookie generation participate in this request.
        getAll() {
          return [];
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
      { status: 401, headers: noStoreHeaders() },
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
    { headers: noStoreHeaders() },
  );

  // Chrome can retain obsolete Supabase chunk cookies from older session writes.
  // Remove the whole SUMMECA auth cookie family before writing the new generation.
  clearStaleAuthCookies(request, response);

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
