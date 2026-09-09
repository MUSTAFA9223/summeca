/**
 * POST /api/payment/create-fastspring-session
 *
 * Trusted server-side FastSpring order/session creation.
 * SUMMECA remains authoritative for product, plan, sale and coupon pricing.
 * FastSpring receives the already-verified final price as a server-side override.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/payment/registry';
import { getFastSpringReadiness } from '@/lib/payment/providers/fastspring';
import { sendOrderConfirmation } from '@/lib/email/sendEmail';

interface CreateSessionRequest {
  productId?: string;
  planId?: string;
  couponId?: string | null;
}

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function checkoutError(message?: string) {
  if (message?.includes('Coupon unavailable')) return 'This coupon is no longer available.';
  if (message?.includes('Price changed')) return 'The price changed. Review the updated total and try again.';
  if (message?.includes('Plan unavailable')) return 'This plan is no longer available.';
  if (message?.includes('Order limit reached')) return 'Too many checkout attempts. Please try again later.';
  return 'Failed to create order. Please try again.';
}

export async function POST(request: NextRequest) {
  const readiness = getFastSpringReadiness();
  if (!readiness.configured || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return noStoreJson({ error: 'FastSpring checkout server configuration is incomplete.' }, { status: 503 });
  }

  const sessionClient = await createClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) {
    return noStoreJson({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: CreateSessionRequest;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: 'Invalid request body.' }, { status: 400 });
  }

  const productId = body.productId?.trim();
  const planId = body.planId?.trim();
  const couponId = body.couponId?.trim() || null;
  if (!productId || !planId) {
    return noStoreJson({ error: 'productId and planId are required.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: plan, error: planError } = await supabase
    .from('product_plans')
    .select('id, product_id, name, currency, billing_period, is_active')
    .eq('id', planId)
    .eq('product_id', productId)
    .eq('is_active', true)
    .single();
  if (planError || !plan) {
    return noStoreJson({ error: 'Plan not found or unavailable.' }, { status: 404 });
  }

  // Until recurring FastSpring rebill webhooks are wired to extend local
  // subscription periods, never expose a live recurring checkout that could
  // charge a customer without keeping SUMMECA access in sync.
  if (readiness.live && (plan.billing_period === 'monthly' || plan.billing_period === 'yearly')) {
    return noStoreJson(
      { error: 'FastSpring recurring subscriptions are not enabled for live checkout yet. Use another payment method for this plan.' },
      { status: 503 },
    );
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, slug, status')
    .eq('id', productId)
    .eq('status', 'active')
    .single();
  if (productError || !product) {
    return noStoreJson({ error: 'Product not found or unavailable.' }, { status: 404 });
  }

  const currency = String(plan.currency).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return noStoreJson({ error: `Currency ${currency || '(empty)'} is not valid for FastSpring checkout.` }, { status: 400 });
  }

  const { data: quote, error: quoteError } = await supabase.rpc('quote_product_price', {
    p_plan: planId,
    p_coupon: couponId,
  });
  if (quoteError || !quote) {
    return noStoreJson({ error: checkoutError(quoteError?.message) }, { status: 409 });
  }

  const quoteRecord = quote as Record<string, unknown>;
  if (String(quoteRecord.product_id ?? '') !== productId) {
    return noStoreJson({ error: 'Selected plan does not belong to this product.' }, { status: 409 });
  }

  const finalAmount = Number(quoteRecord.final_amount ?? 0);
  if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
    return noStoreJson({ error: 'Zero-value orders require the free checkout flow.' }, { status: 422 });
  }

  const { data: orderData, error: orderError } = await supabase.rpc('create_priced_order', {
    p_user: user.id,
    p_plan: planId,
    p_coupon: couponId,
    p_expected: finalAmount,
  });
  if (orderError || !orderData) {
    console.error('[create-fastspring-session] Atomic order creation failed:', orderError?.message);
    return noStoreJson({ error: checkoutError(orderError?.message) }, { status: 409 });
  }

  const order = orderData as Record<string, unknown>;
  const orderId = String(order.id ?? '');
  const orderAmount = Number(order.amount ?? finalAmount);
  const orderCurrency = String(order.currency ?? currency).toUpperCase();
  const createdAt = String(order.created_at ?? new Date().toISOString());
  if (!orderId || !Number.isFinite(orderAmount) || orderAmount <= 0) {
    return noStoreJson({ error: 'Order was created with invalid payment details.' }, { status: 500 });
  }

  const configuredTestPath = process.env.FASTSPRING_TEST_PRODUCT_PATH?.trim();
  const providerProductPath = !readiness.live && configuredTestPath
    ? configuredTestPath
    : product.slug;

  const provider = getProvider('fastspring');
  const sessionResult = await provider.createSession({
    orderId,
    amount: orderAmount,
    currency: orderCurrency,
    provider: 'fastspring',
    paymentMethodType: 'card',
    productName: product.name,
    planName: plan.name,
    userId: user.id,
    customerEmail: user.email,
    providerProductPath,
    billingPeriod: plan.billing_period,
  });

  if (!sessionResult.success || !sessionResult.redirectUrl || !sessionResult.providerPaymentRef) {
    await supabase
      .from('orders')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', 'pending_payment');

    return noStoreJson(
      { error: sessionResult.error ?? 'Failed to create FastSpring checkout session.' },
      { status: 502 },
    );
  }

  // FastSpring's session id is not the final order/payment id. Keep it in
  // metadata only so the signed order.completed webhook can establish the
  // definitive provider_payment_ref without a false reference mismatch.
  const priorMetadata = order.metadata && typeof order.metadata === 'object'
    ? order.metadata as Record<string, unknown>
    : {};
  const { error: metadataError } = await supabase
    .from('orders')
    .update({
      metadata: {
        ...priorMetadata,
        provider: 'fastspring',
        payment_method_type: 'card',
        fastspring_session_id: sessionResult.providerPaymentRef,
        fastspring_product_path: providerProductPath,
        fastspring_live: readiness.live,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', 'pending_payment');

  if (metadataError) {
    console.error('[create-fastspring-session] Failed to save provider metadata:', metadataError.message);
    return noStoreJson({ error: 'Failed to finalize FastSpring checkout session.' }, { status: 500 });
  }

  try {
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (user.email) {
      await sendOrderConfirmation(user.email, {
        customerName: userProfile?.full_name ?? '',
        orderId,
        productName: product.name,
        planName: plan.name,
        amount: Math.round(orderAmount * 100),
        currency: orderCurrency,
        billingPeriod: plan.billing_period,
        createdAt,
      });
    }
  } catch (emailErr) {
    console.warn('[create-fastspring-session] Order confirmation email failed (non-fatal):', emailErr);
  }

  return noStoreJson({
    orderId,
    redirectUrl: sessionResult.redirectUrl,
    provider: 'fastspring',
    testMode: !readiness.live,
  });
}
