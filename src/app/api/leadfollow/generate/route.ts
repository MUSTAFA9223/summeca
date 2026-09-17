import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { generateText } from '@/lib/ai/aiProvider';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';
import { getSaasAccess } from '@/lib/saas/access';

const PRODUCT_SLUG = 'summeca-leadfollow-ai' as const;
const CHANNELS = new Set(['email', 'linkedin', 'whatsapp', 'sms', 'generic']);
const STAGES = new Set(['first_contact', 'follow_up', 'objection', 'close', 'revive']);
const TONES = new Set(['professional', 'friendly', 'concise', 'consultative', 'warm']);
const LANGUAGES = new Set(['English', 'Arabic', 'Spanish', 'French', 'German']);
type ServiceClient = ReturnType<typeof createServiceClient>;

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

async function releaseReservedQuota(service: ServiceClient, userId: string, periodStart: string) {
  const { error } = await service.rpc('release_leadfollow_ai_request', {
    p_user_id: userId,
    p_period_start: periodStart,
  });
  if (error) {
    console.warn('[leadfollow/generate] quota release failed after unsuccessful draft:', error.message);
  }
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

  if (!leadId || !CHANNELS.has(channel) || !STAGES.has(stage) || !TONES.has(tone) || !LANGUAGES.has(language)) {
    return NextResponse.json({ error: 'Invalid lead, channel, follow-up stage, tone, or language.' }, { status: 400 });
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
  const hasSpecificBusinessContext = Boolean(
    profile?.business_name?.trim() || profile?.offer?.trim() || profile?.value_proposition?.trim(),
  );
  const priorContactRecorded = Boolean(lead.last_contacted_at);
  const languageRules = language === 'Arabic'
    ? `Arabic quality requirements:
- Write natural modern professional Arabic, not a literal translation from English.
- Address the recipient directly and naturally by the supplied lead name, for example: "مرحبًا أليكس،". Never describe the recipient as "NAME from COMPANY" in the greeting.
- For email, label the subject as "الموضوع:" rather than "Subject:".
- Use Arabic punctuation and close naturally. Never use the literal phrase "أفضل التمنيات".
- Keep product and company names such as InvoiceFlow Starter, SUMMECA, and Example Store unchanged and readable inside the Arabic text.
- Do not output CRM labels such as "المرحلة التالية" or "موعد المتابعة".`
    : `Language quality requirements:
- Write naturally in ${language}; do not translate English phrases word for word.
- Address the recipient directly by the supplied lead name.
- Keep product and company names unchanged and readable.`;
  const systemPrompt = `You are LeadFollow AI inside SUMMECA. Write one practical sales follow-up draft using only the facts supplied below.

Core grounding rules:
- Never invent testimonials, results, discounts, deadlines, guarantees, credentials, relationships, product facts, needs, objections, or prior interactions.
- Never claim the recipient visited, opened, clicked, requested, replied, agreed to something, or had a conversation unless that fact is explicitly supplied.
- A stage named follow-up or revive does NOT prove that a conversation happened. If prior contact is not explicitly established, follow up on the offer/topic without saying "our previous conversation" or similar.
- Prefer Lead notes and Additional factual context over generic sales language because they are the most lead-specific facts.
- When Sender business, Offer, or Value proposition is provided, anchor the message to at least one concrete supplied business/offer fact in the first two body paragraphs.
- When specific business context exists, do NOT fall back to vague phrases such as "our company", "what we do", "learn more about us", or "our services" when a supplied business, offer, or value proposition can be named instead.
- Never output placeholders such as [Company], [Product], [Name], TBD, or generic template tokens.

Writing rules:
- Keep the message human, specific, concise, and easy to edit before sending.
- Do not use fake urgency, threats, manipulation, impersonation, or deceptive personalization.
- Write in the requested language and tone.
- Match the requested channel: SMS/WhatsApp should be short; LinkedIn concise; email may include a short subject line followed by the body.
- For email, make the subject specific to the supplied offer, need, or next step when possible; avoid generic subjects such as "Following up" when a more concrete subject is supported.
- For email, prefer 2-4 short body paragraphs and one clear, low-friction next step. Do not pad with empty pleasantries.
- For first contact, introduce the sender without pretending prior contact.
- For follow-up or revive, acknowledge uncertainty rather than assuming the prior message was read.
- If a sender business name is provided, finish an email with a natural closing and that business name. Do not invent a personal sender name, title, phone number, or website.
- Treat pipeline status and scheduling as private CRM metadata. Never output internal labels, a next-action line, or a follow-up date unless the user explicitly asks for it in Additional factual context.
- Do not identify the recipient as being "from" their company in the greeting. Address them directly by name.
- Do not include a date line between the subject and greeting.
- ${languageRules}
- Return only the final draft, with no analysis or commentary.`;

  const userPrompt = `Requested language: ${language}
Channel: ${channel}
Stage: ${stage}
Tone: ${tone}

Sender business: ${businessName}
Offer: ${profile?.offer || 'Not provided'}
Target audience: ${profile?.target_audience || 'Not provided'}
Value proposition: ${profile?.value_proposition || 'Not provided'}
Specific business context available: ${hasSpecificBusinessContext ? 'Yes' : 'No'}

Lead name: ${lead.name}
Lead company: ${lead.company || 'Not provided'}
Lead source: ${lead.source || 'Not provided'}
Lead notes: ${lead.notes || 'None'}
Prior contact recorded by LeadFollow: ${priorContactRecorded ? 'Yes' : 'No'}

Additional factual context from the user:
${extraContext || 'None'}

Write the final ${channel} draft now.`;

  let result;
  try {
    result = await generateText(systemPrompt, userPrompt, { maxTokens: 700, temperature: 0.35 });
  } catch (error) {
    console.error('[leadfollow/generate] Workers AI generation failed:', error);
    await releaseReservedQuota(service, user.id, periodKey);
    return NextResponse.json({ error: 'AI draft generation failed. Please try again.' }, { status: 502 });
  }

  const output = plainOutput(result.text);
  if (!output) {
    await releaseReservedQuota(service, user.id, periodKey);
    return NextResponse.json({ error: 'AI returned an empty draft.' }, { status: 502 });
  }

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
    await releaseReservedQuota(service, user.id, periodKey);
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
