import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_CATEGORIES = new Set(['general', 'billing', 'technical', 'orders', 'subscriptions', 'refunds', 'other']);
const ALLOWED_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);
const ALLOWED_STATUSES = new Set(['all', 'open', 'pending', 'resolved', 'closed']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    if (!ALLOWED_STATUSES.has(status)) {
      return noStoreJson({ error: 'Invalid ticket status filter' }, { status: 400 });
    }

    let query = supabase
      .from('support_tickets')
      .select('id, subject, category, priority, status, order_id, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return noStoreJson({ error: 'Could not load support tickets.' }, { status: 500 });

    return noStoreJson({ tickets: data || [] });
  } catch (err) {
    console.error('[support/tickets] GET error:', err);
    return noStoreJson({ error: 'Support service is temporarily unavailable.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return noStoreJson({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return noStoreJson({ error: 'Invalid request body' }, { status: 400 });
    }

    const { subject, category, priority, message, order_id } = body as Record<string, unknown>;
    if (typeof subject !== 'string' || typeof message !== 'string' || !subject.trim() || !message.trim()) {
      return noStoreJson({ error: 'Subject and message are required' }, { status: 400 });
    }
    if (subject.trim().length > 200 || message.trim().length > 5000) {
      return noStoreJson({ error: 'Subject or message is too long' }, { status: 400 });
    }

    const safeCategory = typeof category === 'string' && ALLOWED_CATEGORIES.has(category) ? category : 'general';
    const safePriority = typeof priority === 'string' && ALLOWED_PRIORITIES.has(priority) ? priority : 'normal';

    let safeOrderId: string | null = null;
    if (order_id != null && order_id !== '') {
      if (typeof order_id !== 'string' || !UUID_PATTERN.test(order_id)) {
        return noStoreJson({ error: 'Invalid order reference' }, { status: 400 });
      }
      const { data: ownedOrder, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('id', order_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (orderError) return noStoreJson({ error: 'Could not validate order reference.' }, { status: 500 });
      if (!ownedOrder) return noStoreJson({ error: 'Order not found' }, { status: 404 });
      safeOrderId = ownedOrder.id;
    }

    const { data: ticketId, error: createError } = await supabase.rpc('create_support_ticket_with_message', {
      p_subject: subject.trim(),
      p_message: message.trim(),
      p_category: safeCategory,
      p_priority: safePriority,
      p_order_id: safeOrderId,
    });

    if (createError || typeof ticketId !== 'string') {
      console.error('[support/tickets] Atomic create failed:', createError?.message);
      return noStoreJson({ error: 'Could not create support ticket.' }, { status: 500 });
    }

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('id, subject, category, priority, status, order_id, created_at, updated_at')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single();

    if (ticketError || !ticket) {
      return noStoreJson({ error: 'Ticket was created but could not be loaded.' }, { status: 500 });
    }

    try {
      const { createNotification } = await import('@/lib/notifications/createNotification');
      await createNotification({
        userId: user.id,
        type: 'announcement',
        title: 'Support ticket created',
        message: `Your ticket "${subject.trim()}" has been submitted and is now in the support queue.`,
        actionUrl: `/user-dashboard/support?ticket=${ticket.id}`,
      });
    } catch (error) {
      console.error('[support/tickets] notification error:', error);
    }

    return noStoreJson({ ticket }, { status: 201 });
  } catch (err) {
    console.error('[support/tickets] POST error:', err);
    return noStoreJson({ error: 'Support service is temporarily unavailable.' }, { status: 500 });
  }
}
