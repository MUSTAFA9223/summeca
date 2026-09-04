import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const meta = user.user_metadata ?? {};
  const appMeta = user.app_metadata ?? {};
  if (meta.role !== 'admin' && appMeta.role !== 'admin') return null;
  return user;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const user = await requireAdmin(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = supabase
    .from('marketing_campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ campaigns: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await requireAdmin(supabase);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { name, campaign_type, subject, content, target_type, status } = body as Record<string, string>;
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('marketing_campaigns')
    .insert({
      admin_id: user.id,
      name,
      campaign_type: campaign_type ?? 'email',
      status: status ?? 'draft',
      subject: subject ?? null,
      content: content ?? null,
      target_type: target_type ?? 'all',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data });
}
