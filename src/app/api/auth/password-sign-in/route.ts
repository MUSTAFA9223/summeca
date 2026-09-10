import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';

export const dynamic = 'force-dynamic';

type PendingCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse['cookies']['set']>[2];
};

type SignInBody = {
  email?: unknown;
  password?: unknown;
  next?: unknown;
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

function getCanonicalCookieDomain(): string | null {
  try {
    const hostname = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://summeca.com').hostname
      .toLowerCase()
      .replace(/^www\./, '');
    return hostname === 'summeca.com' ? hostname : null;
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

function appendDomainAuthCookieCleanup(request: NextRequest, response: NextResponse) {
  const prefix = getAuthCookiePrefix();
  const domain = getCanonicalCookieDomain();
  if (!prefix || !domain) return;

  const names = new Set(
    request.cookies.getAll()
      .filter((cookie) => cookie.name.startsWith(prefix))
      .map((cookie) => cookie.name),
  );
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  for (const name of names) {
    response.headers.append(
      'Set-Cookie',
      `${name}=; Path=/; Domain=${domain}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secure}`,
    );
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

function isNativeForm(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  return contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data');
}

function loginPageResponse(request: NextRequest, reason: string, status = 303) {
  const url = new URL('/sign-up-login-screen', request.url);
  url.searchParams.set('login_error', reason);
  const response = NextResponse.redirect(url, status);
  Object.entries(noStoreHeaders()).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

async function readBody(request: NextRequest, nativeForm: boolean): Promise<SignInBody | null> {
  try {
    if (nativeForm) {
      const form = await request.formData();
      return {
        email: form.get('email'),
        password: form.get('password'),
        next: form.get('next'),
      };
    }
    return await request.json() as SignInBody;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const nativeForm = isNativeForm(request);
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get('origin');

  if ((origin && origin !== requestOrigin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    if (nativeForm) return loginPageResponse(request, 'invalid_request');
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: noStoreHeaders() });
  }

  const rate = await checkRateLimit(`password-sign-in:${getRequestIdentity(request)}`, {
    limit: 20,
    windowMs: 15 * 60_000,
  });
  if (!rate.allowed) {
    if (nativeForm) return loginPageResponse(request, 'rate_limited');
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

  const body = await readBody(request, nativeForm);
  if (!body) {
    if (nativeForm) return loginPageResponse(request, 'invalid_request');
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400, headers: noStoreHeaders() });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const requestedNext = getSafeNext(body.next);

  if (!email || email.length > 320 || !password || password.length > 256) {
    if (nativeForm) return loginPageResponse(request, 'invalid_credentials');
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400, headers: noStoreHeaders() });
  }

  const pendingCookies: PendingCookie[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
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
    if (nativeForm) return loginPageResponse(request, 'invalid_credentials');
    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401, headers: noStoreHeaders() },
    );
  }

  const service = createServiceClient();
  const { error: logError } = await service.from('user_security_logs').insert({
    user_id: data.user.id,
    event_type: 'login',
    device_info: {
      user_agent: request.headers.get('user-agent')?.slice(0, 500) ?? null,
      source: 'server',
      method: 'password',
    },
    ip_hash: null,
  });
  if (logError) console.warn('[password-sign-in] Security log write failed:', logError.code || 'db_error');

  let destination = requestedNext ?? '/user-dashboard';
  if (!requestedNext) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profile?.is_admin === true) destination = '/admin';
  }

  const response = nativeForm
    ? NextResponse.redirect(new URL(destination, request.url), 303)
    : NextResponse.json({ success: true, destination }, { headers: noStoreHeaders() });

  Object.entries(noStoreHeaders()).forEach(([key, value]) => response.headers.set(key, value));

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
  appendDomainAuthCookieCleanup(request, response);

  return response;
}
