import { createServiceClient } from '@/lib/supabase/server';

type ServiceClient = ReturnType<typeof createServiceClient>;
type JsonRecord = Record<string, unknown>;

export type CheckoutProvider = 'payoneer' | 'fastspring' | 'crypto';

export type CheckoutAttempt =
  | { state: 'claimed'; order: JsonRecord }
  | { state: 'ready'; order: JsonRecord; data: JsonRecord }
  | { state: 'processing'; order: JsonRecord }
  | { state: 'failed'; order: JsonRecord; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readCheckoutIdempotencyKey(request: Request): string | null {
  const value = request.headers.get('idempotency-key')?.trim() ?? '';
  return UUID_PATTERN.test(value) ? value.toLowerCase() : null;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function stateFromOrder(order: JsonRecord): CheckoutAttempt {
  const status = String(order.checkout_session_status ?? '');
  const orderStatus = String(order.status ?? '');
  const data = asRecord(order.checkout_session_data);

  if (orderStatus !== 'pending_payment') {
    return {
      state: 'failed',
      order,
      error: orderStatus === 'completed'
        ? 'This order is already paid.'
        : 'This checkout attempt is no longer payable. Start a new attempt if needed.',
    };
  }
  if (status === 'ready') return { state: 'ready', order, data };
  if (status === 'processing') return { state: 'processing', order };
  if (status === 'failed') {
    return {
      state: 'failed',
      order,
      error: String(data.error ?? 'The previous checkout attempt failed. Start a new attempt.'),
    };
  }
  return { state: 'claimed', order };
}

export async function beginCheckoutAttempt(
  supabase: ServiceClient,
  input: {
    userId: string;
    planId: string;
    couponId: string | null;
    expectedAmount: number;
    provider: CheckoutProvider;
    idempotencyKey: string;
  }
): Promise<{ attempt?: CheckoutAttempt; error?: string }> {
  const { data, error } = await supabase.rpc('create_or_reuse_priced_order', {
    p_user: input.userId,
    p_plan: input.planId,
    p_coupon: input.couponId,
    p_expected: input.expectedAmount,
    p_provider: input.provider,
    p_idempotency_key: input.idempotencyKey,
  });

  if (error || !data) return { error: error?.message ?? 'Failed to create checkout attempt.' };
  const order = asRecord(data);
  const known = stateFromOrder(order);
  if (known.state !== 'claimed') return { attempt: known };

  const { data: claimed, error: claimError } = await supabase
    .from('orders')
    .update({
      checkout_session_status: 'processing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', String(order.id ?? ''))
    .eq('checkout_session_status', 'created')
    .select('*')
    .maybeSingle();

  if (claimError) return { error: claimError.message };
  if (claimed) return { attempt: { state: 'claimed', order: claimed as JsonRecord } };

  const { data: current, error: currentError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', String(order.id ?? ''))
    .single();
  if (currentError || !current) return { error: currentError?.message ?? 'Checkout attempt disappeared.' };
  return { attempt: stateFromOrder(current as JsonRecord) };
}

export async function finishCheckoutAttempt(
  supabase: ServiceClient,
  input: {
    orderId: string;
    success: boolean;
    sessionData: JsonRecord;
    providerPaymentRef?: string;
    metadata: JsonRecord;
  }
): Promise<boolean> {
  const now = new Date().toISOString();
  const payload: JsonRecord = {
    checkout_session_status: input.success ? 'ready' : 'failed',
    checkout_session_data: input.sessionData,
    metadata: input.metadata,
    updated_at: now,
  };
  if (!input.success) payload.status = 'failed';
  if (input.providerPaymentRef) payload.provider_payment_ref = input.providerPaymentRef;

  const { data, error } = await supabase
    .from('orders')
    .update(payload)
    .eq('id', input.orderId)
    .eq('checkout_session_status', 'processing')
    .select('id')
    .maybeSingle();

  return !error && Boolean(data);
}

export function safeCheckoutError(error: unknown, fallback: string): string {
  const value = typeof error === 'string' ? error.trim() : '';
  return (value || fallback).slice(0, 500);
}
