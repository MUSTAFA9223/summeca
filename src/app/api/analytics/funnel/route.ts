import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';

const EVENT_TYPES = new Set([
  'product_view',
  'buy_click',
  'trial_started',
  'checkout_started',
  'payment_method_selected',
  'payment_failed',
  'payment_completed',
]);

const METADATA_KEYS = new Set([
  'productId',
  'productSlug',
  'planId',
  'planName',
  'method',
  'cryptoMethod',
  'orderId',
  'amount',
  'currency',
  'reason',
  'source',
]);

function text(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function safeMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const output: Record<string, string | number | boolean> = {};

  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!METADATA_KEYS.has(key)) continue;
    if (typeof raw === 'string') output[key] = raw.trim().slice(0, 200);
    else if (typeof raw === 'number' && Number.isFinite(raw)) output[key] = raw;
    else if (typeof raw === 'boolean') output[key] = raw;
  }

  return output;
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 8_000) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });

  const burst = await checkRateLimit(`analytics-funnel:${getRequestIdentity(request)}`, {
    limit: 120,
    windowMs: 60_000,
  });
  if (!burst.allowed) {
    return NextResponse.json({ error: 'Too many analytics events.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const eventType = text(body.eventType, 40);
  if (!EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: 'Unsupported event type.' }, { status: 400 });
  }

  const rawSessionKey = text(body.sessionKey, 120);
  const sessionKey = /^[a-zA-Z0-9:_-]{8,120}$/.test(rawSessionKey) ? rawSessionKey : null;
  const path = text(body.path, 500) || null;

  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();

  const service = createServiceClient();
  const { error } = await service.from('analytics_events').insert({
    session_key: sessionKey,
    user_id: user?.id ?? null,
    event_type: eventType,
    path,
    metadata: safeMetadata(body.metadata),
  });

  if (error) {
    console.error('[analytics-funnel] insert failed:', error.message);
    return NextResponse.json({ error: 'Unable to record event.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
