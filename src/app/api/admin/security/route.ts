import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check
    const isAdmin =
      user.user_metadata?.role === 'admin' ||
      user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const eventType = searchParams.get('event_type') || null;

    let query = supabase
      .from('user_security_logs')
      .select('id, user_id, event_type, device_info, ip_hash, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: logs, error: logsError } = await query;
    if (logsError) {
      console.error('[admin/security] Logs error:', logsError.message);
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    // Stats
    const { count: totalEvents } = await supabase
      .from('user_security_logs')
      .select('*', { count: 'exact', head: true });

    const { count: suspiciousCount } = await supabase
      .from('user_security_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'suspicious');

    const { count: passwordChanges } = await supabase
      .from('user_security_logs')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'password_change');

    const { count: usersWithSettings } = await supabase
      .from('security_settings')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      logs: logs || [],
      stats: {
        totalEvents: totalEvents || 0,
        suspiciousCount: suspiciousCount || 0,
        passwordChanges: passwordChanges || 0,
        usersWithSettings: usersWithSettings || 0,
      },
    });
  } catch (err) {
    console.error('[admin/security] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
