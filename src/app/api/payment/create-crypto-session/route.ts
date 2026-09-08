/**
 * POST /api/payment/create-crypto-session
 *
 * Trusted server-side order creation for NOWPayments.
 * Pricing/coupons are recalculated in Postgres. The order remains pending until
 * the signed crypto webhook reports a terminal paid state.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/payment/registry';
import { getCryptoMethodDetails } from '@/lib/payment/providers/crypto';
import { sendOrderConfirmation } from '@/lib/email/sendEmail';
import type { PaymentMethodType } from '@/lib/payment/types';

interface CreateCryptoSessionRequest {
  productId?: string;
  planId?: string;
  couponId?: string | null;
  paymentMethodType?: PaymentMethodType;
}

const SUPPORTED_PRICE_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CHF', 'HKD', 'SGD']);

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

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function POST(request: NextRequest) {
  const sessionClient = await createClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) {
    return noStoreJson({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: CreateCryptoSessionRequest;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: 'Invalid request body.' }, { status: 400 });
  }

  const productId = body.productId?.trim();
  const planId = body.planId?.trim();
  const couponId = body.couponId?.trim() || null;
  const paymentMethodType = body.paymentMethodType ?? 'crypto_usdt_trc20';
  const cryptoMethod = getCryptoMethodDetails(paymentMethodType);

  if (!productId || !planId) {
    return noStoreJson({ error: 'productId and planId are required.' }, { status: 400 });
  }
  if (!cryptoMethod) {
    return noStoreJson({ error: 'Unsupported cryptocurrency or network.' }, { status: 400 });
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
  if (!SUPPORTED_PRICE_CURRENCIES.has(currency)) {
    return noStoreJson({ error: `Currency ${currency} is not supported by crypto checkout.` }, { status: 400 });
  }

  const { data: quote, error: quoteError } = await supabase.rpc('quote_product_price', {
    p_plan: planId,
    p_coupon: couponId,
  });

  if (quoteError || !quote) {
    return noStoreJson({ error: checkoutError(quoteError?.message) }, { status: 409 });
  }

  const quoteRecord = record(quote);
  if (String(quoteRecord.product_id ?? '') !== productId) {
    return noStoreJson({ error: 'Selected plan does not belong to this product.' }, { status: 409 });
  }

  const finalAmount = Number(quoteRecord.final_amount ?? 0);
  if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
    return noStoreJson(
      { error: 'Zero-value orders require the free checkout flow and cannot be sent to crypto checkout.' },
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
    console.error('[create-crypto-session] Atomic order creation failed:', orderError?.message);
    return noStoreJson({ error: checkoutError(orderError?.message) }, { status: 409 });
  }

  const order = record(orderData);
  const orderId = String(order.id ?? '');
  const orderAmount = Number(order.amount ?? finalAmount);
  const orderCurrency = String(order.currency ?? currency).toUpperCase();
  const createdAt = String(order.created_at ?? new Date().toISOString());
  const baseMetadata = record(order.metadata);

  if (!orderId || !Number.isFinite(orderAmount) || orderAmount <= 0) {
    return noStoreJson({ error: 'Order was created with invalid payment details.' }, { status: 500 });
  }

  // Bind the order to crypto before contacting the provider. A callback can
  // therefore never be accepted for a different provider even if it arrives quickly.
  const { error: bindError } = await supabase
    .from('orders')
    .update({
      metadata: {
        ...baseMetadata,
        provider: 'crypto',
        payment_method_type: cryptoMethod.method,
        crypto_currency: cryptoMethod.asset,
        crypto_network: cryptoMethod.network,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('user_id', user.id)
    .eq('status', 'pending_payment');

  if (bindError) {
    console.error('[create-crypto-session] Failed to bind order to crypto:', bindError.message);
    return noStoreJson({ error: 'Failed to prepare cryptocurrency checkout.' }, { status: 500 });
  }

  const provider = getProvider('crypto');
  const sessionResult = await provider.createSession({
    orderId,
    amount: orderAmount,
    currency: orderCurrency,
    provider: 'crypto',
    paymentMethodType: cryptoMethod.method,
    productName: product.name,
    planName: plan.name,
    userId: user.id,
  });

  if (
    !sessionResult.success ||
    !sessionResult.providerPaymentRef ||
    !sessionResult.paymentAddress ||
    !sessionResult.cryptoAmount
  ) {
    await supabase
      .from('orders')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', 'pending_payment');

    return noStoreJson(
      { error: sessionResult.error ?? 'Failed to create cryptocurrency payment.' },
      { status: 502 },
    );
  }

  const cryptoMetadata = {
    ...baseMetadata,
    provider: 'crypto',
    payment_method_type: cryptoMethod.method,
    provider_payment_ref: sessionResult.providerPaymentRef,
    crypto_currency: cryptoMethod.asset,
    crypto_network: cryptoMethod.network,
    crypto_amount: sessionResult.cryptoAmount,
    crypto_payment_address: sessionResult.paymentAddress,
    provider_status: 'waiting',
  };

  const { error: saveError } = await supabase
    .from('orders')
    .update({
      provider_payment_ref: sessionResult.providerPaymentRef,
      metadata: cryptoMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('user_id', user.id)
    .eq('status', 'pending_payment');

  if (saveError) {
    console.error('[create-crypto-session] Failed to save crypto payment details:', saveError.message);
    return noStoreJson({ error: 'Payment was created but could not be attached to the order.' }, { status: 500 });
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
    console.warn('[create-crypto-session] Order confirmation email failed (non-fatal):', emailErr);
  }

  return noStoreJson({
    orderId,
    providerPaymentRef: sessionResult.providerPaymentRef,
    paymentAddress: sessionResult.paymentAddress,
    cryptoAmount: sessionResult.cryptoAmount,
    cryptoCurrency: cryptoMethod.asset,
    cryptoNetwork: cryptoMethod.network,
  });
}
