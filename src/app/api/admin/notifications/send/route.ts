import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/admin/notifications/send — admin sends system notification
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const isAdmin =
      user.user_metadata?.role === 'admin' ||
      user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, message, type, action_url, target } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'title and message are required' }, { status: 400 });
    }

    let userIds: string[] = [];

    if (target === 'all') {
      // Fetch all user IDs from auth.users via user_profiles
      const { data: profiles } = await supabase
        .from('user_profiles' as never)
        .select('id');
      userIds = (profiles as { id: string }[] | null)?.map((p) => p.id) || [];
    } else if (Array.isArray(target)) {
      userIds = target;
    } else if (typeof target === 'string') {
      userIds = [target];
    }

    if (userIds.length === 0) {
      return NextResponse.json({ error: 'No target users found' }, { status: 400 });
    }

    const rows = userIds.map((uid) => ({
      user_id: uid,
      type: type || 'announcement',
      title,
      message,
      action_url: action_url || null,
      read: false,
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(rows);

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, sent: userIds.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/admin/notifications/send — get delivery stats
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin =
      user.user_metadata?.role === 'admin' ||
      user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { count: total } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });

    const { count: unread } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false);

    const { count: announcements } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'announcement');

    // Recent 20 notifications for stats
    const { data: recent } = await supabase
      .from('notifications')
      .select('id, type, title, created_at, read')
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      stats: {
        total: total || 0,
        unread: unread || 0,
        read: (total || 0) - (unread || 0),
        announcements: announcements || 0,
      },
      recent: recent || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
