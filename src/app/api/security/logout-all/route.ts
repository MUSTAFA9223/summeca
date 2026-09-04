import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase?.auth?.getUser();
    if (authError || !user) {
      return NextResponse?.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Log the event before signing out
    await supabase?.from('user_security_logs')?.insert({
      user_id: user?.id,
      event_type: 'logout_all',
      device_info: {},
      ip_hash: null,
    });

    // Sign out globally (terminates all sessions)
    const { error } = await supabase?.auth?.signOut({ scope: 'global' });
    if (error) {
      console.error('[logout-all] Sign out error:', error?.message);
      return NextResponse?.json({ error: 'Failed to sign out' }, { status: 500 });
    }

    return NextResponse?.json({ success: true });
  } catch (err) {
    console.error('[logout-all] Unexpected error:', err);
    return NextResponse?.json({ error: 'Internal server error' }, { status: 500 });
  }
}
