import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: NO_STORE_HEADERS });
}

function createRecoveryClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );
}

function isSupabaseAuthCookie(name: string) {
  return name.startsWith('sb-') && (
    name.includes('-auth-token') ||
    name.includes('-code-verifier')
  );
}

function isPkceVerifierCookie(name: string) {
  return name.includes('-code-verifier');
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

function clearBrowserAuthCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (!isSupabaseAuthCookie(cookie.name)) continue;
    response.cookies.set(cookie.name, '', {
      path: '/',
      expires: new Date(0),
      maxAge: 0,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: isPkceVerifierCookie(cookie.name),
    });
  }
}

function appendDomainAuthCookieCleanup(request: NextRequest, response: NextResponse) {
  const domain = getCanonicalCookieDomain();
  if (!domain) return;

  const names = new Set(
    request.cookies.getAll()
      .filter((cookie) => isSupabaseAuthCookie(cookie.name))
      .map((cookie) => cookie.name),
  );
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  for (const name of names) {
    const httpOnly = isPkceVerifierCookie(name) ? '; HttpOnly' : '';
    response.headers.append(
      'Set-Cookie',
      `${name}=; Path=/; Domain=${domain}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secure}${httpOnly}`,
    );
  }
}

export async function POST(request: NextRequest) {
  let body: { tokenHash?: unknown; newPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid request.', 400);
  }

  const tokenHash = typeof body.tokenHash === 'string' ? body.tokenHash.trim() : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

  if (tokenHash.length < 20 || tokenHash.length > 2048) {
    return jsonError('This reset link is invalid or has expired.', 400);
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    return jsonError('Password must be between 8 and 128 characters.', 400);
  }

  const supabase = createRecoveryClient();
  const { data: recoveryData, error: verifyError } = await supabase.auth.verifyOtp({
    type: 'recovery',
    token_hash: tokenHash,
  });

  if (verifyError || !recoveryData.user || !recoveryData.session) {
    console.warn('[password-recovery] Token verification failed:', verifyError?.code || 'missing_session');
    return jsonError('This reset link is invalid or has expired.', 400);
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    console.warn('[password-recovery] Password update failed:', updateError.code || 'update_failed');
    return jsonError(
      'Unable to update your password. Please request a new reset link and try again.',
      400,
    );
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
  if (signOutError) {
    console.warn('[password-recovery] Recovery-session sign-out failed:', signOutError.code || 'signout_failed');
  }

  const response = NextResponse.json(
    { success: true },
    { headers: NO_STORE_HEADERS },
  );

  // Clear both current host-only cookies and legacy Domain=summeca.com copies so
  // Chrome cannot keep a revoked recovery/session generation beside the next login.
  clearBrowserAuthCookies(request, response);
  appendDomainAuthCookieCleanup(request, response);
  return response;
}
