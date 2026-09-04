/**
 * POST /api/payment/create-payoneer-session
 *
 * Server-side Payoneer checkout session creation.
 *
 * SECURITY CONTRACT:
 * - Amount is calculated server-side from the database — never trusted from the client.
 * - Currency is validated server-side.
 * - Product availability is validated server-side.
 * - Order is created with status = 'pending_payment'.
 * - The Payoneer hosted checkout URL is returned to the client.
 * - The order is only marked 'completed' by the webhook handler after server-side verification.
 * - No CVV, full card numbers, or secrets are stored or returned.
 * - No Payoneer credentials are exposed to the client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getProvider } from '@/lib/payment/registry';
import { sendOrderConfirmation } from '@/lib/email/sendEmail';

interface CreateSessionRequest {
  productId: string;
  planId: string;
  couponId?: string | null;
}

export async function POST(request: NextRequest) {
  // ── 1. Authenticate the user ──────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 }
    );
  }

  // ── 2. Parse and validate request body ────────────────────────────────────
  let body: CreateSessionRequest;
  try {
    body = (await request.json()) as CreateSessionRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { productId, planId, couponId } = body;

  if (!productId || !planId) {
    return NextResponse.json(
      { error: 'productId and planId are required.' },
      { status: 400 }
    );
  }

  // ── 3. Validate product availability (server-side) ────────────────────────
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, slug, is_active')
    .eq('id', productId)
    .eq('is_active', true)
    .single();

  if (productError || !product) {
    return NextResponse.json(
      { error: 'Product not found or unavailable.' },
      { status: 404 }
    );
  }

  // ── 4. Validate plan and calculate amount server-side ─────────────────────
  const { data: plan, error: planError } = await supabase
    .from('product_plans')
    .select('id, name, price, currency, billing_period, is_active')
    .eq('id', planId)
    .eq('product_id', productId)
    .eq('is_active', true)
    .single();

  if (planError || !plan) {
    return NextResponse.json(
      { error: 'Plan not found or unavailable.' },
      { status: 404 }
    );
  }

  // ── 5. Validate currency ──────────────────────────────────────────────────
  const supportedCurrencies = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CHF', 'HKD', 'SGD'];
  const currency = plan.currency.toUpperCase();

  if (!supportedCurrencies.includes(currency)) {
    return NextResponse.json(
      { error: `Currency ${currency} is not supported by Payoneer Checkout.` },
      { status: 400 }
    );
  }

  // ── 6. Apply coupon discount (server-side) ────────────────────────────────
  let discountAmount = 0;
  let appliedCouponId: string | null = null;

  if (couponId) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('id, coupon_type, discount_value, applies_to, max_uses, used_count, valid_until, is_active')
      .eq('id', couponId)
      .eq('is_active', true)
      .single();

    if (coupon) {
      const isExpired = coupon.valid_until && new Date(coupon.valid_until) < new Date();
      const isExhausted = coupon.max_uses !== null && coupon.used_count >= coupon.max_uses;
      const appliesToProduct = !coupon.applies_to || coupon.applies_to === productId;

      if (!isExpired && !isExhausted && appliesToProduct) {
        discountAmount =
          coupon.coupon_type === 'percentage'
            ? (plan.price * coupon.discount_value) / 100
            : Math.min(coupon.discount_value, plan.price);
        appliedCouponId = coupon.id;
      }
    }
  }

  const finalAmount = Math.max(0, plan.price - discountAmount);

  // ── 7. Create the order with status = 'pending_payment' ───────────────────
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
      discount_amount: discountAmount,
      provider_payment_ref: '', // populated by webhook after payment
      receipt_url: '',
      metadata: {
        provider: 'payoneer',
        payment_method_type: 'payoneer',
        plan_name: plan.name,
        product_name: product.name,
        billing_period: plan.billing_period,
      },
    })
    .select('id')
    .single();

  if (orderError || !order) {
    console.error('[create-payoneer-session] Failed to create order:', orderError?.message);
    return NextResponse.json(
      { error: 'Failed to create order. Please try again.' },
      { status: 500 }
    );
  }

  // ── 8. Create Payoneer checkout session (server-side) ─────────────────────
  const provider = getProvider('payoneer');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://summeca1430.builtwithrocket.new';

  const sessionResult = await provider.createSession({
    orderId: order.id,
    amount: finalAmount,
    currency,
    provider: 'payoneer',
    paymentMethodType: 'payoneer',
    productName: product.name,
    planName: plan.name,
    userId: user.id,
    successUrl: `${siteUrl}/checkout/success?order_id=${order.id}`,
    cancelUrl: `${siteUrl}/checkout/cancel?order_id=${order.id}`,
  });

  if (!sessionResult.success || !sessionResult.redirectUrl) {
    // Mark the order as failed since we couldn't create the payment session
    await supabase
      .from('orders')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', order.id);

    return NextResponse.json(
      { error: sessionResult.error ?? 'Failed to create payment session.' },
      { status: 502 }
    );
  }

  // ── 9. Store the provider payment reference ───────────────────────────────
  if (sessionResult.providerPaymentRef) {
    await supabase
      .from('orders')
      .update({
        provider_payment_ref: sessionResult.providerPaymentRef,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);
  }

  // ── 10. Send order confirmation email (server-side, fire-and-forget) ──────
  try {
    const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
    const userEmail = authUser?.user?.email ?? '';

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (userEmail) {
      await sendOrderConfirmation(userEmail, {
        customerName: userProfile?.full_name ?? '',
        orderId: order.id,
        productName: product.name,
        planName: plan.name,
        amount: Math.round(finalAmount * 100),
        currency,
        billingPeriod: plan.billing_period,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (emailErr) {
    console.warn('[create-payoneer-session] Order confirmation email failed (non-fatal):', emailErr);
  }

  // ── 11. Return the hosted checkout URL to the client ──────────────────────
  // The client will redirect the user to this URL.
  // The URL is from Payoneer — it is safe to return to the client.
  return NextResponse.json({
    orderId: order.id,
    redirectUrl: sessionResult.redirectUrl,
    providerPaymentRef: sessionResult.providerPaymentRef,
  });
}
