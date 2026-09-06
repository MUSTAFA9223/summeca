/**
 * POST /api/payment/create-payoneer-session
 *
 * Trusted server-side order creation for Payoneer Checkout.
 * All prices and availability checks come from the database; the client only
 * submits product/plan/coupon identifiers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/payment/registry';
import { sendOrderConfirmation } from '@/lib/email/sendEmail';
import { getEffectivePrice } from '@/lib/pricing';

interface CreateSessionRequest {
  productId?: string;
  planId?: string;
  couponId?: string | null;
}

const SUPPORTED_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CHF', 'HKD', 'SGD']);

export async function POST(request: NextRequest) {
  const sessionClient = await createClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: CreateSessionRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const productId = body.productId?.trim();
  const planId = body.planId?.trim();
  const couponId = body.couponId?.trim() || null;
  if (!productId || !planId) {
    return NextResponse.json({ error: 'productId and planId are required.' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, slug, status')
    .eq('id', productId)
    .eq('status', 'active')
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: 'Product not found or unavailable.' }, { status: 404 });
  }

  const { data: plan, error: planError } = await supabase
    .from('product_plans')
    .select('id, name, price, currency, billing_period, is_active, sale_price, sale_discount_type, sale_discount_value, sale_starts_at, sale_ends_at')
    .eq('id', planId)
    .eq('product_id', productId)
    .eq('is_active', true)
    .single();

  if (planError || !plan) {
    return NextResponse.json({ error: 'Plan not found or unavailable.' }, { status: 404 });
  }

  const currency = String(plan.currency).toUpperCase();
  if (!SUPPORTED_CURRENCIES.has(currency)) {
    return NextResponse.json({ error: `Currency ${currency} is not supported by Payoneer Checkout.` }, { status: 400 });
  }

  let pricing;
  try {
    pricing = getEffectivePrice(plan);
  } catch {
    return NextResponse.json({ error: 'Invalid product price.' }, { status: 500 });
  }

  const basePrice = pricing.finalPrice;
  let couponDiscountAmount = 0;
  let appliedCouponId: string | null = null;

  if (couponId) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('id, coupon_type, discount_value, applies_to, max_uses, used_count, valid_from, valid_until, is_active')
      .eq('id', couponId)
      .eq('is_active', true)
      .maybeSingle();

    if (coupon) {
      const now = new Date();
      const startsInFuture = coupon.valid_from && new Date(coupon.valid_from) > now;
      const expired = coupon.valid_until && new Date(coupon.valid_until) < now;
      const exhausted = coupon.max_uses !== null && coupon.used_count >= coupon.max_uses;
      const applies = !coupon.applies_to || coupon.applies_to === productId;

      if (!startsInFuture && !expired && !exhausted && applies) {
        const discountValue = Number(coupon.discount_value);
        couponDiscountAmount = coupon.coupon_type === 'percentage'
          ? Math.min(basePrice, Math.max(0, (basePrice * discountValue) / 100))
          : Math.min(basePrice, Math.max(0, discountValue));
        appliedCouponId = coupon.id;
      }
    }
  }

  const finalAmount = Number(Math.max(0, basePrice - couponDiscountAmount).toFixed(2));
  const totalDiscountAmount = Number((pricing.discountAmount + couponDiscountAmount).toFixed(2));

  if (finalAmount <= 0) {
    return NextResponse.json(
      { error: 'Zero-value orders require the free checkout flow and cannot be sent to Payoneer.' },
      { status: 422 }
    );
  }

  const createdAt = new Date().toISOString();
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      product_id: productId,
      plan_id: planId,
      coupon_id: appliedCouponId,
      status: 'pending_payment',
      amount: finalAmount,
      currency,
      discount_amount: totalDiscountAmount,
      provider_payment_ref: '',
      receipt_url: '',
      metadata: {
        provider: 'payoneer',
        payment_method_type: 'payoneer',
        plan_name: plan.name,
        product_name: product.name,
        billing_period: plan.billing_period,
        regular_price: pricing.regularPrice,
        sale_price: pricing.salePrice,
        sale_discount_amount: pricing.discountAmount,
        coupon_discount_amount: Number(couponDiscountAmount.toFixed(2)),
      },
      created_at: createdAt,
      updated_at: createdAt,
    })
    .select('id')
    .single();

  if (orderError || !order) {
    console.error('[create-payoneer-session] Failed to create order:', orderError?.message);
    return NextResponse.json({ error: 'Failed to create order. Please try again.' }, { status: 500 });
  }

  const provider = getProvider('payoneer');
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://summeca.com').replace(/\/$/, '');

  const sessionResult = await provider.createSession({
    orderId: order.id,
    amount: finalAmount,
    currency,
    provider: 'payoneer',
    paymentMethodType: 'payoneer',
    productName: product.name,
    planName: plan.name,
    userId: user.id,
    successUrl: `${siteUrl}/checkout/success?order_id=${encodeURIComponent(order.id)}`,
    cancelUrl: `${siteUrl}/checkout/cancel?order_id=${encodeURIComponent(order.id)}`,
  });

  if (!sessionResult.success || !sessionResult.redirectUrl) {
    await supabase
      .from('orders')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', 'pending_payment');

    return NextResponse.json(
      { error: sessionResult.error ?? 'Failed to create payment session.' },
      { status: 502 }
    );
  }

  if (sessionResult.providerPaymentRef) {
    const { error: refError } = await supabase
      .from('orders')
      .update({
        provider_payment_ref: sessionResult.providerPaymentRef,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('status', 'pending_payment');

    if (refError) {
      console.error('[create-payoneer-session] Failed to save provider ref:', refError.message);
      return NextResponse.json({ error: 'Failed to finalize payment session.' }, { status: 500 });
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
        orderId: order.id,
        productName: product.name,
        planName: plan.name,
        amount: Math.round(finalAmount * 100),
        currency,
        billingPeriod: plan.billing_period,
        createdAt,
      });
    }
  } catch (emailErr) {
    console.warn('[create-payoneer-session] Order confirmation email failed (non-fatal):', emailErr);
  }

  return NextResponse.json({
    orderId: order.id,
    redirectUrl: sessionResult.redirectUrl,
    providerPaymentRef: sessionResult.providerPaymentRef,
  });
}
