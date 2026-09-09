import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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

  const supabase = await createClient();
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

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
  if (signOutError) {
    console.warn('[password-recovery] Global sign-out failed after password update:', signOutError.code || signOutError.message);
    await supabase.auth.signOut({ scope: 'local' });
  }

  return NextResponse.json({ success: true }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
