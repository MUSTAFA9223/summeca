import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const ALLOWED_EVENT_TYPES = new Set([
  'login',
  'logout',
  'password_change',
  'password_reset',
  'suspicious',
  'mfa_enabled',
  'mfa_disabled',
]);

export async function GET(req: NextRequest) {
  try {
    const sessionClient = await createClient();
    const user = await requireAdmin(sessionClient);
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const parsedLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;
    const requestedEventType = searchParams.get('event_type');
    const eventType = requestedEventType && ALLOWED_EVENT_TYPES.has(requestedEventType)
      ? requestedEventType
      : null;

    const supabase = createServiceClient();
    let query = supabase
      .from('user_security_logs')
      .select('id, user_id, event_type, device_info, ip_hash, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventType) query = query.eq('event_type', eventType);

    const { data: logs, error: logsError } = await query;
    if (logsError) {
      console.error('[admin/security] Logs error:', logsError.message);
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    const [totalResult, suspiciousResult, passwordResult, settingsResult] = await Promise.all([
      supabase.from('user_security_logs').select('*', { count: 'exact', head: true }),
      supabase.from('user_security_logs').select('*', { count: 'exact', head: true }).eq('event_type', 'suspicious'),
      supabase.from('user_security_logs').select('*', { count: 'exact', head: true }).eq('event_type', 'password_change'),
      supabase.from('security_settings').select('*', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({
      logs: logs || [],
      stats: {
        totalEvents: totalResult.count || 0,
        suspiciousCount: suspiciousResult.count || 0,
        passwordChanges: passwordResult.count || 0,
        usersWithSettings: settingsResult.count || 0,
      },
    });
  } catch (err) {
    console.error('[admin/security] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
