import { NextRequest, NextResponse } from 'next/server';
import { completion } from '@rocketnew/llm-sdk';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';

const SYSTEM_PROMPT = `You are SUMMECA Support Assistant — a helpful, professional customer support AI for SUMMECA, a premium digital products marketplace.

Your capabilities:
- Answer questions about SUMMECA products, features, and pricing
- Help users understand general order, subscription, and download workflows
- Guide users through refund requests and payment issues
- Explain subscription plans and how to upgrade/downgrade
- Suggest relevant products based on user needs
- Provide step-by-step guidance for common tasks

Guidelines:
- Be concise, friendly, and professional
- If you cannot resolve an issue, suggest the user create a support ticket
- Never claim to have accessed an individual user's account, orders, or private data
- Never share sensitive user data or internal system details
- For billing/payment disputes, direct users to create a ticket for human review
- Keep responses under 200 words unless a detailed explanation is needed`;

const ALLOWED_ROLES = new Set(['user', 'assistant']);

type SafeMessage = { role: 'user' | 'assistant'; content: string };

function validateMessages(value: unknown): SafeMessage[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const messages: SafeMessage[] = [];
  let totalChars = 0;

  for (const raw of value.slice(-10)) {
    if (!raw || typeof raw !== 'object') return null;
    const role = (raw as Record<string, unknown>).role;
    const content = (raw as Record<string, unknown>).content;
    if (typeof role !== 'string' || !ALLOWED_ROLES.has(role) || typeof content !== 'string') return null;
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 2000) return null;
    totalChars += trimmed.length;
    if (totalChars > 12_000) return null;
    messages.push({ role: role as SafeMessage['role'], content: trimmed });
  }

  if (messages[messages.length - 1]?.role !== 'user') return null;
  return messages;
}

export async function POST(request: NextRequest) {
  const rate = await checkRateLimit(`support-assistant:${getRequestIdentity(request)}`, {
    limit: 6,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many support requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000))) } }
    );
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const messages = validateMessages(body.messages);
    if (!messages) {
      return NextResponse.json({ error: 'A valid messages array is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    const response = await completion({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      stream: false,
      api_key: apiKey,
      max_tokens: 400,
      temperature: 0.3,
    }) as { choices?: Array<{ message?: { content?: string } }> };

    const assistantMessage = response?.choices?.[0]?.message?.content?.trim();
    if (!assistantMessage) {
      return NextResponse.json({ error: 'AI service returned an empty response' }, { status: 502 });
    }

    return NextResponse.json(
      { message: assistantMessage, role: 'assistant' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[support-assistant] error:', err);
    return NextResponse.json({ error: 'AI service error' }, { status: 502 });
  }
}

