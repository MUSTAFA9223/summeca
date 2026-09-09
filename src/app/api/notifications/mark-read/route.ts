import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return noStoreJson({ error: 'Invalid request body' }, { status: 400 });
    }

    const { id, markAll } = body as { id?: unknown; markAll?: unknown };

    if (markAll === true) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      if (error) throw error;
      return noStoreJson({ success: true });
    }

    if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
      return noStoreJson({ error: 'Invalid notification id' }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!updated) return noStoreJson({ error: 'Notification not found' }, { status: 404 });

    return noStoreJson({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return noStoreJson({ error: message }, { status: 500 });
  }
}
