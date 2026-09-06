import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const VALID_STATUSES = new Set(['all', 'open', 'pending', 'resolved', 'closed']);
const VALID_PRIORITIES = new Set(['all', 'low', 'normal', 'high', 'urgent']);

export async function GET(request: NextRequest) {
  try {
    const sessionClient = await createClient();
    const user = await requireAdmin(sessionClient);
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const requestedStatus = searchParams.get('status') ?? 'all';
    const requestedPriority = searchParams.get('priority') ?? 'all';
    const search = (searchParams.get('search') ?? '').trim().slice(0, 200);

    if (!VALID_STATUSES.has(requestedStatus) || !VALID_PRIORITIES.has(requestedPriority)) {
      return NextResponse.json({ error: 'Invalid filter' }, { status: 400 });
    }

    const supabase = createServiceClient();
    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(500);

    if (requestedStatus !== 'all') query = query.eq('status', requestedStatus);
    if (requestedPriority !== 'all') query = query.eq('priority', requestedPriority);
    if (search) query = query.ilike('subject', `%${search.replace(/[%_]/g, '')}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });

    const { data: allTickets, error: statsError } = await supabase
      .from('support_tickets')
      .select('status')
      .limit(5000);

    if (statsError) return NextResponse.json({ error: 'Failed to fetch ticket stats' }, { status: 500 });

    const stats = {
      total: allTickets?.length || 0,
      open: allTickets?.filter((t) => t.status === 'open').length || 0,
      pending: allTickets?.filter((t) => t.status === 'pending').length || 0,
      resolved: allTickets?.filter((t) => t.status === 'resolved').length || 0,
      closed: allTickets?.filter((t) => t.status === 'closed').length || 0,
    };

    return NextResponse.json({ tickets: data || [], stats });
  } catch (err) {
    console.error('[admin/support/tickets] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
