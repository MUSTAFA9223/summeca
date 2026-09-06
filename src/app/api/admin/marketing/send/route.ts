import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const ALLOWED_SEGMENTS = new Set(['all', 'new_customers', 'subscription_users', 'trial_users']);

function buildSegmentFilter(supabase: Awaited<ReturnType<typeof createClient>>, segment: string) {
  const base = supabase.from('user_profiles').select('id, email, full_name');
  switch (segment) {
    case 'new_customers':
      return base.gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    case 'subscription_users':
      return base.eq('subscription_status', 'active');
    case 'trial_users':
      return base.eq('subscription_status', 'trial');
    default:
      return base;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await requireAdmin(supabase);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { campaign_id, segment } = body as { campaign_id?: string; segment?: string };
  if (!campaign_id) return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 });

  const safeSegment = segment ?? 'all';
  if (!ALLOWED_SEGMENTS.has(safeSegment)) {
    return NextResponse.json({ error: 'Invalid segment' }, { status: 400 });
  }

  const { data: campaign, error: campErr } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('id', campaign_id)
    .single();

  if (campErr || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  const query = buildSegmentFilter(supabase, safeSegment);
  const { data: users, error: usersErr } = await query.limit(500);
  if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 });

  const targetUsers = users ?? [];
  let queued = 0;
  const logs = [];

  for (const target of targetUsers) {
    const { data: pref } = await supabase
      .from('notification_preferences')
      .select('email_marketing')
      .eq('user_id', target.id)
      .maybeSingle();

    if (pref?.email_marketing === false) continue;

    logs.push({
      campaign_id,
      user_id: target.id,
      email_status: 'queued',
    });
    queued++;
  }

  if (logs.length > 0) {
    const { error: logError } = await supabase.from('campaign_logs').insert(logs);
    if (logError) return NextResponse.json({ error: logError.message }, { status: 500 });
  }

  await supabase
    .from('marketing_campaigns')
    .update({ status: queued > 0 ? 'queued' : campaign.status })
    .eq('id', campaign_id);

  return NextResponse.json({ success: true, queued, total: targetUsers.length });
}
