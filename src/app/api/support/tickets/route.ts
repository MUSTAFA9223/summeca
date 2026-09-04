import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const body = await request.json();
    const { subject, category, priority, message, order_id } = body;

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    // Create ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        category: category || 'general',
        priority: priority || 'normal',
        status: 'open',
        order_id: order_id || null,
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
