import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/payment/registry';
import { getCryptoMinimumCheck } from '@/lib/payment/providers/crypto';
import { sendOrderConfirmation } from '@/lib/email/sendEmail';

interface CreateCryptoSessionRequest {
  productId?: string;
  planId?: string;
  couponId?: string | null;
  paymentMethodType?: string;
}

const SUPPORTED_METHODS = new Set([
  'crypto_usdt_trc20',
  'crypto_usdt_erc20',
  'crypto_usdc',
  'crypto_usdc_polygon',
  'crypto_trx',
  'crypto_ltc',
  'crypto_btc',
  'crypto_eth',
]);

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
  if (
    !process.env.NOWPAYMENTS_API_KEY?.trim()
    || !process.env.NOWPAYMENTS_IPN_SECRET?.trim()
    || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ) {
    return noStoreJson({ error: 'Crypto checkout server configuration is incomplete.' }, { status: 503 });
  }

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
  const paymentMethodType = body.paymentMethodType?.trim() || 'crypto_usdt_trc20';
  if (!productId || !planId) {
    return noStoreJson({ error: 'productId and planId are required.' }, { status: 400 });
  }
  if (!SUPPORTED_METHODS.has(paymentMethodType)) {
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

  const orderCurrencyPreview = String(quoteRecord.currency ?? plan.currency).toUpperCase();
  const minimumCheck = await getCryptoMinimumCheck({
    paymentMethodType,
    priceCurrency: orderCurrencyPreview,
  });
  if (
    minimumCheck.checked
    && minimumCheck.minimumFiat !== undefined
    && finalAmount + 0.005 < minimumCheck.minimumFiat
  ) {
    return noStoreJson({
      error: `This payment method currently requires at least ${minimumCheck.minimumFiat.toFixed(2)} ${orderCurrencyPreview}. Try TRON (TRX) or Litecoin (LTC).`,
      minimumAmount: minimumCheck.minimumFiat,
      minimumCurrency: orderCurrencyPreview,
      payCurrency: minimumCheck.payCurrency,
    }, { status: 422 });
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

  const order = orderData as Record<string, unknown>;
  const orderId = String(order.id ?? '');
  const orderAmount = Number(order.amount ?? finalAmount);
  const orderCurrency = String(order.currency ?? plan.currency).toUpperCase();
  const createdAt = String(order.created_at ?? new Date().toISOString());
  if (!orderId || !Number.isFinite(orderAmount) || orderAmount <= 0) {
    return noStoreJson({ error: 'Order was created with invalid payment details.' }, { status: 500 });
  }

  const provider = getProvider('crypto');
  const sessionResult = await provider.createSession({
    orderId,
    amount: orderAmount,
    currency: orderCurrency,
    provider: 'crypto',
    paymentMethodType,
    productName: product.name,
    planName: plan.name,
    userId: user.id,
  });

  if (!sessionResult.success || !sessionResult.providerPaymentRef || !sessionResult.paymentAddress || !sessionResult.cryptoAmount) {
    await supabase
      .from('orders')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', 'pending_payment');

    return noStoreJson({ error: sessionResult.error ?? 'Failed to create crypto payment.' }, { status: 502 });
  }

  const priorMetadata = order.metadata && typeof order.metadata === 'object'
    ? order.metadata as Record<string, unknown>
    : {};

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      provider_payment_ref: sessionResult.providerPaymentRef,
      metadata: {
        ...priorMetadata,
        provider: 'crypto',
        payment_method_type: paymentMethodType,
        provider_payment_ref: sessionResult.providerPaymentRef,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .eq('status', 'pending_payment');

  if (updateError) {
    console.error('[create-crypto-session] Failed to save crypto provider ref:', updateError.message);
    return noStoreJson({ error: 'Failed to finalize crypto payment session.' }, { status: 500 });
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
    provider: 'nowpayments',
    providerPaymentRef: sessionResult.providerPaymentRef,
    paymentAddress: sessionResult.paymentAddress,
    cryptoAmount: sessionResult.cryptoAmount,
    paymentMethodType,
    instructions: sessionResult.instructions,
  });
}
