import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const priority = searchParams.get('priority');

    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('updated_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }
    if (search?.trim()) {
      query = query.ilike('subject', `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get stats
    const { data: allTickets } = await supabase
      .from('support_tickets')
      .select('status');

    const stats = {
      total: allTickets?.length || 0,
      open: allTickets?.filter(t => t.status === 'open').length || 0,
      pending: allTickets?.filter(t => t.status === 'pending').length || 0,
      resolved: allTickets?.filter(t => t.status === 'resolved').length || 0,
      closed: allTickets?.filter(t => t.status === 'closed').length || 0,
    };

    return NextResponse.json({ tickets: data || [], stats });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
