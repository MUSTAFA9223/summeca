import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getSaasAccess } from '@/lib/saas/access';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';

const PRODUCT_SLUG = 'summeca-siteagent-ai' as const;

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function normalizeDomain(value: unknown) {
  const raw = text(value, 240).toLowerCase();
  if (!raw) return '';
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(withProtocol).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function validEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sessionUser() {
  const session = await createClient();
  const { data: { user }, error } = await session.auth.getUser();
  return error ? null : user;
}

function monthKey() {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

async function ensureAgent(userId: string) {
  const service = createServiceClient();
  const columns = 'user_id, public_key, agent_name, business_name, welcome_message, knowledge_text, human_email, allowed_domains, capture_leads, is_enabled, created_at, updated_at';
  const existing = await service.from('siteagent_agents').select(columns).eq('user_id', userId).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const created = await service
    .from('siteagent_agents')
    .insert({ user_id: userId })
    .select(columns)
    .single();
  if (created.error) throw created.error;
  return created.data;
}

export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const access = await getSaasAccess(user.id, PRODUCT_SLUG);
  if (!access.allowed || !access.productId) {
    return NextResponse.json({ error: 'SiteAgent AI access required.', access }, { status: 403 });
  }

  try {
    const service = createServiceClient();
    const [agent, usageResult, conversationsResult] = await Promise.all([
      ensureAgent(user.id),
      service
        .from('siteagent_usage')
        .select('requests_count, tokens_used')
        .eq('user_id', user.id)
        .eq('period_start', monthKey())
        .maybeSingle(),
      service
        .from('siteagent_conversations')
        .select('id, visitor_name, visitor_email, visitor_company, page_url, status, lead_id, started_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(25),
    ]);

    if (usageResult.error) throw usageResult.error;
    if (conversationsResult.error) throw conversationsResult.error;

    return NextResponse.json({
      access,
      agent: {
        publicKey: agent.public_key,
        agentName: agent.agent_name,
        businessName: agent.business_name,
        welcomeMessage: agent.welcome_message,
        knowledgeText: agent.knowledge_text,
        humanEmail: agent.human_email,
        allowedDomains: agent.allowed_domains ?? [],
        captureLeads: agent.capture_leads,
        isEnabled: agent.is_enabled,
      },
      usage: {
        used: usageResult.data?.requests_count ?? 0,
        tokens: usageResult.data?.tokens_used ?? 0,
        limit: access.limits.monthlySiteAgentReplies ?? 0,
      },
      conversations: conversationsResult.data ?? [],
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[siteagent] dashboard load failed:', error);
    return NextResponse.json({ error: 'Unable to load SiteAgent AI.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const access = await getSaasAccess(user.id, PRODUCT_SLUG);
  if (!access.allowed || !access.productId) {
    return NextResponse.json({ error: 'SiteAgent AI access required.', access }, { status: 403 });
  }

  const burst = await checkRateLimit(`siteagent-settings:${getRequestIdentity(request, user.id)}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!burst.allowed) {
    return NextResponse.json({ error: 'Too many updates. Please try again shortly.' }, { status: 429 });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 120_000) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (text(body.action, 40) !== 'save_agent') {
    return NextResponse.json({ error: 'Unknown SiteAgent action.' }, { status: 400 });
  }

  const agentName = text(body.agentName, 100) || 'SiteAgent AI';
  const businessName = text(body.businessName, 160);
  const welcomeMessage = text(body.welcomeMessage, 500) || 'Hi! How can I help today?';
  const knowledgeText = text(body.knowledgeText, 80_000);
  const humanEmail = text(body.humanEmail, 240).toLowerCase();
  const rawDomains = Array.isArray(body.allowedDomains)
    ? body.allowedDomains
    : text(body.allowedDomains, 4000).split(/[\n,]/);
  const allowedDomains = [...new Set(rawDomains.map(normalizeDomain).filter(Boolean))];
  const maxKnowledgeChars = access.limits.maxKnowledgeChars ?? 0;
  const maxDomains = access.limits.maxSiteAgentDomains ?? 0;

  if (!validEmail(humanEmail)) {
    return NextResponse.json({ error: 'Enter a valid human handoff email.' }, { status: 400 });
  }
  if (knowledgeText.length > maxKnowledgeChars) {
    return NextResponse.json(
      { error: `Your ${access.planName} plan allows up to ${maxKnowledgeChars.toLocaleString()} knowledge characters.` },
      { status: 403 },
    );
  }
  if (allowedDomains.length > maxDomains) {
    return NextResponse.json(
      { error: `Your ${access.planName} plan allows up to ${maxDomains} website domain${maxDomains === 1 ? '' : 's'}.` },
      { status: 403 },
    );
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from('siteagent_agents')
    .upsert({
      user_id: user.id,
      agent_name: agentName,
      business_name: businessName,
      welcome_message: welcomeMessage,
      knowledge_text: knowledgeText,
      human_email: humanEmail,
      allowed_domains: allowedDomains,
      capture_leads: body.captureLeads !== false,
      is_enabled: body.isEnabled !== false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('public_key, agent_name, business_name, welcome_message, knowledge_text, human_email, allowed_domains, capture_leads, is_enabled')
    .single();

  if (error) {
    console.error('[siteagent] settings save failed:', error.message);
    return NextResponse.json({ error: 'Unable to save SiteAgent AI settings.' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    agent: {
      publicKey: data.public_key,
      agentName: data.agent_name,
      businessName: data.business_name,
      welcomeMessage: data.welcome_message,
      knowledgeText: data.knowledge_text,
      humanEmail: data.human_email,
      allowedDomains: data.allowed_domains ?? [],
      captureLeads: data.capture_leads,
      isEnabled: data.is_enabled,
    },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
