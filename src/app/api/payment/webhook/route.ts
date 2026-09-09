/**
 * Provider-agnostic payment webhook handler.
 *
 * SECURITY CONTRACT:
 * - Provider signature is verified before any state mutation.
 * - Provider order reference, payment reference, amount and currency are checked
 *   against the server-created order before fulfillment.
 * - All payment/entitlement mutations use the server-only Supabase service role.
 * - Completed-payment retries reconcile missing entitlements idempotently.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/payment/registry';
import type {
  PaymentProvider,
  PaymentMetadata,
  WebhookVerificationResult,
} from '@/lib/payment/types';
import {
  sendDownloadLink,
  sendPaymentFailed,
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

const ALLOWED_PROVIDERS = new Set<PaymentProvider>(['payoneer', 'crypto', 'manual']);
const PENDING_ORDER_STATES = new Set(['pending', 'pending_payment']);

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providerParam = searchParams.get('provider') ?? 'manual';
  if (!ALLOWED_PROVIDERS.has(providerParam as PaymentProvider)) {
    return NextResponse.json({ error: 'Unknown payment provider.' }, { status: 400 });
  }
  const providerName = providerParam as PaymentProvider;

  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) {
    return NextResponse.json({ error: 'Webhook payload too large.' }, { status: 413 });
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let provider;
  try {
    provider = getProvider(providerName);
  } catch {
    return NextResponse.json({ error: 'Unknown payment provider.' }, { status: 400 });
  }

  const verification = await provider.verifyWebhook({
    provider: providerName,
    rawBody,
    signature:
      headers['x-optile-signature'] ??
      headers['x-payoneer-signature'] ??
      headers['x-webhook-signature'] ??
      headers['x-nowpayments-sig'],
    headers,
  });

  if (!verification.verified) {
    console.warn(`[payment/webhook] Verification failed provider=${providerName}:`, verification.error);
    return NextResponse.json({ error: 'Webhook verification failed.' }, { status: 400 });
  }

  const orderId = verification.orderId?.trim();
  const providerPaymentRef = verification.providerPaymentRef?.trim() ?? '';
  const paymentStatus = verification.paymentStatus ?? 'pending';
  const metadata = verification.metadata;

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId in verified webhook.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: orderData, error: orderFetchError } = await supabase
    .from('orders')
    .select('id, user_id, product_id, plan_id, status, amount, currency, provider_payment_ref, metadata')
    .eq('id', orderId)
    .single();

  if (orderFetchError || !orderData) {
    console.error(`[payment/webhook] Order not found: ${orderId}`);
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }
  const order = orderData as OrderRecord;

  const validationError = validateVerifiedPayment(order, verification, providerName);
  if (validationError) {
    console.error(`[payment/webhook] Validation failed order=${orderId}: ${validationError}`);
    return NextResponse.json({ error: validationError }, { status: 409 });
  }

  // Signed in-progress provider events are acknowledged without changing order
  // state or granting any entitlement.
  if (paymentStatus === 'pending') {
    await insertPaymentEvent(supabase, {
      orderId,
      provider: providerName,
      eventType: 'pending',
      providerPaymentRef,
      metadata: metadataToRecord(metadata, providerName),
    });
    return NextResponse.json({ message: 'Payment is still pending.' }, { status: 200 });
  }

  if (paymentStatus === 'refunded') {
    return handleRefund(supabase, {
      order,
      providerName,
      providerPaymentRef,
      metadata,
    });
  }

  if (order.status === 'refunded') {
    return NextResponse.json({ message: 'Order is already refunded.' }, { status: 200 });
  }

  if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
    // A late failure/cancel event must never roll a completed order backwards.
    if (order.status === 'completed') {
      return NextResponse.json({ message: 'Completed order left unchanged.' }, { status: 200 });
    }
    return handleFailure(supabase, {
      order,
      providerName,
      providerPaymentRef,
      paymentStatus,
      metadata,
    });
  }

  if (paymentStatus !== 'completed') {
    return NextResponse.json({ error: 'Unsupported payment status.' }, { status: 400 });
  }

  return handleCompletion(supabase, {
    order,
    providerName,
    providerPaymentRef,
    metadata,
  });
}

function validateVerifiedPayment(
  order: OrderRecord,
  verification: WebhookVerificationResult,
  providerName: PaymentProvider
): string | null {
  const orderMeta = (order.metadata ?? {}) as Record<string, unknown>;
  const expectedProvider = typeof orderMeta.provider === 'string' ? orderMeta.provider : null;
  if (expectedProvider && expectedProvider !== providerName) {
    return 'Payment provider does not match order.';
  }

  const providerPaymentRef = verification.providerPaymentRef?.trim() ?? '';
  if (order.provider_payment_ref && providerPaymentRef && order.provider_payment_ref !== providerPaymentRef) {
    return 'Payment reference does not match order.';
  }

  const terminalProviderState = verification.paymentStatus === 'completed' || verification.paymentStatus === 'refunded';
  if (providerName !== 'manual' && terminalProviderState) {
    if (!providerPaymentRef) return 'Verified payment reference is missing.';
    if (verification.amount === undefined || !verification.currency) {
      return 'Verified payment amount or currency is missing.';
    }

    const expectedAmount = Number(order.amount);
    const receivedAmount = Number(verification.amount);
    if (!Number.isFinite(expectedAmount) || !Number.isFinite(receivedAmount)) {
      return 'Invalid verified payment amount.';
    }
    if (Math.abs(expectedAmount - receivedAmount) > 0.005) {
      return 'Verified payment amount does not match order.';
    }

    if (String(order.currency).toUpperCase() !== verification.currency.toUpperCase()) {
      return 'Verified payment currency does not match order.';
    }
  }

  return null;
}

function metadataToRecord(
  metadata: PaymentMetadata | undefined,
  providerName: PaymentProvider
): Record<string, unknown> {
  return metadata
    ? { ...metadata }
    : { provider: providerName, payment_method_type: providerName };
}

async function handleFailure(
  supabase: ServiceClient,
  params: {
    order: OrderRecord;
    providerName: PaymentProvider;
    providerPaymentRef: string;
    paymentStatus: 'failed' | 'cancelled';
    metadata?: PaymentMetadata;
  }
) {
  const { order, providerName, providerPaymentRef, paymentStatus, metadata } = params;
  const now = new Date().toISOString();

  if (PENDING_ORDER_STATES.has(order.status)) {
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: paymentStatus, updated_at: now })
      .eq('id', order.id)
      .eq('status', order.status);

    if (updateError) {
      console.error('[payment/webhook] Failed to update failed/cancelled order:', updateError.message);
      return NextResponse.json({ error: 'Failed to update order.' }, { status: 500 });
    }
  }

  await insertPaymentEvent(supabase, {
    orderId: order.id,
    provider: providerName,
    eventType: paymentStatus,
    providerPaymentRef,
    metadata: metadataToRecord(metadata, providerName),
  });

  if (paymentStatus === 'failed') {
    const { data: activeSub } = await supabase
      .from('subscriptions')
      .select('id, user_id, products(name), product_plans(name, price, currency)')
      .eq('order_id', order.id)
      .eq('status', 'active')
      .maybeSingle();

    if (activeSub) {
      const pastDueAt = new Date().toISOString();
      await supabase
        .from('subscriptions')
        .update({ status: 'past_due', past_due_at: pastDueAt, updated_at: pastDueAt })
        .eq('id', activeSub.id)
        .eq('status', 'active');

      const { error: auditError } = await supabase.from('subscription_audit_logs').insert({
        subscription_id: activeSub.id,
        admin_id: null,
        action: 'status_change',
        previous_status: 'active',
        new_status: 'past_due',
        note: 'Payment failed — subscription marked past_due',
        metadata: { provider: providerName, order_id: order.id },
      });
      if (auditError) console.warn('[payment/webhook] Audit log failed:', auditError.message);

      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(activeSub.user_id);
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', activeSub.user_id)
          .maybeSingle();
        const product = Array.isArray(activeSub.products) ? activeSub.products[0] : activeSub.products;
        const plan = Array.isArray(activeSub.product_plans) ? activeSub.product_plans[0] : activeSub.product_plans;
        const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://summeca.com').replace(/\/$/, '');

        if (authUser?.user?.email) {
          await sendPaymentFailed(authUser.user.email, {
            customerName: profile?.full_name ?? '',
            productName: (product as any)?.name ?? 'Your Subscription',
            planName: (plan as any)?.name ?? 'Plan',
            amount: (plan as any)?.price ?? 0,
            currency: (plan as any)?.currency ?? 'USD',
            failedAt: pastDueAt,
            retryUrl: `${siteUrl}/user-dashboard/subscriptions`,
          });
        }
      } catch (emailErr) {
        console.warn('[payment/webhook] Payment failed email error:', emailErr);
      }
    }
  }

  return NextResponse.json({ message: `Order marked as ${paymentStatus}.` });
}

async function handleRefund(
  supabase: ServiceClient,
  params: {
    order: OrderRecord;
    providerName: PaymentProvider;
    providerPaymentRef: string;
    metadata?: PaymentMetadata;
  }
) {
  const { order, providerName, providerPaymentRef, metadata } = params;
  if (order.status !== 'completed' && order.status !== 'refunded') {
    return NextResponse.json(
      { error: `Cannot refund an order with status: ${order.status}` },
      { status: 409 }
    );
  }

  const { data, error } = await supabase.rpc('finalize_verified_refund', {
    p_order_id: order.id,
    p_provider: providerName,
    p_provider_ref: providerPaymentRef,
    p_metadata: metadataToRecord(metadata, providerName),
  });

  if (error || !data) {
    console.error('[payment/webhook] Atomic refund reconciliation failed order=' + order.id + ':', error?.message);
    return NextResponse.json(
      { error: 'Verified refund could not be reconciled. Provider retry is required.' },
      { status: 500 }
    );
  }

  const result = data as Record<string, unknown>;
  if (result.ok !== true) {
    return NextResponse.json(
      { error: String(result.error ?? 'Verified refund could not be reconciled.') },
      { status: 409 }
    );
  }

  return NextResponse.json({
    message: result.already_refunded === true
      ? 'Refund records reconciled.'
      : 'Order marked as refunded.',
  });
}

async function handleCompletion(
  supabase: ServiceClient,
  params: {
    order: OrderRecord;
    providerName: PaymentProvider;
    providerPaymentRef: string;
    metadata?: PaymentMetadata;
  }
) {
  const { order, providerName, providerPaymentRef, metadata } = params;

  // Fetch the plan before changing the order so a missing/corrupt plan never
  // produces a paid order that cannot be fulfilled.
  const { data: planData, error: planError } = await supabase
    .from('product_plans')
    .select('billing_period, name, price, currency')
    .eq('id', order.plan_id)
    .single();

  if (planError || !planData) {
    console.error(`[payment/webhook] Missing plan for order ${order.id}`);
    return NextResponse.json({ error: 'Order plan could not be validated.' }, { status: 500 });
  }
  const plan = planData as PlanRecord;

  let firstCompletion = false;
  if (PENDING_ORDER_STATES.has(order.status)) {
    const nonSensitiveMeta = {
      ...(order.metadata ?? {}),
      provider: metadata?.provider ?? providerName,
      payment_method_type: metadata?.payment_method_type ?? providerName,
      ...(metadata?.card_brand ? { card_brand: metadata.card_brand } : {}),
      ...(metadata?.card_last4 ? { card_last4: metadata.card_last4 } : {}),
      provider_payment_ref: providerPaymentRef,
    };

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        provider_payment_ref: providerPaymentRef,
        metadata: nonSensitiveMeta,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('status', order.status)
      .select('id')
      .maybeSingle();

    if (updateError || !updatedOrder) {
      console.error(`[payment/webhook] Failed to complete order ${order.id}:`, updateError?.message);
      return NextResponse.json({ error: 'Failed to complete order.' }, { status: 409 });
    }
    firstCompletion = true;
  } else if (order.status !== 'completed') {
    return NextResponse.json(
      { error: `Order is not awaiting payment (status: ${order.status}).` },
      { status: 409 }
    );
  }

  const entitlementResult = await ensureEntitlements(supabase, order, plan, providerName, providerPaymentRef);
  if (!entitlementResult.ok) {
    // The order may already be completed; returning 500 makes the provider retry.
    // A retry enters this function again and reconciles the missing entitlement.
    return NextResponse.json({ error: 'Payment verified but fulfillment is pending retry.' }, { status: 500 });
  }

  const eventResult = await insertPaymentEvent(supabase, {
    orderId: order.id,
    provider: providerName,
    eventType: 'completed',
    providerPaymentRef,
    metadata: {
      ...(order.metadata ?? {}),
      provider: metadata?.provider ?? providerName,
      payment_method_type: metadata?.payment_method_type ?? providerName,
      ...(metadata?.card_brand ? { card_brand: metadata.card_brand } : {}),
      ...(metadata?.card_last4 ? { card_last4: metadata.card_last4 } : {}),
      provider_payment_ref: providerPaymentRef,
    },
  });

  if (eventResult === 'error') {
    return NextResponse.json({ error: 'Payment fulfilled but audit event failed.' }, { status: 500 });
  }

  // Only the first successfully audited completion sends transactional emails.
  if (eventResult === 'inserted') {
    await sendCompletionEmails(supabase, order, plan, providerName, providerPaymentRef, entitlementResult.periodEnd);
  }

  console.info(`[payment/webhook] Order ${order.id} completed via ${providerName}; first=${firstCompletion}.`);
  return NextResponse.json({ message: 'Payment verified. Order completed.' });
}

async function ensureEntitlements(
  supabase: ServiceClient,
  order: OrderRecord,
  plan: PlanRecord,
  providerName: PaymentProvider,
  providerPaymentRef: string
): Promise<{ ok: boolean; periodEnd: string | null }> {
  const now = new Date();
  const billingPeriod = plan.billing_period;
  let periodEnd: string | null = null;

  if (billingPeriod === 'monthly') {
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    periodEnd = end.toISOString();
  } else if (billingPeriod === 'yearly') {
    const end = new Date(now);
    end.setFullYear(end.getFullYear() + 1);
    periodEnd = end.toISOString();
  }

  if (billingPeriod === 'monthly' || billingPeriod === 'yearly' || billingPeriod === 'lifetime') {
    const { data: existingSub, error: subLookupError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle();

    if (subLookupError) {
      console.error('[payment/webhook] Subscription lookup failed:', subLookupError.message);
      return { ok: false, periodEnd };
    }

    if (!existingSub) {
      const { error: subError } = await supabase.from('subscriptions').insert({
        user_id: order.user_id,
        product_id: order.product_id,
        plan_id: order.plan_id,
        order_id: order.id,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd,
        payment_provider: providerName,
        metadata: { provider: providerName, provider_payment_ref: providerPaymentRef },
      });
      if (subError && subError.code !== '23505') {
        console.error('[payment/webhook] Subscription creation failed:', subError.message);
        return { ok: false, periodEnd };
      }
    }
  }

  if (billingPeriod === 'one_time' || billingPeriod === 'lifetime') {
    const { data: existingDownload, error: downloadLookupError } = await supabase
      .from('downloads')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle();

    if (downloadLookupError) {
      console.error('[payment/webhook] Download lookup failed:', downloadLookupError.message);
      return { ok: false, periodEnd };
    }

    if (!existingDownload) {
      const { error: downloadError } = await supabase.from('downloads').insert({
        user_id: order.user_id,
        product_id: order.product_id,
        order_id: order.id,
        file_name: '',
        file_url: '',
        status: 'available',
        download_count: 0,
      });
      if (downloadError && downloadError.code !== '23505') {
        console.error('[payment/webhook] Download entitlement failed:', downloadError.message);
        return { ok: false, periodEnd };
      }
    }
  }

  return { ok: true, periodEnd };
}

async function sendCompletionEmails(
  supabase: ServiceClient,
  order: OrderRecord,
  plan: PlanRecord,
  providerName: PaymentProvider,
  providerPaymentRef: string,
  periodEnd: string | null
) {
  try {
    const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
    const userEmail = authUser?.user?.email ?? '';
    if (!userEmail) return;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', order.user_id)
      .maybeSingle();
    const { data: product } = await supabase
      .from('products')
      .select('name')
      .eq('id', order.product_id)
      .maybeSingle();

    const productName = product?.name ?? 'Your Product';
    const now = new Date();

    await sendPaymentReceipt(userEmail, {
      customerName: profile?.full_name ?? '',
      orderId: order.id,
      productName,
      planName: plan.name,
      amount: Math.round(Number(order.amount) * 100),
      currency: order.currency,
      provider: providerName,
      providerRef: providerPaymentRef,
      paidAt: now.toISOString(),
    });

    if (plan.billing_period === 'monthly' || plan.billing_period === 'yearly' || plan.billing_period === 'lifetime') {
      await sendSubscriptionActivated(userEmail, {
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
      await sendDownloadLink(userEmail, {
        customerName: profile?.full_name ?? '',
        productName,
        downloadUrl: `${siteUrl}/user-dashboard/downloads`,
        orderId: order.id,
      });
    }
  } catch (emailErr) {
    console.warn('[payment/webhook] Transactional email failed (non-fatal):', emailErr);
  }
}

async function insertPaymentEvent(
  supabase: ServiceClient,
  params: {
    orderId: string;
    provider: string;
    eventType: string;
    providerPaymentRef: string;
    metadata: Record<string, unknown>;
  }
): Promise<'inserted' | 'duplicate' | 'error'> {
  // Avoid writing unbounded duplicate pending events when the provider sends
  // the same reference/status repeatedly.
  if (params.providerPaymentRef) {
    const { data: existing } = await supabase
      .from('payment_events')
      .select('id')
      .eq('order_id', params.orderId)
      .eq('provider', params.provider)
      .eq('event_type', params.eventType)
      .eq('provider_payment_ref', params.providerPaymentRef)
      .maybeSingle();
    if (existing) return 'duplicate';
  }

  const { error } = await supabase.from('payment_events').insert({
    order_id: params.orderId,
    provider: params.provider,
    event_type: params.eventType,
    provider_payment_ref: params.providerPaymentRef,
    metadata: params.metadata,
  });

  if (!error) return 'inserted';
  if (error.code === '23505') return 'duplicate';

  console.warn('[payment/webhook] Failed to insert payment event:', error.message);
  return 'error';
}
