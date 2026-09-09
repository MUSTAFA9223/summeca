import { NextRequest, NextResponse } from 'next/server';
import { completion } from '@rocketnew/llm-sdk';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';

const API_KEYS: Record<string, string | undefined> = {
  OPEN_AI: process.env.OPENAI_API_KEY,
  ANTHROPIC: process.env.ANTHROPIC_API_KEY,
  GEMINI: process.env.GEMINI_API_KEY,
  PERPLEXITY: process.env.PERPLEXITY_API_KEY,
};

const ALLOWED_PROVIDERS = new Set(Object.keys(API_KEYS));
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);

type SafeMessage = { role: 'system' | 'user' | 'assistant'; content: string };

function safeParameters(value: unknown) {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const out: Record<string, number> = {};

  if (typeof input.temperature === 'number') out.temperature = Math.min(2, Math.max(0, input.temperature));
  if (typeof input.top_p === 'number') out.top_p = Math.min(1, Math.max(0, input.top_p));
  if (typeof input.frequency_penalty === 'number') out.frequency_penalty = Math.min(2, Math.max(-2, input.frequency_penalty));
  if (typeof input.presence_penalty === 'number') out.presence_penalty = Math.min(2, Math.max(-2, input.presence_penalty));
  if (typeof input.max_tokens === 'number') out.max_tokens = Math.min(2000, Math.max(1, Math.floor(input.max_tokens)));

  return out;
}

function validateMessages(value: unknown): SafeMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) return null;

  let totalChars = 0;
  const messages: SafeMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const role = (item as Record<string, unknown>).role;
    const content = (item as Record<string, unknown>).content;
    if (typeof role !== 'string' || !ALLOWED_ROLES.has(role) || typeof content !== 'string') return null;
    if (content.length === 0 || content.length > 4000) return null;
    totalChars += content.length;
    if (totalChars > 24_000) return null;
    messages.push({ role: role as SafeMessage['role'], content });
  }
  return messages;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await requireAdmin(supabase);
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const limit = await checkRateLimit(`ai-chat:${getRequestIdentity(request, user.id)}`, {
      limit: 20,
      windowMs: 60_000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many AI requests. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))) } }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const provider = typeof body.provider === 'string' ? body.provider : '';
    const model = typeof body.model === 'string' ? body.model.trim() : '';
    const stream = body.stream === true;
    const messages = validateMessages(body.messages);

    if (!ALLOWED_PROVIDERS.has(provider) || !model || model.length > 120 || !messages) {
      return NextResponse.json({ error: 'Invalid provider, model, or messages' }, { status: 400 });
    }

    const apiKey = API_KEYS[provider];
    if (!apiKey) {
      return NextResponse.json({ error: 'Requested AI provider is not configured' }, { status: 503 });
    }

    const parameters = safeParameters(body.parameters);

    if (stream) {
      const response = await completion({
        ...parameters,
        model,
        messages,
        stream: true,
        api_key: apiKey,
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`));
            for await (const chunk of response as unknown as AsyncIterable<unknown>) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', chunk })}\n\n`));
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          } catch (error) {
            console.error('[ai/chat-completion] streaming error:', error);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'AI provider request failed' })}\n\n`));
          } finally {
            controller.close();
          }
        },
      });

      return new NextResponse(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-store',
          Connection: 'keep-alive',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    const response = await completion({
      ...parameters,
      model,
      messages,
      stream: false,
      api_key: apiKey,
    });

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[ai/chat-completion] error:', error);
    return NextResponse.json({ error: 'AI provider request failed' }, { status: 502 });
  }
}

