import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const ALLOWED_SEGMENTS = new Set(['all', 'new_customers', 'subscription_users', 'trial_users']);
const MAX_TARGETS = 500;

type MarketingTarget = {
  id: string;
  email: string | null;
  full_name: string | null;
};

async function loadTargets(
  service: ReturnType<typeof createServiceClient>,
  segment: string,
): Promise<{ users: MarketingTarget[]; error?: string }> {
  let profileQuery = service
    .from('user_profiles')
    .select('id, email, full_name');

  if (segment === 'new_customers') {
    profileQuery = profileQuery.gte(
      'created_at',
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    );
  }

  if (segment === 'subscription_users' || segment === 'trial_users') {
    const subscriptionStatus = segment === 'subscription_users' ? 'active' : 'trialing';
    const { data: subscriptions, error: subscriptionsError } = await service
      .from('subscriptions')
      .select('user_id')
      .eq('status', subscriptionStatus)
      .limit(MAX_TARGETS * 2);

    if (subscriptionsError) return { users: [], error: subscriptionsError.message };

    const userIds = Array.from(
      new Set((subscriptions ?? []).map((row) => row.user_id).filter(Boolean)),
    ) as string[];

    if (userIds.length === 0) return { users: [] };
    profileQuery = profileQuery.in('id', userIds.slice(0, MAX_TARGETS));
  }

  const { data, error } = await profileQuery.limit(MAX_TARGETS);
  if (error) return { users: [], error: error.message };
  return { users: (data ?? []) as MarketingTarget[] };
}

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Cross-site request rejected.' }, { status: 403 });
  }

  const session = await createClient();
  const admin = await requireAdmin(session);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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

  // All cross-user marketing reads/writes happen through a trusted server client
  // only after the administrator session has been verified above.
  const service = createServiceClient();

  const { data: campaign, error: campErr } = await service
    .from('marketing_campaigns')
    .select('id, status')
    .eq('id', campaign_id)
    .single();

  if (campErr || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  if (campaign.status === 'queued' || campaign.status === 'sending' || campaign.status === 'sent') {
    return NextResponse.json({ error: 'Campaign has already entered delivery.' }, { status: 409 });
  }

  const { users: targetUsers, error: targetError } = await loadTargets(service, safeSegment);
  if (targetError) return NextResponse.json({ error: targetError }, { status: 500 });

  if (targetUsers.length === 0) {
    return NextResponse.json({ success: true, queued: 0, total: 0, optedIn: 0 });
  }

  const targetIds = targetUsers.map((target) => target.id);
  const { data: preferences, error: preferencesError } = await service
    .from('notification_preferences')
    .select('user_id, email_marketing')
    .in('user_id', targetIds)
    .eq('email_marketing', true);

  if (preferencesError) {
    return NextResponse.json({ error: preferencesError.message }, { status: 500 });
  }

  // Marketing email is opt-in. A missing preference row is not consent.
  const optedInIds = new Set((preferences ?? []).map((pref) => pref.user_id));
  const optedInUsers = targetUsers.filter((target) => optedInIds.has(target.id) && Boolean(target.email));

  if (optedInUsers.length === 0) {
    return NextResponse.json({
      success: true,
      queued: 0,
      total: targetUsers.length,
      optedIn: 0,
    });
  }

  const { data: existingLogs, error: existingError } = await service
    .from('campaign_logs')
    .select('user_id')
    .eq('campaign_id', campaign_id)
    .in('user_id', optedInUsers.map((target) => target.id));

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const alreadyQueued = new Set((existingLogs ?? []).map((log) => log.user_id));
  const logs = optedInUsers
    .filter((target) => !alreadyQueued.has(target.id))
    .map((target) => ({
      campaign_id,
      user_id: target.id,
      email_status: 'queued',
    }));

  if (logs.length > 0) {
    const { error: logError } = await service.from('campaign_logs').insert(logs);
    if (logError) return NextResponse.json({ error: logError.message }, { status: 500 });

    const { error: campaignError } = await service
      .from('marketing_campaigns')
      .update({ status: 'queued' })
      .eq('id', campaign_id)
      .eq('status', campaign.status);

    if (campaignError) return NextResponse.json({ error: campaignError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    queued: logs.length,
    total: targetUsers.length,
    optedIn: optedInUsers.length,
  });
}
