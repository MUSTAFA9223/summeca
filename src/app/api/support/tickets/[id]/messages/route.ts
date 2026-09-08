import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function hasAdminAccess(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();
  return data?.is_admin === true;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const message = body && typeof body === 'object' ? body.message : null;

    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (message.trim().length > 5000) {
      return NextResponse.json({ error: 'Message is too long' }, { status: 400 });
    }

    const isAdmin = await hasAdminAccess(supabase, user.id);

    // Verify ticket access
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('id, user_id, status, subject')
      .eq('id', id)
      .single();

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    if (ticket.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'Cannot reply to a closed ticket' }, { status: 400 });
    }

    const senderType = isAdmin ? 'admin' : 'user';

    const { data: msg, error: msgError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: id,
        sender_id: user.id,
        sender_type: senderType,
        message: message.trim(),
      })
      .select()
      .single();

    if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 });

    // Update ticket status to pending if admin replied
    if (isAdmin) {
      await supabase
        .from('support_tickets')
        .update({ status: 'pending' })
        .eq('id', id)
        .eq('status', 'open');

      // Notify the ticket owner
      try {
        const { createNotification } = await import('@/lib/notifications/createNotification');
        await createNotification({
          userId: ticket.user_id,
          type: 'announcement',
          title: 'Support reply received',
          message: `An admin replied to your ticket: "${ticket.subject}"`,
          actionUrl: `/user-dashboard/support?ticket=${id}`,
        });
      } catch (e) {
        console.error('[support/messages] notification error:', e);
      }
    }

    return NextResponse.json({ message: msg }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
