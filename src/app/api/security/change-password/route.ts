import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/sendEmail';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { newPassword } = body;

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'New password is required' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Update password via Supabase Auth (server-side)
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      console.error('[change-password] Update error:', updateError.message);
      return NextResponse.json({ error: updateError.message || 'Failed to update password' }, { status: 400 });
    }

    // Log the event
    await supabase.from('user_security_logs').insert({
      user_id: user.id,
      event_type: 'password_change',
      device_info: {},
      ip_hash: null,
    });

    // Send confirmation email
    const customerName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://summeca.com';

    if (user.email) {
      await sendEmail({
        type: 'security_password_changed',
        to: user.email,
        data: {
          customerName,
          changedAt: new Date().toISOString(),
          securityUrl: `${siteUrl}/user-dashboard/security`,
        },
      } as Parameters<typeof sendEmail>[0]);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[change-password] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
