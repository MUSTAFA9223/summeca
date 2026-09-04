import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/notifications/preferences — get user email preferences
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Return defaults if no preferences set
    const prefs = data || {
      email_orders: true,
      email_marketing: false,
      email_product_updates: true,
      email_subscription: true,
    };

    return NextResponse.json({ preferences: prefs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/notifications/preferences — upsert user email preferences
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { email_orders, email_marketing, email_product_updates, email_subscription } = body;

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        email_orders: email_orders ?? true,
        email_marketing: email_marketing ?? false,
        email_product_updates: email_product_updates ?? true,
        email_subscription: email_subscription ?? true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ preferences: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
