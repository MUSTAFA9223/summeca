import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const NOTIFICATION_TYPES = new Set([
  'order',
  'payment',
  'subscription',
  'refund',
  'wishlist',
  'recommendation',
  'announcement',
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    if (type && type !== 'all' && !NOTIFICATION_TYPES.has(type)) {
      return noStoreJson({ error: 'Invalid notification type' }, { status: 400 });
    }

    const unreadOnly = searchParams.get('unread') === 'true';
    const rawLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;

    let query = supabase
      .from('notifications')
      .select('id, type, title, message, action_url, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type && type !== 'all') query = query.eq('type', type);
    if (unreadOnly) query = query.eq('read', false);

    const { data, error } = await query;
    if (error) throw error;

    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
    if (countError) throw countError;

    return noStoreJson({ notifications: data || [], unreadCount: count || 0 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return noStoreJson({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const id = body && typeof body === 'object' ? body.id : null;
    if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
      return noStoreJson({ error: 'Invalid notification id' }, { status: 400 });
    }

    const { data: deleted, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!deleted) return noStoreJson({ error: 'Notification not found' }, { status: 404 });

    return noStoreJson({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return noStoreJson({ error: message }, { status: 500 });
  }
}
