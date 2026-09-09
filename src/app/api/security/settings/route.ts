import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings, error } = await supabase
      .from('security_settings')
      .select('login_alerts, email_alerts, created_at, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[security/settings GET] DB error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    return NextResponse.json(
      { settings: settings || { login_alerts: true, email_alerts: true } },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (err) {
    console.error('[security/settings GET] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = await checkRateLimit(`security-settings:${getRequestIdentity(req, user.id)}`, {
      limit: 20,
      windowMs: 10 * 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many settings updates' }, { status: 429 });
    }

    let body: { login_alerts?: unknown; email_alerts?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (typeof body.login_alerts !== 'boolean' || typeof body.email_alerts !== 'boolean') {
      return NextResponse.json(
        { error: 'login_alerts and email_alerts must be boolean values' },
        { status: 400 }
      );
    }

    const service = createServiceClient();
    const { error } = await service
      .from('security_settings')
      .upsert(
        {
          user_id: user.id,
          login_alerts: body.login_alerts,
          email_alerts: body.email_alerts,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('[security/settings PUT] DB error:', error.message);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    const { error: logError } = await service.from('user_security_logs').insert({
      user_id: user.id,
      event_type: 'security_settings_changed',
      device_info: {
        user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
      },
      ip_hash: null,
    });
    if (logError) console.warn('[security/settings PUT] Security log failed:', logError.message);

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[security/settings PUT] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

