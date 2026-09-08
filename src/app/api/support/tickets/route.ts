import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_CATEGORIES = new Set(['general', 'billing', 'technical', 'orders', 'subscriptions', 'refunds', 'other']);
const ALLOWED_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ tickets: data || [] });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { subject, category, priority, message, order_id } = body;

    if (typeof subject !== 'string' || typeof message !== 'string' || !subject.trim() || !message.trim()) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }
    if (subject.trim().length > 200 || message.trim().length > 5000) {
      return NextResponse.json({ error: 'Subject or message is too long' }, { status: 400 });
    }
    const safeCategory = typeof category === 'string' && ALLOWED_CATEGORIES.has(category) ? category : 'general';
    const safePriority = typeof priority === 'string' && ALLOWED_PRIORITIES.has(priority) ? priority : 'normal';

    let safeOrderId: string | null = null;
    if (order_id != null && order_id !== '') {
      if (typeof order_id !== 'string' || !UUID_PATTERN.test(order_id)) {
        return NextResponse.json({ error: 'Invalid order reference' }, { status: 400 });
      }
      const { data: ownedOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('id', order_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!ownedOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      safeOrderId = ownedOrder.id;
    }

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        category: safeCategory,
        priority: safePriority,
        status: 'open',
        order_id: safeOrderId,
      })
      .select()
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: ticketError?.message || 'Failed to create ticket' }, { status: 500 });
    }

    // Add first message
    const { error: msgError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_type: 'user',
        message: message.trim(),
      });

    if (msgError) {
      console.error('[support/tickets] message insert error:', msgError.message);
    }

    // Trigger notification + email (fire-and-forget)
    try {
      const { createNotification } = await import('@/lib/notifications/createNotification');
      await createNotification({
        userId: user.id,
        type: 'announcement',
        title: 'Support ticket created',
        message: `Your ticket "${subject.trim()}" has been submitted. We will respond shortly.`,
        actionUrl: `/user-dashboard/support?ticket=${ticket.id}`,
      });
    } catch (e) {
      console.error('[support/tickets] notification error:', e);
    }

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
