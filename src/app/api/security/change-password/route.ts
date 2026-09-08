import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';
import { sendEmail } from '@/lib/email/sendEmail';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = checkRateLimit(`change-password:${getRequestIdentity(req, user.id)}`, {
      limit: 5,
      windowMs: 15 * 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many password change attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))) } }
      );
    }

    let body: { currentPassword?: string; newPassword?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const currentPassword = body.currentPassword;
    const newPassword = body.newPassword;
    if (typeof currentPassword !== 'string' || !currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }
    if (typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'New password is required' }, { status: 400 });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json({ error: 'Password must be between 8 and 128 characters' }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'New password must be different from the current password' }, { status: 400 });
    }
    if (!user.email) {
      return NextResponse.json({ error: 'Password changes are unavailable for this account.' }, { status: 400 });
    }

    // A valid session alone is not enough for this sensitive action. Re-authenticate
    // the account with the current password before allowing a password replacement.
    const { data: reauth, error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthError || reauth.user?.id !== user.id) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 403 });
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      console.warn('[change-password] Supabase rejected password update:', updateError.message);
      return NextResponse.json({ error: 'Failed to update password. Please check the password requirements and try again.' }, { status: 400 });
    }

    const service = createServiceClient();
    const { error: logError } = await service.from('user_security_logs').insert({
      user_id: user.id,
      event_type: 'password_change',
      device_info: {
        user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
      },
      ip_hash: null,
    });
    if (logError) console.warn('[change-password] Security log failed:', logError.message);

    const customerName = user.user_metadata?.full_name || user.email.split('@')[0] || 'User';
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://summeca.com').replace(/\/$/, '');

    let emailNotificationSent = false;
    try {
      await sendEmail({
        type: 'security_password_changed',
        to: user.email,
        data: {
          customerName,
          changedAt: new Date().toISOString(),
          securityUrl: `${siteUrl}/user-dashboard/security`,
        },
      } as Parameters<typeof sendEmail>[0]);
      emailNotificationSent = true;
    } catch (emailErr) {
      console.warn('[change-password] Confirmation email failed:', emailErr);
    }

    return NextResponse.json(
      { success: true, emailNotificationSent },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[change-password] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
