import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_STATUSES = new Set(['open', 'pending', 'resolved', 'closed']);
const ALLOWED_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent']);

async function hasAdminAccess(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();
  return data?.is_admin === true;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const isAdmin = await hasAdminAccess(supabase, user.id);
    if (ticket.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: messages, error: msgError } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    return NextResponse.json({ ticket, messages: messages || [] });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { status, priority } = body;
    const isAdmin = await hasAdminAccess(supabase, user.id);

    // Fetch ticket to verify ownership
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('user_id, status')
      .eq('id', id)
      .single();

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    if (ticket.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Users can only close their own tickets; admins can set any status/priority
    const updates: Record<string, string> = {};
    if (status) {
      if (typeof status !== 'string' || !ALLOWED_STATUSES.has(status)) {
        return NextResponse.json({ error: 'Unsupported ticket status' }, { status: 400 });
      }
      if (!isAdmin && status !== 'closed') {
        return NextResponse.json({ error: 'Users can only close tickets' }, { status: 403 });
      }
      updates.status = status;
    }
    if (priority && isAdmin) {
      if (typeof priority !== 'string' || !ALLOWED_PRIORITIES.has(priority)) {
        return NextResponse.json({ error: 'Unsupported ticket priority' }, { status: 400 });
      }
      updates.priority = priority;
    }
    if (priority && !isAdmin) {
      return NextResponse.json({ error: 'Only administrators can change priority' }, { status: 403 });
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No supported changes supplied' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', id)
      .eq('user_id', isAdmin ? ticket.user_id : user.id)
      .select()
      .single();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ ticket: updated });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
