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

type DeliveryBatchResult = {
  userIds?: unknown;
  success?: unknown;
  providerStatus?: unknown;
};

type MarketingDeliveryResponse = {
  success?: unknown;
  sent?: unknown;
  failed?: unknown;
  results?: unknown;
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

async function markLogs(
  service: ReturnType<typeof createServiceClient>,
  campaignId: string,
  userIds: string[],
  status: 'queued' | 'sent' | 'failed',
): Promise<string | null> {
  if (userIds.length === 0) return null;
  const { error } = await service
    .from('campaign_logs')
    .update({ email_status: status })
    .eq('campaign_id', campaignId)
    .in('user_id', userIds);
  return error?.message ?? null;
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
  if (!campaign_id || !/^[0-9a-f-]{36}$/i.test(campaign_id)) {
    return NextResponse.json({ error: 'A valid campaign_id is required' }, { status: 400 });
  }

  const safeSegment = segment ?? 'all';
  if (!ALLOWED_SEGMENTS.has(safeSegment)) {
    return NextResponse.json({ error: 'Invalid segment' }, { status: 400 });
  }

  // Cross-user marketing reads/writes use a service client only after the
  // administrator session has been verified above.
  const service = createServiceClient();

  const { data: campaign, error: campErr } = await service
    .from('marketing_campaigns')
    .select('id, status, subject, content')
    .eq('id', campaign_id)
    .single();

  if (campErr || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  if (campaign.status === 'sending') {
    return NextResponse.json({ error: 'Campaign delivery is already in progress.' }, { status: 409 });
  }
  if (campaign.status === 'sent') {
    return NextResponse.json({ error: 'Campaign has already been sent.' }, { status: 409 });
  }

  const subject = typeof campaign.subject === 'string' ? campaign.subject.trim() : '';
  const content = typeof campaign.content === 'string' ? campaign.content.trim() : '';
  if (!subject || !content) {
    return NextResponse.json({ error: 'Campaign subject and content are required before sending.' }, { status: 400 });
  }

  const { users: targetUsers, error: targetError } = await loadTargets(service, safeSegment);
  if (targetError) return NextResponse.json({ error: targetError }, { status: 500 });

  if (targetUsers.length === 0) {
    await service.from('marketing_campaigns').update({ status: 'sent' }).eq('id', campaign_id);
    return NextResponse.json({ success: true, sent: 0, failed: 0, total: 0, optedIn: 0 });
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

  // Marketing is strictly opt-in. A missing preference row is not consent.
  const optedInIds = new Set((preferences ?? []).map((pref) => pref.user_id));
  const optedInUsers = targetUsers
    .filter((target) => optedInIds.has(target.id) && Boolean(target.email))
    .sort((left, right) => left.id.localeCompare(right.id));

  if (optedInUsers.length === 0) {
    await service.from('marketing_campaigns').update({ status: 'sent' }).eq('id', campaign_id);
    return NextResponse.json({
      success: true,
      sent: 0,
      failed: 0,
      total: targetUsers.length,
      optedIn: 0,
    });
  }

  const optedInUserIds = optedInUsers.map((target) => target.id);
  const { data: existingLogs, error: existingError } = await service
    .from('campaign_logs')
    .select('user_id, email_status')
    .eq('campaign_id', campaign_id)
    .in('user_id', optedInUserIds);

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const alreadySentIds = new Set(
    (existingLogs ?? [])
      .filter((log) => log.email_status === 'sent')
      .map((log) => log.user_id),
  );
  const deliveryUsers = optedInUsers.filter((target) => !alreadySentIds.has(target.id));

  if (deliveryUsers.length === 0) {
    await service.from('marketing_campaigns').update({ status: 'sent' }).eq('id', campaign_id);
    return NextResponse.json({
      success: true,
      sent: 0,
      failed: 0,
      alreadySent: alreadySentIds.size,
      total: targetUsers.length,
      optedIn: optedInUsers.length,
    });
  }

  const queueRows = deliveryUsers.map((target) => ({
    campaign_id,
    user_id: target.id,
    email_status: 'queued',
  }));
  const { error: queueError } = await service
    .from('campaign_logs')
    .upsert(queueRows, { onConflict: 'campaign_id,user_id' });
  if (queueError) return NextResponse.json({ error: queueError.message }, { status: 500 });

  // Claim campaign delivery with compare-and-set semantics so two admin clicks
  // cannot contact the provider concurrently.
  const { data: claimedCampaign, error: claimError } = await service
    .from('marketing_campaigns')
    .update({ status: 'sending' })
    .eq('id', campaign_id)
    .eq('status', campaign.status)
    .select('id')
    .maybeSingle();

  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 });
  if (!claimedCampaign) {
    return NextResponse.json({ error: 'Campaign delivery was claimed by another request.' }, { status: 409 });
  }

  const expectedIds = new Set(deliveryUsers.map((target) => target.id));
  const { data: deliveryRaw, error: deliveryError } = await service.functions.invoke('send-marketing-email', {
    body: {
      campaignId: campaign_id,
      subject,
      content,
      recipients: deliveryUsers.map((target) => ({
        userId: target.id,
        email: target.email,
        name: target.full_name,
      })),
    },
  });

  if (deliveryError) {
    await markLogs(service, campaign_id, [...expectedIds], 'failed');
    await service.from('marketing_campaigns').update({ status: 'failed' }).eq('id', campaign_id);
    return NextResponse.json(
      { error: 'Email provider could not be reached.', sent: 0, failed: expectedIds.size },
      { status: 502 },
    );
  }

  const delivery = (deliveryRaw ?? {}) as MarketingDeliveryResponse;
  const batchResults = Array.isArray(delivery.results)
    ? delivery.results as DeliveryBatchResult[]
    : [];
  const sentIds = new Set<string>();
  const failedIds = new Set<string>();

  for (const batch of batchResults) {
    if (!Array.isArray(batch.userIds)) continue;
    const succeeded = batch.success === true;
    for (const value of batch.userIds) {
      if (typeof value !== 'string' || !expectedIds.has(value)) continue;
      if (succeeded) sentIds.add(value);
      else failedIds.add(value);
    }
  }

  // Fail closed if the worker omitted any recipient from its result.
  for (const userId of expectedIds) {
    if (!sentIds.has(userId) && !failedIds.has(userId)) failedIds.add(userId);
  }

  const sentLogError = await markLogs(service, campaign_id, [...sentIds], 'sent');
  const failedLogError = await markLogs(service, campaign_id, [...failedIds], 'failed');
  if (sentLogError || failedLogError) {
    await service.from('marketing_campaigns').update({ status: 'failed' }).eq('id', campaign_id);
    return NextResponse.json({ error: 'Delivery completed but campaign audit logging failed.' }, { status: 500 });
  }

  const finalStatus = failedIds.size === 0 ? 'sent' : 'failed';
  const { error: finalCampaignError } = await service
    .from('marketing_campaigns')
    .update({ status: finalStatus })
    .eq('id', campaign_id)
    .eq('status', 'sending');

  if (finalCampaignError) {
    return NextResponse.json({ error: finalCampaignError.message }, { status: 500 });
  }

  const response = {
    success: failedIds.size === 0,
    sent: sentIds.size,
    failed: failedIds.size,
    alreadySent: alreadySentIds.size,
    total: targetUsers.length,
    optedIn: optedInUsers.length,
  };

  if (failedIds.size > 0) {
    return NextResponse.json(
      { ...response, error: `Campaign partially delivered: ${sentIds.size} sent, ${failedIds.size} failed.` },
      { status: 502 },
    );
  }

  return NextResponse.json(response);
}
