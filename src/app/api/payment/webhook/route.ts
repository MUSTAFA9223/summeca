/**
 * Provider-agnostic payment webhook handler.
 *
 * SECURITY CONTRACT:
 * - Provider signature is verified before any database access that mutates state.
 * - All payment/entitlement mutations use the server-only Supabase service role.
 * - Frontend clients can never mark orders paid or grant subscriptions/downloads.
 * - Only non-sensitive payment metadata is persisted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/payment/registry';
import type { PaymentProvider, PaymentMetadata } from '@/lib/payment/types';
import {
  sendDownloadLink,
  sendPaymentFailed,
  sendPaymentReceipt,
  sendSubscriptionActivated,
} from '@/lib/email/sendEmail';

type ServiceClient = ReturnType<typeof createServiceClient>;

const ALLOWED_PROVIDERS = new Set<PaymentProvider>(['payoneer', 'crypto', 'manual']);

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
  const paymentStatus = verification.paymentStatus ?? 'completed';
  const metadata = verification.metadata;

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId in verified webhook.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: order, error: orderFetchError } = await supabase
    .from('orders')
    .select('id, user_id, product_id, plan_id, status, amount, currency, provider_payment_ref, metadata')
    .eq('id', orderId)
    .single();

  if (orderFetchError || !order) {
    console.error(`[payment/webhook] Order not found: ${orderId}`);
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  const orderMeta = (order.metadata ?? {}) as Record<string, unknown>;
  const expectedProvider = typeof orderMeta.provider === 'string' ? orderMeta.provider : null;
  if (expectedProvider && expectedProvider !== providerName) {
    console.error(`[payment/webhook] Provider mismatch order=${orderId}`);
    return NextResponse.json({ error: 'Payment provider does not match order.' }, { status: 409 });
  }

  if (
    order.provider_payment_ref &&
    providerPaymentRef &&
    order.provider_payment_ref !== providerPaymentRef
  ) {
    console.error(`[payment/webhook] Payment reference mismatch order=${orderId}`);
    return NextResponse.json({ error: 'Payment reference does not match order.' }, { status: 409 });
  }

  if (providerPaymentRef) {
    const { data: duplicate } = await supabase
      .from('payment_events')
      .select('id')
      .eq('order_id', orderId)
      .eq('provider', providerName)
      .eq('provider_payment_ref', providerPaymentRef)
      .eq('event_type', paymentStatus)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json({ message: 'Duplicate event already processed.' }, { status: 200 });
    }
  }

  if (order.status === 'refunded') {
    return NextResponse.json({ message: 'Order is already refunded.' }, { status: 200 });
  }

  if (paymentStatus === 'refunded') {
    return handleRefund(supabase, {
      orderId,
      providerName,
      providerPaymentRef,
      metadata,
      currentStatus: order.status,
    });
  }

  if (order.status === 'completed') {
    return NextResponse.json({ message: 'Order is already completed.' }, { status: 200 });
  }

  if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
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

async function handleFailure(
  supabase: ServiceClient,
  params: {
    order: any;
    providerName: PaymentProvider;
    providerPaymentRef: string;
    paymentStatus: 'failed' | 'cancelled';
    metadata?: PaymentMetadata;
  }
) {
  const { order, providerName, providerPaymentRef, paymentStatus, metadata } = params;
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: paymentStatus, updated_at: now })
    .eq('id', order.id);

  if (updateError) {
    console.error('[payment/webhook] Failed to update failed/cancelled order:', updateError.message);
    return NextResponse.json({ error: 'Failed to update order.' }, { status: 500 });
  }

  await insertPaymentEvent(supabase, {
    orderId: order.id,
    provider: providerName,
    eventType: paymentStatus,
    providerPaymentRef,
    metadata: metadata ?? { provider: providerName, payment_method_type: providerName },
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
        .eq('id', activeSub.id);

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
    orderId: string;
    providerName: PaymentProvider;
    providerPaymentRef: string;
    metadata?: PaymentMetadata;
    currentStatus: string;
  }
) {
  const { orderId, providerName, providerPaymentRef, metadata, currentStatus } = params;
  if (currentStatus !== 'completed') {
    return NextResponse.json(
      { error: `Cannot refund an order with status: ${currentStatus}` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'refunded', updated_at: now })
    .eq('id', orderId)
    .eq('status', 'completed');

  if (updateError) {
    return NextResponse.json({ error: 'Failed to mark order refunded.' }, { status: 500 });
  }

  await insertPaymentEvent(supabase, {
    orderId,
    provider: providerName,
    eventType: 'refunded',
    providerPaymentRef,
    metadata: metadata ?? { provider: providerName, payment_method_type: providerName },
  });

  const { data: matchingRefund } = await supabase
    .from('refunds')
    .select('id, status')
    .eq('order_id', orderId)
    .not('status', 'in', '("completed","rejected","failed")')
    .maybeSingle();

  if (matchingRefund) {
    await supabase
      .from('refunds')
      .update({
        status: 'completed',
        provider_refund_id: providerPaymentRef || null,
        completed_at: now,
        updated_at: now,
      })
      .eq('id', matchingRefund.id);
  }

  return NextResponse.json({ message: 'Order marked as refunded.' });
}

async function handleCompletion(
  supabase: ServiceClient,
  params: {
    order: any;
    providerName: PaymentProvider;
    providerPaymentRef: string;
    metadata?: PaymentMetadata;
  }
) {
  const { order, providerName, providerPaymentRef, metadata } = params;
  const allowedPendingStates = new Set(['pending', 'pending_payment']);
  if (!allowedPendingStates.has(order.status)) {
    return NextResponse.json(
      { error: `Order is not awaiting payment (status: ${order.status}).` },
      { status: 409 }
    );
  }

  const nonSensitiveMeta = {
    ...(order.metadata ?? {}),
    provider: metadata?.provider ?? providerName,
    payment_method_type: metadata?.payment_method_type ?? providerName,
    ...(metadata?.card_brand ? { card_brand: metadata.card_brand } : {}),
    ...(metadata?.card_last4 ? { card_last4: metadata.card_last4 } : {}),
    ...(providerPaymentRef ? { provider_payment_ref: providerPaymentRef } : {}),
  };

  const now = new Date();
  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'completed',
      provider_payment_ref: providerPaymentRef,
      metadata: nonSensitiveMeta,
      updated_at: now.toISOString(),
    })
    .eq('id', order.id)
    .eq('status', order.status)
    .select('id')
    .maybeSingle();

  if (updateError || !updatedOrder) {
    console.error(`[payment/webhook] Failed to complete order ${order.id}:`, updateError?.message);
    return NextResponse.json({ error: 'Failed to complete order.' }, { status: 409 });
  }

  const { data: plan, error: planError } = await supabase
    .from('product_plans')
    .select('billing_period, name, price, currency')
    .eq('id', order.plan_id)
    .single();

  if (planError || !plan) {
    console.error(`[payment/webhook] Missing plan for completed order ${order.id}`);
    return NextResponse.json({ error: 'Order completed but plan lookup failed.' }, { status: 500 });
  }

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
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle();

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
      if (subError) console.error('[payment/webhook] Subscription creation failed:', subError.message);
    }
  }

  if (billingPeriod === 'one_time' || billingPeriod === 'lifetime') {
    const { data: existingDownload } = await supabase
      .from('downloads')
      .select('id')
      .eq('order_id', order.id)
      .maybeSingle();

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
      if (downloadError) console.error('[payment/webhook] Download entitlement failed:', downloadError.message);
    }
  }

  await insertPaymentEvent(supabase, {
    orderId: order.id,
    provider: providerName,
    eventType: 'completed',
    providerPaymentRef,
    metadata: nonSensitiveMeta,
  });

  try {
    const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
    const userEmail = authUser?.user?.email ?? '';
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

    if (userEmail) {
      const productName = product?.name ?? 'Your Product';
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

      if (billingPeriod === 'monthly' || billingPeriod === 'yearly' || billingPeriod === 'lifetime') {
        await sendSubscriptionActivated(userEmail, {
          customerName: profile?.full_name ?? '',
          productName,
          planName: plan.name,
          billingPeriod,
          amount: plan.price,
          currency: plan.currency,
          renewalDate: periodEnd ?? now.toISOString(),
          subscriptionId: order.id,
        });
      }

      if (billingPeriod === 'one_time' || billingPeriod === 'lifetime') {
        const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://summeca.com').replace(/\/$/, '');
        await sendDownloadLink(userEmail, {
          customerName: profile?.full_name ?? '',
          productName,
          downloadUrl: `${siteUrl}/user-dashboard/downloads`,
          orderId: order.id,
        });
      }
    }
  } catch (emailErr) {
    console.warn('[payment/webhook] Transactional email failed (non-fatal):', emailErr);
  }

  console.info(`[payment/webhook] Order ${order.id} completed via ${providerName}.`);
  return NextResponse.json({ message: 'Payment verified. Order completed.' });
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
) {
  const { error } = await supabase.from('payment_events').insert({
    order_id: params.orderId,
    provider: params.provider,
    event_type: params.eventType,
    provider_payment_ref: params.providerPaymentRef,
    metadata: params.metadata,
  });

  if (error && error.code !== '23505') {
    console.warn('[payment/webhook] Failed to insert payment event:', error.message);
  }
}
