/**
 * POST /api/payment/create-payoneer-session
 *
 * Trusted server-side order creation for Payoneer Checkout.
 * Pricing, coupon validation and coupon usage reservation are performed
 * atomically in Postgres through create_priced_order().
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/payment/registry';
import { sendOrderConfirmation } from '@/lib/email/sendEmail';

interface CreateSessionRequest {
  productId?: string;
  planId?: string;
  couponId?: string | null;
}

const SUPPORTED_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CHF', 'HKD', 'SGD']);

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

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, slug, status')
    .eq('id', productId)
    .eq('status', 'active')
    .single();

  if (productError || !product) {
    return noStoreJson({ error: 'Product not found or unavailable.' }, { status: 404 });
  }

  const currency = String(plan.currency).toUpperCase();
  if (!SUPPORTED_CURRENCIES.has(currency)) {
    return noStoreJson({ error: `Currency ${currency} is not supported by Payoneer Checkout.` }, { status: 400 });
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
    return noStoreJson(
      { error: 'Zero-value orders require the free checkout flow and cannot be sent to Payoneer.' },
      { status: 422 },
    );
  }

  const { data: orderData, error: orderError } = await supabase.rpc('create_priced_order', {
    p_user: user.id,
    p_plan: planId,
    p_coupon: couponId,
    p_expected: finalAmount,
  });

  if (orderError || !orderData) {
    console.error('[create-payoneer-session] Atomic order creation failed:', orderError?.message);
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

  const provider = getProvider('payoneer');
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://summeca.com').replace(/\/$/, '');

  const sessionResult = await provider.createSession({
    orderId,
    amount: orderAmount,
    currency: orderCurrency,
    provider: 'payoneer',
    paymentMethodType: 'payoneer',
    productName: product.name,
    planName: plan.name,
    userId: user.id,
    successUrl: `${siteUrl}/checkout/success?order_id=${encodeURIComponent(orderId)}`,
    cancelUrl: `${siteUrl}/checkout/cancel?order_id=${encodeURIComponent(orderId)}`,
  });

  if (!sessionResult.success || !sessionResult.redirectUrl) {
    await supabase
      .from('orders')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', 'pending_payment');

    return noStoreJson(
      { error: sessionResult.error ?? 'Failed to create payment session.' },
      { status: 502 },
    );
  }

  if (sessionResult.providerPaymentRef) {
    const { error: refError } = await supabase
      .from('orders')
      .update({
        provider_payment_ref: sessionResult.providerPaymentRef,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'pending_payment');

    if (refError) {
      console.error('[create-payoneer-session] Failed to save provider ref:', refError.message);
      return noStoreJson({ error: 'Failed to finalize payment session.' }, { status: 500 });
    }
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
    console.warn('[create-payoneer-session] Order confirmation email failed (non-fatal):', emailErr);
  }

  return noStoreJson({
    orderId,
    redirectUrl: sessionResult.redirectUrl,
    providerPaymentRef: sessionResult.providerPaymentRef,
  });
}
