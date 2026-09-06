import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';

const CLIENT_LOGGABLE_EVENTS = new Set([
  'login',
  'logout',
  'mfa_enabled',
  'mfa_disabled',
  'security_settings_changed',
]);

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: logs, error } = await supabase
      .from('user_security_logs')
      .select('id, event_type, device_info, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[security/logs] DB error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    return NextResponse.json({ logs: logs || [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    console.error('[security/logs] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rate = checkRateLimit(`security-log:${getRequestIdentity(req, user.id)}`, {
      limit: 20,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many log requests' }, { status: 429 });
    }

    let body: { event_type?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const eventType = typeof body.event_type === 'string' ? body.event_type : '';
    if (!CLIENT_LOGGABLE_EVENTS.has(eventType)) {
      return NextResponse.json({ error: 'Unsupported security event' }, { status: 400 });
    }

    const service = createServiceClient();
    const { error } = await service.from('user_security_logs').insert({
      user_id: user.id,
      event_type: eventType,
      device_info: {
        user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
      },
      // Never trust a client-supplied IP hash.
      ip_hash: null,
    });

    if (error) {
      console.error('[security/logs POST] DB error:', error.message);
      return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[security/logs POST] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
