import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { generateText } from '@/lib/ai/aiProvider';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';
import { getSaasAccess } from '@/lib/saas/access';

const PRODUCT_SLUG = 'summeca-proposalflow-ai' as const;
const LANGUAGES = new Set(['English', 'Arabic']);
const TONES = new Set(['professional', 'friendly', 'concise', 'consultative']);
const TEMPLATES = new Set(['general', 'freelancer', 'agency', 'web-development', 'marketing', 'ecommerce']);

function text(value: unknown, max = 1200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function uuid(value: unknown) {
  const candidate = text(value, 36);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : null;
}

function jsonFromModel(value: string) {
  const cleaned = value
    .replace(/^\`\`\`(?:json)?\s*/i, '')
    .replace(/\s*\`\`\`$/i, '')
    .trim();
  return JSON.parse(cleaned) as {
    executiveSummary: string;
    scope: string;
    deliverables: string[];
    timeline: string;
    pricing: string;
    assumptions: string[];
    nextStep: string;
    followUpEmail: string;
  };
}

async function userSession() {
  const session = await createClient();
  const { data: { user }, error } = await session.auth.getUser();
  return error ? null : user;
}

async function currentUsage(userId: string, productId: string) {
  const service = createServiceClient();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const { count, error } = await service
    .from('ai_generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('metadata->>tool', 'proposalflow')
    .gte('created_at', start.toISOString());

  if (error) throw error;
  return count ?? 0;
}

export async function GET() {
  const user = await userSession();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const access = await getSaasAccess(user.id, PRODUCT_SLUG);
  if (!access.allowed || !access.productId) {
    return NextResponse.json(
      { error: 'ProposalFlow AI access required.', access },
      { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  try {
    const service = createServiceClient();
    const [used, savedResult] = await Promise.all([
      currentUsage(user.id, access.productId),
      service
        .from('proposalflow_proposals')
        .select('id, source_lead_id, client_name, client_company, template, language, tone, project, deliverables, timeline, price, extra_context, output, status, share_enabled, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(25),
    ]);

    if (savedResult.error) throw savedResult.error;

    return NextResponse.json({
      access,
      usage: { used, limit: access.limits.monthlyProposals ?? 0 },
      proposals: savedResult.data ?? [],
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[proposalflow] dashboard load failed:', error);
    return NextResponse.json({ error: 'Unable to load ProposalFlow AI.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await userSession();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const access = await getSaasAccess(user.id, PRODUCT_SLUG);
  if (!access.allowed || !access.productId) {
    return NextResponse.json({ error: 'ProposalFlow AI access required.', access }, { status: 403 });
  }

  const burst = await checkRateLimit(`proposalflow:${getRequestIdentity(request, user.id)}`, {
    limit: 8,
    windowMs: 60_000,
  });
  if (!burst.allowed) {
    return NextResponse.json(
      { error: 'Too many proposal requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((burst.resetAt - Date.now()) / 1000))) } },
    );
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 35_000) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const clientName = text(body.clientName, 160);
  const clientCompany = text(body.clientCompany, 160);
  const project = text(body.project, 1200);
  const deliverables = text(body.deliverables, 1800);
  const timeline = text(body.timeline, 300);
  const price = text(body.price, 240);
  const extraContext = text(body.extraContext, 1800);
  const requestedLanguage = text(body.language, 20);
  const requestedTone = text(body.tone, 30);
  const requestedTemplate = text(body.template, 40);
  const sourceLeadId = uuid(body.sourceLeadId);
  const language = LANGUAGES.has(requestedLanguage) ? requestedLanguage : 'English';
  const tone = TONES.has(requestedTone) ? requestedTone : 'professional';
  const template = TEMPLATES.has(requestedTemplate) ? requestedTemplate : 'general';

  if (!clientName || !project || !deliverables || !price) {
    return NextResponse.json(
      { error: 'Client name, project need, deliverables and price are required.' },
      { status: 400 },
    );
  }

  if (sourceLeadId) {
    const service = createServiceClient();
    const { data: ownedLead, error: leadError } = await service
      .from('leadfollow_leads')
      .select('id')
      .eq('id', sourceLeadId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (leadError || !ownedLead) {
      return NextResponse.json({ error: 'The linked lead is not available.' }, { status: 400 });
    }
  }

  let used = 0;
  try {
    used = await currentUsage(user.id, access.productId);
  } catch (error) {
    console.error('[proposalflow] usage validation failed:', error);
    return NextResponse.json({ error: 'Unable to validate proposal usage right now.' }, { status: 500 });
  }

  const limit = access.limits.monthlyProposals ?? 0;
  if (limit > 0 && used >= limit) {
    return NextResponse.json({ error: 'Monthly ProposalFlow AI limit reached.', used, limit }, { status: 429 });
  }

  const systemPrompt = `You are ProposalFlow AI inside SUMMECA.
Create a practical client proposal package using only facts supplied by the user.

Rules:
- Never invent testimonials, results, credentials, deadlines, legal terms, discounts, guarantees, or client facts.
- Do not imply a contract has been signed or payment has been received.
- Keep scope and deliverables concrete and measurable from the supplied details.
- Pricing must use the exact amount or pricing wording supplied by the user.
- If the timeline is missing, say it should be confirmed with the client instead of inventing one.
- The follow-up email must be concise, professional and non-manipulative.
- This is business drafting assistance, not legal advice.
- Use the selected template only to organize emphasis; do not invent industry-specific facts.
- Write in the requested language.
- Return valid JSON only, with no markdown fences.

Return exactly:
{
  "executiveSummary": "short client-facing summary",
  "scope": "clear scope paragraph",
  "deliverables": ["deliverable 1", "deliverable 2"],
  "timeline": "timeline wording",
  "pricing": "pricing wording using the user's exact price",
  "assumptions": ["assumption or clarification 1"],
  "nextStep": "one low-friction next step",
  "followUpEmail": "ready-to-review follow-up email"
}`;

  const userPrompt = `Requested language: ${language}
Tone: ${tone}
Proposal template: ${template}

Client name: ${clientName}
Client company: ${clientCompany || 'Not provided'}
Project need:
${project}

Requested deliverables:
${deliverables}

Timeline:
${timeline || 'Not provided'}

Price or pricing structure:
${price}

Additional factual context:
${extraContext || 'None'}

Create the proposal package now.`;

  let result;
  try {
    result = await generateText(systemPrompt, userPrompt, { maxTokens: 1500, temperature: 0.3 });
  } catch (error) {
    console.error('[proposalflow] AI generation failed:', error);
    return NextResponse.json({ error: 'Proposal generation failed. Please try again.' }, { status: 502 });
  }

  let output;
  try {
    output = jsonFromModel(result.text);
  } catch (error) {
    console.error('[proposalflow] invalid AI JSON:', error);
    return NextResponse.json({ error: 'Proposal generation returned an invalid format. Please try again.' }, { status: 502 });
  }

  if (
    !output.executiveSummary ||
    !output.scope ||
    !Array.isArray(output.deliverables) ||
    !output.timeline ||
    !output.pricing ||
    !Array.isArray(output.assumptions) ||
    !output.nextStep ||
    !output.followUpEmail
  ) {
    return NextResponse.json({ error: 'Proposal generation was incomplete. Please try again.' }, { status: 502 });
  }

  const service = createServiceClient();
  const [proposalResult, logResult] = await Promise.all([
    service
      .from('proposalflow_proposals')
      .insert({
        user_id: user.id,
        source_lead_id: sourceLeadId,
        client_name: clientName,
        client_company: clientCompany,
        template,
        language,
        tone,
        project,
        deliverables,
        timeline,
        price,
        extra_context: extraContext,
        output,
        status: 'draft',
      })
      .select('id, source_lead_id, client_name, client_company, template, language, tone, project, deliverables, timeline, price, extra_context, output, status, share_enabled, created_at')
      .single(),
    service.from('ai_generations').insert({
      user_id: user.id,
      product_id: access.productId,
      generation_type: 'marketing_campaign',
      model: result.model,
      input_data: {
        tool: 'proposalflow',
        language,
        tone,
        template,
        has_company: Boolean(clientCompany),
        has_timeline: Boolean(timeline),
        has_extra_context: Boolean(extraContext),
        source_lead: Boolean(sourceLeadId),
      },
      output_text: null,
      tokens_used: Math.max(0, Number(result.tokensUsed) || 0),
      duration_ms: Math.max(0, Number(result.durationMs) || 0),
      metadata: { tool: 'proposalflow' },
    }),
  ]);

  if (logResult.error) {
    console.warn('[proposalflow] usage log failed:', logResult.error.message);
  }
  if (proposalResult.error) {
    console.error('[proposalflow] save failed:', proposalResult.error.message);
  }

  if (sourceLeadId && !proposalResult.error) {
    const { error: leadUpdateError } = await service
      .from('leadfollow_leads')
      .update({ status: 'proposal_sent', updated_at: new Date().toISOString() })
      .eq('id', sourceLeadId)
      .eq('user_id', user.id);
    if (leadUpdateError) console.warn('[proposalflow] lead stage update failed:', leadUpdateError.message);
  }

  return NextResponse.json({
    success: true,
    output,
    proposal: proposalResult.data ?? null,
    saved: !proposalResult.error,
    warning: proposalResult.error ? 'Proposal generated but could not be saved.' : null,
    usage: { used: used + 1, limit },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(request: NextRequest) {
  const user = await userSession();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 8_000) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const proposalId = uuid(body.proposalId);
  const status = text(body.status, 20);
  if (!proposalId || !new Set(['draft', 'sent', 'accepted', 'declined']).has(status)) {
    return NextResponse.json({ error: 'Invalid proposal update.' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from('proposalflow_proposals')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', proposalId)
    .eq('user_id', user.id)
    .select('id, status')
    .maybeSingle();

  if (error || !data) {
    console.error('[proposalflow] status update failed:', error?.message);
    return NextResponse.json({ error: 'Unable to update proposal.' }, { status: 500 });
  }

  return NextResponse.json({ proposal: data });
}
