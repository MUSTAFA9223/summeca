import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
      console.error('[security/logs] DB read failed:', error.code || 'db_error');
      return NextResponse.json({ error: 'Unable to load security activity.' }, { status: 500 });
    }

    return NextResponse.json(
      { logs: logs || [] },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('[security/logs] Unexpected failure:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ error: 'Unable to load security activity.' }, { status: 500 });
  }
}
