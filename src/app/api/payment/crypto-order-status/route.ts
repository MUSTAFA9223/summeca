import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function GET(request: NextRequest) {
  const orderId = new URL(request.url).searchParams.get('order_id')?.trim();
  if (!orderId) return noStoreJson({ error: 'order_id is required.' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return noStoreJson({ error: 'Authentication required.' }, { status: 401 });
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, user_id, status, amount, currency, provider_payment_ref, metadata, created_at, updated_at')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .single();

  if (error || !order) return noStoreJson({ error: 'Order not found.' }, { status: 404 });

  const metadata = record(order.metadata);
  if (metadata.provider !== 'crypto') {
    return noStoreJson({ error: 'This is not a cryptocurrency order.' }, { status: 409 });
  }

  const { data: latestEvent } = await supabase
    .from('payment_events')
    .select('event_type, metadata, created_at')
    .eq('order_id', orderId)
    .eq('provider', 'crypto')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const eventMetadata = record(latestEvent?.metadata);
  const providerStatus = typeof eventMetadata.provider_status === 'string'
    ? eventMetadata.provider_status
    : order.status === 'completed'
      ? 'finished'
      : typeof metadata.provider_status === 'string'
        ? metadata.provider_status
        : null;

  return noStoreJson({
    orderId: order.id,
    status: order.status,
    amount: Number(order.amount),
    currency: order.currency,
    paymentAddress: typeof metadata.crypto_payment_address === 'string' ? metadata.crypto_payment_address : null,
    cryptoAmount: typeof metadata.crypto_amount === 'string' ? metadata.crypto_amount : null,
    cryptoCurrency: typeof metadata.crypto_currency === 'string' ? metadata.crypto_currency : null,
    cryptoNetwork: typeof metadata.crypto_network === 'string' ? metadata.crypto_network : null,
    providerStatus,
    providerEvent: latestEvent?.event_type ?? null,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  });
}
