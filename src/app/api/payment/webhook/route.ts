/**
 * Provider-agnostic payment webhook handler.
 *
 * Route: POST /api/payment/webhook?provider=payoneer|crypto|manual
 *
 * SECURITY CONTRACT:
 * - This route is the ONLY place where orders are marked as completed.
 * - Verification is performed server-side using the provider's signature/secret.
 * - No frontend action can trigger an order status change.
 * - Only non-sensitive metadata is stored in Supabase.
 * - Full card numbers, CVV, private keys, and secrets are NEVER stored.
 * - Idempotency: duplicate events are detected via payment_events and ignored.
 *
 * After successful verification:
 *   1. orders.status → 'completed'
 *   2. orders.provider_payment_ref → provider's reference
 *   3. subscriptions row created (for recurring plans)
 *   4. downloads row created (for one-time / lifetime plans)
 *   5. payment_events row inserted for audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/payment/registry';
import type { PaymentProvider } from '@/lib/payment/types';
import { sendPaymentReceipt, sendDownloadLink } from '@/lib/email/sendEmail';
import { sendSubscriptionActivated, sendPaymentFailed } from '@/lib/email/sendEmail';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providerName = (searchParams.get('provider') ?? 'manual') as PaymentProvider;

  // Read raw body for signature verification
  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // ── 1. Get provider and verify webhook ──────────────────────────────────────
  let provider;
  try {
    provider = getProvider(providerName);
  } catch {
    return NextResponse.json({ error: `Unknown provider: ${providerName}` }, { status: 400 });
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
    console.warn(`[payment/webhook] Verification failed for provider=${providerName}:`, verification.error);
    return NextResponse.json({ error: 'Webhook verification failed.' }, { status: 400 });
  }

  const { orderId, providerPaymentRef, metadata, paymentStatus } = verification;

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId in webhook payload.' }, { status: 400 });
  }

  // ── 2. Fetch the order ───────────────────────────────────────────────────────
  const supabase = await createClient();

  const { data: order, error: orderFetchError } = await supabase
    .from('orders')
    .select('id, user_id, product_id, plan_id, status, amount, currency, metadata')
    .eq('id', orderId)
    .single();

  if (orderFetchError || !order) {
    console.error(`[payment/webhook] Order not found: ${orderId}`);
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  // ── 3. Idempotency check — detect duplicate events ───────────────────────────
  // Check if this specific provider event has already been processed
  if (providerPaymentRef) {
    const { data: existingEvent } = await supabase
      .from('payment_events')
      .select('id, event_type')
      .eq('order_id', orderId)
      .eq('provider_payment_ref', providerPaymentRef)
      .eq('event_type', paymentStatus ?? 'completed')
      .maybeSingle();

    if (existingEvent) {
      console.info(
        `[payment/webhook] Duplicate event ignored: order=${orderId} ref=${providerPaymentRef} type=${paymentStatus}`
      );
      return NextResponse.json({ message: 'Duplicate event — already processed.' }, { status: 200 });
    }
  }

  // Idempotency: skip if order already in terminal state
  if (order.status === 'completed' || order.status === 'refunded') {
    console.info(`[payment/webhook] Order ${orderId} already in terminal state: ${order.status}`);
    return NextResponse.json({ message: 'Already processed.' }, { status: 200 });
  }

  // ── 4. Handle failed / cancelled payments ───────────────────────────────────
  if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
    await supabase
      .from('orders')
      .update({
        status: paymentStatus === 'failed' ? 'failed' : 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    await insertPaymentEvent(supabase, {
      orderId,
      provider: providerName,
      eventType: paymentStatus,
      providerPaymentRef: providerPaymentRef ?? '',
      metadata: metadata ?? {},
    });

    // Mark any active subscription as past_due on payment failure
    if (paymentStatus === 'failed') {
      const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('id, user_id, products(name), product_plans(name, price, currency)')
        .eq('order_id', orderId)
        .eq('status', 'active')
        .maybeSingle();

      if (activeSub) {
        await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            past_due_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', activeSub.id);

        await supabase.from('subscription_audit_logs').insert({
          subscription_id: activeSub.id,
          admin_id: null,
          action: 'status_change',
          previous_status: 'active',
          new_status: 'past_due',
          note: 'Payment failed — subscription marked past_due',
          metadata: { provider: providerName, order_id: orderId },
        }).catch(() => {/* audit log failure is non-fatal */});

        // Send payment failed email
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(activeSub.user_id);
          const userEmail = authUser?.user?.email ?? '';
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', activeSub.user_id)
            .maybeSingle();

          const product = Array.isArray(activeSub.products) ? activeSub.products[0] : activeSub.products;
          const plan = Array.isArray(activeSub.product_plans) ? activeSub.product_plans[0] : activeSub.product_plans;
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://summeca.com';

          if (userEmail) {
            await sendPaymentFailed(userEmail, {
              customerName: profile?.full_name ?? '',
              productName: (product as any)?.name ?? 'Your Subscription',
              planName: (plan as any)?.name ?? 'Plan',
              amount: (plan as any)?.price ?? 0,
              currency: (plan as any)?.currency ?? 'USD',
              failedAt: new Date().toISOString(),
              retryUrl: `${siteUrl}/user-dashboard/subscriptions`,
            });
          }
        } catch (emailErr) {
          console.warn('[payment/webhook] Payment failed email error (non-fatal):', emailErr);
        }
      }
    }

    return NextResponse.json({ message: `Order marked as ${paymentStatus}.` });
  }

  // ── 5. Handle refunds ────────────────────────────────────────────────────────
  if (paymentStatus === 'refunded') {
    // Idempotency: check if refund already processed via webhook
    if (providerPaymentRef) {
      const { data: existingRefundEvent } = await supabase
        .from('payment_events')
        .select('id')
        .eq('order_id', orderId)
        .eq('event_type', 'refunded')
        .eq('provider_payment_ref', providerPaymentRef)
        .maybeSingle();

      if (existingRefundEvent) {
        console.info(`[payment/webhook] Duplicate refund event ignored: order=${orderId}`);
        return NextResponse.json({ message: 'Duplicate refund event — already processed.' }, { status: 200 });
      }
    }

    await supabase
      .from('orders')
      .update({
        status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    await insertPaymentEvent(supabase, {
      orderId,
      provider: providerName,
      eventType: 'refunded',
      providerPaymentRef: providerPaymentRef ?? '',
      metadata: metadata ?? {},
    });

    // Update matching refund record if one exists (provider-confirmed completion)
    if (providerPaymentRef) {
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
            provider_refund_id: providerPaymentRef,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', matchingRefund.id);

        console.info(`[payment/webhook] Refund record ${matchingRefund.id} marked completed via webhook`);
      }
    }

    return NextResponse.json({ message: 'Order marked as refunded.' });
  }

  // ── 6. Mark order as completed ───────────────────────────────────────────────
  const nonSensitiveMeta = {
    ...(order.metadata ?? {}),
    provider: metadata?.provider ?? providerName,
    payment_method_type: metadata?.payment_method_type ?? order.metadata?.payment_method_type,
    ...(metadata?.card_brand ? { card_brand: metadata.card_brand } : {}),
    ...(metadata?.card_last4 ? { card_last4: metadata.card_last4 } : {}),
    ...(providerPaymentRef ? { provider_payment_ref: providerPaymentRef } : {}),
  };

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'completed',
      provider_payment_ref: providerPaymentRef ?? '',
      metadata: nonSensitiveMeta,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateError) {
    console.error(`[payment/webhook] Failed to update order ${orderId}:`, updateError);
    return NextResponse.json({ error: 'Failed to update order.' }, { status: 500 });
  }

  // ── 7. Fetch plan details to determine entitlement type ─────────────────────
  const { data: plan } = await supabase
    .from('product_plans')
    .select('billing_period, name')
    .eq('id', order.plan_id)
    .single();

  const billingPeriod = plan?.billing_period ?? 'one_time';
  const now = new Date();

  // ── 8. Create subscription (for recurring plans) — idempotent ────────────────
  if (billingPeriod === 'monthly' || billingPeriod === 'yearly' || billingPeriod === 'lifetime') {
    // Check if subscription already exists for this order (idempotency)
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (!existingSub) {
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

      const { error: subError } = await supabase.from('subscriptions').insert({
        user_id: order.user_id,
        product_id: order.product_id,
        plan_id: order.plan_id,
        order_id: orderId,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd,
        payment_provider: providerName,
        metadata: {
          provider: providerName,
          provider_payment_ref: providerPaymentRef ?? '',
        },
      });

      if (subError) {
        console.error(`[payment/webhook] Failed to create subscription for order ${orderId}:`, subError);
      } else {
        // Send subscription activated email (fire-and-forget)
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
          const userEmail = authUser?.user?.email ?? '';
          const { data: profile } = await supabase
            .from('user_profiles').select('full_name').eq('id', order.user_id).maybeSingle();
          const { data: emailProduct } = await supabase
            .from('products').select('name').eq('id', order.product_id).maybeSingle();
          const { data: emailPlan } = await supabase
            .from('product_plans').select('name, billing_period, price, currency').eq('id', order.plan_id).maybeSingle();

          if (userEmail && emailProduct && emailPlan) {
            await sendSubscriptionActivated(userEmail, {
              customerName: profile?.full_name ?? '',
              productName: emailProduct.name,
              planName: emailPlan.name,
              billingPeriod: emailPlan.billing_period,
              amount: emailPlan.price,
              currency: emailPlan.currency,
              renewalDate: periodEnd ?? now.toISOString(),
              subscriptionId: orderId,
            });
          }
        } catch (subEmailErr) {
          console.warn('[payment/webhook] Subscription activated email error (non-fatal):', subEmailErr);
        }
      }
    }
  }

  // ── 9. Create download entitlement (for one-time / lifetime plans) — idempotent
  if (billingPeriod === 'one_time' || billingPeriod === 'lifetime') {
    // Check if download entitlement already exists for this order (idempotency)
    const { data: existingDownload } = await supabase
      .from('downloads')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();

    if (!existingDownload) {
      const { error: dlError } = await supabase.from('downloads').insert({
        user_id: order.user_id,
        product_id: order.product_id,
        order_id: orderId,
        file_name: '',
        file_url: '',
        status: 'available',
        download_count: 0,
      });

      if (dlError) {
        console.error(`[payment/webhook] Failed to create download for order ${orderId}:`, dlError);
      }
    }
  }

  // ── 10. Insert payment event for audit trail ─────────────────────────────────
  await insertPaymentEvent(supabase, {
    orderId,
    provider: providerName,
    eventType: 'completed',
    providerPaymentRef: providerPaymentRef ?? '',
    metadata: nonSensitiveMeta,
  });

  // ── 11. Send transactional emails (server-side, fire-and-forget) ─────────────
  try {
    // Fetch user email and profile for email personalisation
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', order.user_id)
      .maybeSingle();

    const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
    const userEmail = authUser?.user?.email ?? '';
    const customerName = userProfile?.full_name ?? '';

    if (userEmail) {
      // Fetch product details for email
      const { data: emailProduct } = await supabase
        .from('products')
        .select('name')
        .eq('id', order.product_id)
        .maybeSingle();

      const { data: emailPlan } = await supabase
        .from('product_plans')
        .select('name, billing_period')
        .eq('id', order.plan_id)
        .maybeSingle();

      const productName = emailProduct?.name ?? 'Your Product';
      const planName = emailPlan?.name ?? 'Plan';
      const billingPeriodLabel = emailPlan?.billing_period ?? 'one_time';

      // Payment receipt — sent for every completed payment
      await sendPaymentReceipt(userEmail, {
        customerName,
        orderId,
        productName,
        planName,
        amount: Math.round(order.amount * 100), // convert to cents for display
        currency: order.currency,
        provider: providerName,
        providerRef: providerPaymentRef ?? '',
        paidAt: new Date().toISOString(),
      });

      // Download link — only for one-time / lifetime plans
      if (billingPeriodLabel === 'one_time' || billingPeriodLabel === 'lifetime') {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://summeca1430.builtwithrocket.new';
        await sendDownloadLink(userEmail, {
          customerName,
          productName,
          downloadUrl: `${siteUrl}/user-dashboard/downloads`,
          orderId,
        });
      }
    }
  } catch (emailErr) {
    // Email failures must never block the webhook response
    console.warn('[payment/webhook] Email send error (non-fatal):', emailErr);
  }

  console.info(`[payment/webhook] Order ${orderId} completed via ${providerName}.`);
  return NextResponse.json({ message: 'Payment verified. Order completed.' });
}

// ─── Helper: insert payment_events row ────────────────────────────────────────

async function insertPaymentEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

  if (error) {
    console.warn('[payment/webhook] Failed to insert payment_event:', error.message);
  }
}
