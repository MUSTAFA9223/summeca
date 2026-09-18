import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';
import { getSaasAccess } from '@/lib/saas/access';

const PRODUCT_SLUG = 'summeca-leadfollow-ai' as const;
const STATUSES = ['new', 'contacted', 'proposal_sent', 'replied', 'won', 'lost'] as const;
const STATUS_SET = new Set(STATUSES);
const LEAD_PAGE_SIZE = 50;

function text(value: unknown, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function optionalDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const raw = text(value, 40);
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

async function sessionUser() {
  const session = await createClient();
  const { data: { user }, error } = await session.auth.getUser();
  return error ? null : user;
}

function requestedPage(request: NextRequest) {
  const raw = Number.parseInt(new URL(request.url).searchParams.get('page') || '1', 10);
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.min(raw, 1000);
}

export async function GET(request: NextRequest) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const access = await getSaasAccess(user.id, PRODUCT_SLUG);
  if (!access.allowed) {
    return NextResponse.json({ error: 'LeadFollow AI purchase required.', access }, { status: 403 });
  }

  const service = createServiceClient();
  const periodStart = new Date();
  periodStart.setUTCDate(1);
  periodStart.setUTCHours(0, 0, 0, 0);
  const periodKey = periodStart.toISOString().slice(0, 10);
  const page = requestedPage(request);
  const from = (page - 1) * LEAD_PAGE_SIZE;
  const to = from + LEAD_PAGE_SIZE - 1;
  const nowIso = new Date().toISOString();

  const pipelineQueries = STATUSES.map((status) =>
    service
      .from('leadfollow_leads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', status),
  );

  const [profileResult, leadsResult, countResult, dueResult, usageResult, ...pipelineResults] = await Promise.all([
    service
      .from('leadfollow_profiles')
      .select('business_name, offer, target_audience, value_proposition, default_tone')
      .eq('user_id', user.id)
      .maybeSingle(),
    service
      .from('leadfollow_leads')
      .select('id, name, company, email, phone, source, status, notes, next_follow_up_at, last_contacted_at, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to),
    service.from('leadfollow_leads').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    service
      .from('leadfollow_leads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['new', 'contacted', 'replied'])
      .lte('next_follow_up_at', nowIso),
    service.from('leadfollow_usage').select('requests_count, tokens_used').eq('user_id', user.id).eq('period_start', periodKey).maybeSingle(),
    ...pipelineQueries,
  ]);

  const firstError =
    profileResult.error ||
    leadsResult.error ||
    countResult.error ||
    dueResult.error ||
    usageResult.error ||
    pipelineResults.find((result) => result.error)?.error;
  if (firstError) {
    console.error('[leadfollow] dashboard load failed:', firstError.message);
    return NextResponse.json({ error: 'Unable to load LeadFollow AI.' }, { status: 500 });
  }

  const leads = leadsResult.data ?? [];
  const leadIds = leads.map((lead) => lead.id);
  const messagesResult = leadIds.length
    ? await service
        .from('leadfollow_messages')
        .select('id, lead_id, channel, stage, tone, language, output_text, created_at')
        .eq('user_id', user.id)
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false })
        .limit(300)
    : { data: [], error: null };

  if (messagesResult.error) {
    console.error('[leadfollow] message history load failed:', messagesResult.error.message);
    return NextResponse.json({ error: 'Unable to load LeadFollow AI.' }, { status: 500 });
  }

  const pipeline = STATUSES.reduce<Record<string, number>>((acc, status, index) => {
    acc[status] = pipelineResults[index]?.count ?? 0;
    return acc;
  }, {});
  const pageTotal = leadsResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(pageTotal / LEAD_PAGE_SIZE));

  return NextResponse.json({
    access,
    profile: profileResult.data,
    leads,
    messages: messagesResult.data ?? [],
    counts: { leads: countResult.count ?? 0, due: dueResult.count ?? 0, pipeline },
    pagination: {
      page,
      pageSize: LEAD_PAGE_SIZE,
      total: pageTotal,
      totalPages,
      hasPrevious: page > 1,
      hasNext: page < totalPages,
    },
    usage: {
      used: usageResult.data?.requests_count ?? 0,
      tokens: usageResult.data?.tokens_used ?? 0,
      limit: access.limits.monthlyAi ?? 0,
      periodStart: periodKey,
    },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: NextRequest) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const access = await getSaasAccess(user.id, PRODUCT_SLUG);
  if (!access.allowed) {
    return NextResponse.json({ error: 'LeadFollow AI purchase required.', access }, { status: 403 });
  }

  const burst = await checkRateLimit(`leadfollow-crm:${getRequestIdentity(request, user.id)}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!burst.allowed) return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 60_000) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const action = text(body.action, 40);
  const service = createServiceClient();

  if (action === 'save_profile') {
    const tone = text(body.defaultTone, 40) || 'professional';
    const { data, error } = await service.from('leadfollow_profiles').upsert({
      user_id: user.id,
      business_name: text(body.businessName, 160),
      offer: text(body.offer, 1200),
      target_audience: text(body.targetAudience, 1200),
      value_proposition: text(body.valueProposition, 1200),
      default_tone: tone,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }).select('*').single();
    if (error) {
      console.error('[leadfollow] profile save failed:', error.message);
      return NextResponse.json({ error: 'Unable to save LeadFollow profile.' }, { status: 500 });
    }
    return NextResponse.json({ profile: data });
  }

  if (action === 'create_lead') {
    const name = text(body.name, 160);
    if (!name) return NextResponse.json({ error: 'Lead name is required.' }, { status: 400 });

    const { count, error: countError } = await service
      .from('leadfollow_leads')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (countError) return NextResponse.json({ error: 'Unable to validate plan limits.' }, { status: 500 });
    if ((count ?? 0) >= (access.limits.maxLeads ?? 0)) {
      return NextResponse.json({ error: `Your ${access.planName} plan lead limit has been reached.` }, { status: 403 });
    }

    const { data, error } = await service.from('leadfollow_leads').insert({
      user_id: user.id,
      name,
      company: text(body.company, 160),
      email: text(body.email, 240),
      phone: text(body.phone, 80),
      source: text(body.source, 120),
      notes: text(body.notes, 4000),
      next_follow_up_at: optionalDate(body.nextFollowUpAt),
    }).select('*').single();
    if (error) {
      console.error('[leadfollow] lead create failed:', error.message);
      return NextResponse.json({ error: 'Unable to create lead.' }, { status: 500 });
    }
    return NextResponse.json({ lead: data });
  }

  if (action === 'update_lead') {
    const leadId = text(body.leadId, 60);
    if (!leadId) return NextResponse.json({ error: 'Lead id is required.' }, { status: 400 });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.status !== undefined) {
      const status = text(body.status, 20);
      if (!STATUS_SET.has(status as typeof STATUSES[number])) return NextResponse.json({ error: 'Invalid lead status.' }, { status: 400 });
      patch.status = status;
      if (status === 'contacted') patch.last_contacted_at = new Date().toISOString();
    }
    if (body.nextFollowUpAt !== undefined) patch.next_follow_up_at = optionalDate(body.nextFollowUpAt);
    if (body.notes !== undefined) patch.notes = text(body.notes, 4000);

    const { data, error } = await service.from('leadfollow_leads')
      .update(patch)
      .eq('id', leadId)
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Lead not found or could not be updated.' }, { status: 404 });
    return NextResponse.json({ lead: data });
  }

  return NextResponse.json({ error: 'Unknown LeadFollow action.' }, { status: 400 });
}
