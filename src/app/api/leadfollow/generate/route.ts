import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { generateText } from '@/lib/ai/aiProvider';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';
import { getSaasAccess } from '@/lib/saas/access';

const PRODUCT_SLUG = 'summeca-leadfollow-ai' as const;
const CHANNELS = new Set(['email', 'linkedin', 'whatsapp', 'sms', 'generic']);
const STAGES = new Set(['first_contact', 'follow_up', 'objection', 'close', 'revive']);

function text(value: unknown, max = 800) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function plainOutput(value: string) {
  return value
    .replace(/^```(?:text|markdown)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, 6000);
}

export async function POST(request: NextRequest) {
  const session = await createClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const access = await getSaasAccess(user.id, PRODUCT_SLUG);
  if (!access.allowed) {
    return NextResponse.json({ error: 'LeadFollow AI purchase required.', access }, { status: 403 });
  }

  const burst = await checkRateLimit(`leadfollow-ai:${getRequestIdentity(request, user.id)}`, {
    limit: 12,
    windowMs: 60_000,
  });
  if (!burst.allowed) {
    return NextResponse.json(
      { error: 'Too many AI requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((burst.resetAt - Date.now()) / 1000))) } },
    );
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 40_000) return NextResponse.json({ error: 'AI request is too large.' }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const leadId = text(body.leadId, 60);
  const channel = text(body.channel, 20) || 'email';
  const stage = text(body.stage, 30) || 'follow_up';
  const tone = text(body.tone, 40) || 'professional';
  const language = text(body.language, 40) || 'English';
  const extraContext = text(body.extraContext, 2500);

  if (!leadId || !CHANNELS.has(channel) || !STAGES.has(stage)) {
    return NextResponse.json({ error: 'Invalid lead, channel, or follow-up stage.' }, { status: 400 });
  }

  const service = createServiceClient();
  const [{ data: lead, error: leadError }, { data: profile }] = await Promise.all([
    service.from('leadfollow_leads').select('id, name, company, email, phone, source, status, notes, last_contacted_at, next_follow_up_at').eq('id', leadId).eq('user_id', user.id).maybeSingle(),
    service.from('leadfollow_profiles').select('business_name, offer, target_audience, value_proposition, default_tone').eq('user_id', user.id).maybeSingle(),
  ]);

  if (leadError || !lead) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });

  const period = new Date();
  period.setUTCDate(1);
  period.setUTCHours(0, 0, 0, 0);
  const periodKey = period.toISOString().slice(0, 10);
  const monthlyLimit = access.limits.monthlyAi ?? 0;

  const { data: reservedCount, error: reserveError } = await service.rpc('reserve_leadfollow_ai_request', {
    p_user_id: user.id,
    p_period_start: periodKey,
    p_limit: monthlyLimit,
  });

  if (reserveError) {
    console.error('[leadfollow/generate] quota reservation failed:', reserveError.message);
    return NextResponse.json({ error: 'Unable to validate AI usage right now.' }, { status: 500 });
  }
  if (reservedCount === null) {
    return NextResponse.json({ error: 'Monthly AI draft limit reached.', used: monthlyLimit, limit: monthlyLimit }, { status: 429 });
  }

  const businessName = profile?.business_name || 'the sender';
  const systemPrompt = `You are LeadFollow AI inside SUMMECA. Write one practical sales follow-up draft using only the facts supplied below.

Rules:
- Never invent testimonials, results, discounts, deadlines, guarantees, credentials, relationships, or product facts.
- Never claim the recipient visited, opened, clicked, requested, or agreed to something unless that fact is explicitly supplied.
- Do not use fake urgency, threats, manipulation, impersonation, or deceptive personalization.
- Keep the message natural and easy to edit before sending.
- Write in the requested language.
- Match the requested channel: SMS/WhatsApp should be short; LinkedIn concise; email may include a short subject line followed by the body.
- For first contact, introduce the sender without pretending prior contact.
- For follow-up or revive, acknowledge uncertainty rather than assuming the prior message was read.
- Return only the final draft, with no analysis or commentary.`;

  const userPrompt = `Requested language: ${language}
Channel: ${channel}
Stage: ${stage}
Tone: ${tone}

Sender business: ${businessName}
Offer: ${profile?.offer || 'Not provided'}
Target audience: ${profile?.target_audience || 'Not provided'}
Value proposition: ${profile?.value_proposition || 'Not provided'}

Lead name: ${lead.name}
Lead company: ${lead.company || 'Not provided'}
Lead source: ${lead.source || 'Not provided'}
Pipeline status: ${lead.status}
Lead notes: ${lead.notes || 'None'}
Last contacted: ${lead.last_contacted_at || 'Not recorded'}
Next follow-up: ${lead.next_follow_up_at || 'Not scheduled'}

Additional factual context from the user:
${extraContext || 'None'}

Write the final ${channel} draft now.`;

  let result;
  try {
    result = await generateText(systemPrompt, userPrompt, { maxTokens: 700, temperature: 0.45 });
  } catch (error) {
    console.error('[leadfollow/generate] Workers AI generation failed:', error);
    return NextResponse.json({ error: 'AI draft generation failed. Please try again.' }, { status: 502 });
  }

  const output = plainOutput(result.text);
  if (!output) return NextResponse.json({ error: 'AI returned an empty draft.' }, { status: 502 });

  const { data: message, error: saveError } = await service.from('leadfollow_messages').insert({
    user_id: user.id,
    lead_id: lead.id,
    channel,
    stage,
    tone,
    language,
    input_context: extraContext,
    output_text: output,
    model: result.model,
    tokens_used: Math.max(0, Number(result.tokensUsed) || 0),
  }).select('*').single();

  if (saveError) {
    console.error('[leadfollow/generate] history save failed:', saveError.message);
    return NextResponse.json({ error: 'Draft generated but could not be saved safely.' }, { status: 500 });
  }

  const { error: tokenError } = await service.rpc('record_leadfollow_ai_tokens', {
    p_user_id: user.id,
    p_period_start: periodKey,
    p_tokens: Math.max(0, Number(result.tokensUsed) || 0),
  });
  if (tokenError) console.warn('[leadfollow/generate] token accounting failed:', tokenError.message);

  return NextResponse.json({
    success: true,
    message,
    output,
    usage: { used: Number(reservedCount), limit: monthlyLimit },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
