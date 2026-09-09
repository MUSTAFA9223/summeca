import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

function clearBrowserAuthCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (!isSupabaseAuthCookie(cookie.name)) continue;
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

export async function POST(request: NextRequest) {
  let body: { tokenHash?: unknown; newPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const tokenHash = typeof body.tokenHash === 'string' ? body.tokenHash.trim() : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

  if (tokenHash.length < 20 || tokenHash.length > 2048) {
    return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 });
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    return NextResponse.json({ error: 'Password must be between 8 and 128 characters.' }, { status: 400 });
  }

  // Recovery is intentionally isolated from the browser's SSR cookie session.
  // verifyOtp creates only an in-memory recovery session here, so no recovery
  // refresh token can overwrite the browser's normal auth cookies.
  const supabase = createRecoveryClient();
  const { data: recoveryData, error: verifyError } = await supabase.auth.verifyOtp({
    type: 'recovery',
    token_hash: tokenHash,
  });

  if (verifyError || !recoveryData.user || !recoveryData.session) {
    console.warn('[password-recovery] Token verification failed:', verifyError?.code || 'missing_session');
    return NextResponse.json({ error: 'This reset link is invalid or has expired.' }, { status: 400 });
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    console.warn('[password-recovery] Password update failed:', updateError.code || updateError.message);
    return NextResponse.json({ error: updateError.message || 'Unable to update your password.' }, { status: 400 });
  }

  // Revoke the temporary recovery session. Because this client has no persisted
  // storage, the browser is not asked to refresh or reuse this one-time token.
  const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
  if (signOutError) {
    console.warn('[password-recovery] Recovery-session sign-out failed:', signOutError.code || signOutError.message);
  }

  const response = NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );

  // If the same browser still carries an older/revoked Supabase auth cookie,
  // remove it explicitly before the clean sign-in page is loaded. This avoids
  // a stale refresh token blocking an immediate login with the new password.
  clearBrowserAuthCookies(request, response);
  return response;
}
