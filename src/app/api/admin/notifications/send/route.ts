import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

function sanitizeActionUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value.slice(0, 2048);
}

// POST /api/admin/notifications/send — admin sends system notification
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { title, message, type, action_url, target } = body;

    if (typeof title !== 'string' || typeof message !== 'string' || !title.trim() || !message.trim()) {
      return NextResponse.json({ error: 'title and message are required' }, { status: 400 });
    }
    if (title.length > 200 || message.length > 5000) {
      return NextResponse.json({ error: 'Notification content is too long' }, { status: 400 });
    }

    let userIds: string[] = [];

    if (target === 'all') {
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(5000);
      if (profileError) throw profileError;
      userIds = (profiles ?? []).map((p) => p.id);
    } else if (Array.isArray(target)) {
      userIds = target.filter((id): id is string => typeof id === 'string').slice(0, 5000);
    } else if (typeof target === 'string') {
      userIds = [target];
    }

    userIds = [...new Set(userIds)];
    if (userIds.length === 0) {
      return NextResponse.json({ error: 'No target users found' }, { status: 400 });
    }

    const safeActionUrl = sanitizeActionUrl(action_url);
    const rows = userIds.map((uid) => ({
      user_id: uid,
      type: typeof type === 'string' ? type.slice(0, 50) : 'announcement',
      title: title.trim(),
      message: message.trim(),
      action_url: safeActionUrl,
      read: false,
    }));

    const { error: insertError } = await supabase.from('notifications').insert(rows);
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
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
