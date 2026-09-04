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

// Segment → SQL filter mapping
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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { campaign_id, segment } = body as { campaign_id: string; segment: string };
  if (!campaign_id) return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 });

  // Fetch campaign
  const { data: campaign, error: campErr } = await supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('id', campaign_id)
    .single();

  if (campErr || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  // Fetch target users
  const query = buildSegmentFilter(supabase, segment ?? 'all');
  const { data: users, error: usersErr } = await query.limit(500);
  if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 });

  const targetUsers = users ?? [];

  // Check email preferences and log sends
  let sent = 0;
  const logs = [];
  for (const u of targetUsers) {
    // Check marketing email preference
    const { data: pref } = await supabase
      .from('notification_preferences')
      .select('email_marketing')
      .eq('user_id', u.id)
      .maybeSingle();

    const canSend = pref ? (pref.email_marketing !== false) : true;
    if (!canSend) continue;

    logs.push({
      campaign_id,
      user_id: u.id,
      email_status: 'sent',
    });
    sent++;
  }

  if (logs.length > 0) {
    await supabase.from('campaign_logs').insert(logs);
  }

  // Update campaign status to sent
  await supabase
    .from('marketing_campaigns')
    .update({ status: 'sent' })
    .eq('id', campaign_id);

  return NextResponse.json({ success: true, sent, total: targetUsers.length });
}
