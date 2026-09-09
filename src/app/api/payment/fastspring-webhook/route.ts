/**
 * FastSpring webhook endpoint.
 *
 * SECURITY:
 * - The provider validates X-FS-Signature (HMAC SHA-256) over the raw body.
 * - Every event is bound to a server-created SUMMECA order through signed tags.
 * - Amount/currency/provider/environment are verified before fulfillment.
 * - Test FastSpring orders are acknowledged but NEVER grant production access.
 * - FastSpring may batch multiple events in one POST; all supported events are
 *   processed idempotently before the request is acknowledged.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/payment/registry';
import type { PaymentMetadata, WebhookVerificationResult } from '@/lib/payment/types';
import {
  sendDownloadLink,
  sendPaymentReceipt,
  sendSubscriptionActivated,
} from '@/lib/email/sendEmail';

type ServiceClient = ReturnType<typeof createServiceClient>;

type OrderRecord = {
  id: string;
  user_id: string;
  product_id: string;
  plan_id: string;
  status: string;
  amount: number | string;
  currency: string;
  provider_payment_ref: string | null;
  metadata: Record<string, unknown> | null;
};

type PlanRecord = {
  billing_period: string;
  name: string;
  price: number;
  currency: string;
};

const PENDING_ORDER_STATES = new Set(['pending', 'pending_payment']);

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) {
    return NextResponse.json({ error: 'Webhook payload too large.' }, { status: 413 });
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => { headers[key] = value; });

  const provider = getProvider('fastspring');
  const input = {
    provider: 'fastspring' as const,
    rawBody,
    signature: headers['x-fs-signature'],
    headers,
  };

  const verifications = provider.verifyWebhookBatch
    ? await provider.verifyWebhookBatch(input)
    : [await provider.verifyWebhook(input)];

  if (verifications.some((verification) => !verification.verified)) {
    const firstError = verifications.find((verification) => !verification.verified)?.error;
    console.warn('[fastspring-webhook] Verification failed:', firstError);
    return NextResponse.json({ error: 'Webhook verification failed.' }, { status: 400 });
  }

  // A correctly signed envelope may contain only event types we intentionally
  // do not subscribe to/process yet. Acknowledge it without side effects.
  if (verifications.length === 0) {
    return NextResponse.json({ message: 'No supported FastSpring events in payload.' });
  }

  const supabase = createServiceClient();
  for (const verification of verifications) {
    const result = await processCompletedOrder(supabase, verification);
    if (!result.ok) {
      // Non-2xx makes FastSpring retry. Events already processed in the same
      // batch are idempotent, so retrying the full envelope is safe.
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
  }

  return NextResponse.json({ message: 'FastSpring webhook processed.' });
}

async function processCompletedOrder(
  supabase: ServiceClient,
  verification: WebhookVerificationResult,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const orderId = verification.orderId?.trim();
  const providerPaymentRef = verification.providerPaymentRef?.trim() ?? '';
  if (!orderId || !providerPaymentRef) {
    return { ok: false, status: 400, error: 'Verified FastSpring event is missing order references.' };
  }

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select('id, user_id, product_id, plan_id, status, amount, currency, provider_payment_ref, metadata')
    .eq('id', orderId)
    .single();
  if (orderError || !orderData) {
    return { ok: false, status: 404, error: 'Order not found.' };
  }
  const order = orderData as OrderRecord;
  const metadata = verification.metadata;
  const orderMeta = (order.metadata ?? {}) as Record<string, unknown>;

  if (orderMeta.provider !== 'fastspring') {
    return { ok: false, status: 409, error: 'Payment provider does not match order.' };
  }
  if (order.provider_payment_ref && order.provider_payment_ref !== providerPaymentRef) {
    return { ok: false, status: 409, error: 'Payment reference does not match order.' };
  }
  if (verification.amount === undefined || !verification.currency) {
    return { ok: false, status: 409, error: 'Verified FastSpring amount or currency is missing.' };
  }

  const expectedAmount = Number(order.amount);
  const receivedAmount = Number(verification.amount);
  if (!Number.isFinite(expectedAmount) || !Number.isFinite(receivedAmount) || Math.abs(expectedAmount - receivedAmount) > 0.005) {
    return { ok: false, status: 409, error: 'Verified FastSpring subtotal does not match order.' };
  }
  if (String(order.currency).toUpperCase() !== verification.currency.toUpperCase()) {
    return { ok: false, status: 409, error: 'Verified FastSpring currency does not match order.' };
  }

  const eventLive = metadata?.provider_live === true;
  const orderLive = orderMeta.fastspring_live === true;
  if (eventLive !== orderLive) {
    return { ok: false, status: 409, error: 'FastSpring live/test environment does not match order.' };
  }

  // Test checkouts are useful for validating integration, but they must never
  // create downloads/subscriptions or mark a production order paid.
  if (!eventLive) {
    await insertPaymentEvent(supabase, {
      orderId: order.id,
      eventType: 'test_completed',
      providerPaymentRef,
      metadata: metadataToRecord(metadata, providerPaymentRef),
    });
    return { ok: true };
  }

  if (verification.paymentStatus !== 'completed') {
    return { ok: true };
  }

  const { data: planData, error: planError } = await supabase
    .from('product_plans')
    .select('billing_period, name, price, currency')
    .eq('id', order.plan_id)
    .single();
  if (planError || !planData) {
    return { ok: false, status: 500, error: 'Order plan could not be validated.' };
  }
  const plan = planData as PlanRecord;

  if (PENDING_ORDER_STATES.has(order.status)) {
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        provider_payment_ref: providerPaymentRef,
        metadata: {
          ...orderMeta,
          ...metadataToRecord(metadata, providerPaymentRef),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('status', order.status)
      .select('id')
      .maybeSingle();
    if (updateError || !updated) {
      return { ok: false, status: 409, error: 'Failed to complete order.' };
    }
  } else if (order.status !== 'completed') {
    return { ok: false, status: 409, error: `Order is not awaiting payment (status: ${order.status}).` };
  }

  const entitlement = await ensureEntitlements(supabase, order, plan, providerPaymentRef);
  if (!entitlement.ok) {
    return { ok: false, status: 500, error: 'Payment verified but fulfillment is pending retry.' };
  }

  const eventResult = await insertPaymentEvent(supabase, {
    orderId: order.id,
    eventType: 'completed',
    providerPaymentRef,
    metadata: metadataToRecord(metadata, providerPaymentRef),
  });
  if (eventResult === 'error') {
    return { ok: false, status: 500, error: 'Payment fulfilled but audit event failed.' };
  }

  if (eventResult === 'inserted') {
    await sendCompletionEmails(supabase, order, plan, providerPaymentRef, entitlement.periodEnd);
  }
  return { ok: true };
}

function metadataToRecord(metadata: PaymentMetadata | undefined, providerPaymentRef: string) {
  return {
    provider: 'fastspring',
    payment_method_type: metadata?.payment_method_type ?? 'card',
    provider_payment_ref: providerPaymentRef,
    provider_live: metadata?.provider_live === true,
    ...(metadata?.card_brand ? { card_brand: metadata.card_brand } : {}),
    ...(metadata?.card_last4 ? { card_last4: metadata.card_last4 } : {}),
  };
}

async function ensureEntitlements(
  supabase: ServiceClient,
  order: OrderRecord,
  plan: PlanRecord,
  providerPaymentRef: string,
): Promise<{ ok: boolean; periodEnd: string | null }> {
  const now = new Date();
  let periodEnd: string | null = null;
  if (plan.billing_period === 'monthly') {
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    periodEnd = end.toISOString();
  } else if (plan.billing_period === 'yearly') {
    const end = new Date(now);
    end.setFullYear(end.getFullYear() + 1);
    periodEnd = end.toISOString();
  }

  if (['monthly', 'yearly', 'lifetime'].includes(plan.billing_period)) {
    const { data: existingSub, error: lookupError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle();
    if (lookupError) return { ok: false, periodEnd };

    if (!existingSub) {
      const { error } = await supabase.from('subscriptions').insert({
        user_id: order.user_id,
        product_id: order.product_id,
        plan_id: order.plan_id,
        order_id: order.id,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd,
        payment_provider: 'fastspring',
        metadata: { provider: 'fastspring', provider_payment_ref: providerPaymentRef },
      });
      if (error && error.code !== '23505') {
        console.error('[fastspring-webhook] Subscription creation failed:', error.message);
        return { ok: false, periodEnd };
      }
    }
  }

  if (plan.billing_period === 'one_time' || plan.billing_period === 'lifetime') {
    const { data: existingDownload, error: lookupError } = await supabase
      .from('downloads')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle();
    if (lookupError) return { ok: false, periodEnd };

    if (!existingDownload) {
      const { error } = await supabase.from('downloads').insert({
        user_id: order.user_id,
        product_id: order.product_id,
        order_id: order.id,
        file_name: '',
        file_url: '',
        status: 'available',
        download_count: 0,
      });
      if (error && error.code !== '23505') {
        console.error('[fastspring-webhook] Download entitlement failed:', error.message);
        return { ok: false, periodEnd };
      }
    }
  }

  return { ok: true, periodEnd };
}

async function insertPaymentEvent(
  supabase: ServiceClient,
  params: {
    orderId: string;
    eventType: string;
    providerPaymentRef: string;
    metadata: Record<string, unknown>;
  },
): Promise<'inserted' | 'duplicate' | 'error'> {
  const { data: existing } = await supabase
    .from('payment_events')
    .select('id')
    .eq('order_id', params.orderId)
    .eq('provider', 'fastspring')
    .eq('event_type', params.eventType)
    .eq('provider_payment_ref', params.providerPaymentRef)
    .maybeSingle();
  if (existing) return 'duplicate';

  const { error } = await supabase.from('payment_events').insert({
    order_id: params.orderId,
    provider: 'fastspring',
    event_type: params.eventType,
    provider_payment_ref: params.providerPaymentRef,
    metadata: params.metadata,
  });
  if (!error) return 'inserted';
  if (error.code === '23505') return 'duplicate';
  console.warn('[fastspring-webhook] Failed to insert payment event:', error.message);
  return 'error';
}

async function sendCompletionEmails(
  supabase: ServiceClient,
  order: OrderRecord,
  plan: PlanRecord,
  providerPaymentRef: string,
  periodEnd: string | null,
) {
  try {
    const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
    const email = authUser?.user?.email ?? '';
    if (!email) return;

    const [{ data: profile }, { data: product }] = await Promise.all([
      supabase.from('user_profiles').select('full_name').eq('id', order.user_id).maybeSingle(),
      supabase.from('products').select('name').eq('id', order.product_id).maybeSingle(),
    ]);
    const productName = product?.name ?? 'Your Product';
    const now = new Date();

    await sendPaymentReceipt(email, {
      customerName: profile?.full_name ?? '',
      orderId: order.id,
      productName,
      planName: plan.name,
      amount: Math.round(Number(order.amount) * 100),
      currency: order.currency,
      provider: 'fastspring',
      providerRef: providerPaymentRef,
      paidAt: now.toISOString(),
    });

    if (['monthly', 'yearly', 'lifetime'].includes(plan.billing_period)) {
      await sendSubscriptionActivated(email, {
        customerName: profile?.full_name ?? '',
        productName,
        planName: plan.name,
        billingPeriod: plan.billing_period,
        amount: plan.price,
        currency: plan.currency,
        renewalDate: periodEnd ?? now.toISOString(),
        subscriptionId: order.id,
      });
    }

    if (plan.billing_period === 'one_time' || plan.billing_period === 'lifetime') {
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://summeca.com').replace(/\/$/, '');
      await sendDownloadLink(email, {
        customerName: profile?.full_name ?? '',
        productName,
        downloadUrl: `${siteUrl}/user-dashboard/downloads`,
        orderId: order.id,
      });
    }
  } catch (error) {
    console.warn('[fastspring-webhook] Transactional email failed (non-fatal):', error);
  }
}
