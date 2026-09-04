import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Return defaults if no row exists yet
    return NextResponse.json({
      settings: settings || { login_alerts: true, email_alerts: true },
    });
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

    const body = await req.json();
    const { login_alerts, email_alerts } = body;

    const { error } = await supabase
      .from('security_settings')
      .upsert(
        { user_id: user.id, login_alerts: !!login_alerts, email_alerts: !!email_alerts },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('[security/settings PUT] DB error:', error.message);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[security/settings PUT] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
