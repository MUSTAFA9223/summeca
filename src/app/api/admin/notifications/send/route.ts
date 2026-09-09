import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { sanitizeInternalActionUrl } from '@/lib/notifications/actionUrl';

const NOTIFICATION_TYPES = new Set([
  'order',
  'payment',
  'subscription',
  'refund',
  'wishlist',
  'recommendation',
  'announcement',
]);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { title, message, type, action_url, target } = body as Record<string, unknown>;
    if (typeof title !== 'string' || typeof message !== 'string' || !title.trim() || !message.trim()) {
      return NextResponse.json({ error: 'title and message are required' }, { status: 400 });
    }
    if (title.trim().length > 200 || message.trim().length > 5000) {
      return NextResponse.json({ error: 'Notification content is too long' }, { status: 400 });
    }

    const safeType = typeof type === 'string' && NOTIFICATION_TYPES.has(type) ? type : 'announcement';
    if (typeof action_url === 'string' && action_url.trim() && !sanitizeInternalActionUrl(action_url)) {
      return NextResponse.json({ error: 'Action URL must be an internal SUMMECA path.' }, { status: 400 });
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

    const safeActionUrl = sanitizeInternalActionUrl(action_url);
    const rows = userIds.map((uid) => ({
      user_id: uid,
      type: safeType,
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

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { count: total, error: totalError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });
    if (totalError) throw totalError;

    const { count: unread, error: unreadError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false);
    if (unreadError) throw unreadError;

    const { count: announcements, error: announcementsError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'announcement');
    if (announcementsError) throw announcementsError;

    const { data: recent, error: recentError } = await supabase
      .from('notifications')
      .select('id, type, title, created_at, read')
      .order('created_at', { ascending: false })
      .limit(20);
    if (recentError) throw recentError;

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
