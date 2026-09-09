import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendDownloadLink, sendSubscriptionActivated } from '@/lib/email/sendEmail';

type ServiceClient = ReturnType<typeof createServiceClient>;

type PlanRecord = {
  id: string;
  name: string;
  currency: string;
  billing_period: 'one_time' | 'monthly' | 'yearly' | 'lifetime';
};

function response(body: unknown, init?: ResponseInit) {
  const result = NextResponse.json(body, init);
  result.headers.set('Cache-Control', 'private, no-store');
  return result;
}

function checkoutError(message?: string) {
  if (message?.includes('Coupon unavailable')) return 'This coupon is no longer available.';
  if (message?.includes('Price changed')) return 'The price changed. Review the updated total and try again.';
  if (message?.includes('Plan unavailable')) return 'This plan is no longer available.';
  if (message?.includes('Order limit reached')) return 'Too many checkout attempts. Please try again later.';
  return 'Failed to create free order. Please try again.';
}

function getPeriodEnd(period: PlanRecord['billing_period']) {
  const now = new Date();
  if (period === 'monthly') {
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    return end.toISOString();
  }
  if (period === 'yearly') {
    const end = new Date(now);
    end.setFullYear(end.getFullYear() + 1);
    return end.toISOString();
  }
  return null;
}

async function reconcileFreeEntitlements(
  supabase: ServiceClient,
  params: {
    orderId: string;
    userId: string;
    productId: string;
    plan: PlanRecord;
  },
) {
  const { orderId, userId, productId, plan } = params;
  const now = new Date().toISOString();
  const periodEnd = getPeriodEnd(plan.billing_period);
  let subscriptionId: string | null = null;

  if (plan.billing_period === 'monthly' || plan.billing_period === 'yearly' || plan.billing_period === 'lifetime') {
    const { data: existingSubscription, error: lookupError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (existingSubscription) {
      subscriptionId = existingSubscription.id;
    } else {
      const { data: insertedSubscription, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          product_id: productId,
          plan_id: plan.id,
          order_id: orderId,
          status: 'active',
          current_period_start: now,
          current_period_end: periodEnd,
          payment_provider: 'free',
          metadata: { provider: 'free', payment_method_type: 'free' },
        })
        .select('id')
        .maybeSingle();
      if (error && error.code !== '23505') throw error;
      subscriptionId = insertedSubscription?.id ?? null;
    }
  }

  if (plan.billing_period === 'one_time' || plan.billing_period === 'lifetime') {
    const { data: existingDownload, error: lookupError } = await supabase
      .from('downloads')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (!existingDownload) {
      // The private-download trigger only inserts an entitlement when the
      // product has a configured metadata.download path. SaaS/lifetime plans
      // without a downloadable artifact therefore remain subscription/order
      // entitlements rather than receiving a fake file.
      const { error } = await supabase.from('downloads').insert({
        user_id: userId,
        product_id: productId,
        order_id: orderId,
        file_name: '',
        file_url: '',
        status: 'available',
        download_count: 0,
      });
      if (error && error.code !== '23505') throw error;
    }
  }

  return { periodEnd, subscriptionId };
}

export async function POST(request: NextRequest) {
  const sessionClient = await createClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) {
    return response({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: { productId?: string; planId?: string; couponId?: string | null };
  try {
    body = await request.json();
  } catch {
    return response({ error: 'Invalid request body.' }, { status: 400 });
  }

  const productId = body.productId?.trim();
  const planId = body.planId?.trim();
  const couponId = body.couponId?.trim() || null;
  if (!productId || !planId) {
    return response({ error: 'productId and planId are required.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const [{ data: product, error: productError }, { data: planData, error: planError }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, status')
      .eq('id', productId)
      .eq('status', 'active')
      .single(),
    supabase
      .from('product_plans')
      .select('id, product_id, name, currency, billing_period, is_active')
      .eq('id', planId)
      .eq('product_id', productId)
      .eq('is_active', true)
      .single(),
  ]);

  if (productError || !product || product.status !== 'active') {
    return response({ error: 'Product not found or unavailable.' }, { status: 404 });
  }
  if (planError || !planData) {
    return response({ error: 'Plan not found or unavailable.' }, { status: 404 });
  }
  const plan = planData as PlanRecord & { product_id: string };

  // The same database quote used by paid providers is authoritative here too.
  // It validates sale windows, coupon dates/limits/product scope and currency.
  const { data: quote, error: quoteError } = await supabase.rpc('quote_product_price', {
    p_plan: planId,
    p_coupon: couponId,
  });
  if (quoteError || !quote) {
    return response({ error: checkoutError(quoteError?.message) }, { status: 409 });
  }

  const q = quote as Record<string, unknown>;
  if (String(q.product_id ?? '') !== productId) {
    return response({ error: 'Selected plan does not belong to this product.' }, { status: 409 });
  }

  const finalAmount = Number(q.final_amount ?? NaN);
  if (!Number.isFinite(finalAmount)) {
    return response({ error: 'Invalid checkout total.' }, { status: 500 });
  }
  if (Math.abs(finalAmount) > 0.000001) {
    return response({ error: 'This order still requires payment.' }, { status: 409 });
  }

  // This lookup is only for response/email behavior. Correctness and duplicate
  // prevention are enforced inside create_priced_order under an advisory lock.
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .eq('plan_id', planId)
    .eq('status', 'completed')
    .eq('amount', 0)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: orderData, error: orderError } = await supabase.rpc('create_priced_order', {
    p_user: user.id,
    p_plan: planId,
    p_coupon: couponId,
    p_expected: 0,
  });

  if (orderError || !orderData) {
    console.error('[create-free-order] Atomic order creation failed:', orderError?.message);
    return response({ error: checkoutError(orderError?.message) }, { status: 409 });
  }

  const order = orderData as Record<string, unknown>;
  const orderId = String(order.id ?? '');
  if (
    !orderId
    || String(order.user_id ?? '') !== user.id
    || String(order.product_id ?? '') !== productId
    || String(order.plan_id ?? '') !== planId
    || String(order.status ?? '') !== 'completed'
    || Number(order.amount ?? NaN) !== 0
  ) {
    console.error('[create-free-order] Atomic order result failed validation.');
    return response({ error: 'Free order could not be validated.' }, { status: 500 });
  }

  let entitlement: { periodEnd: string | null; subscriptionId: string | null };
  try {
    entitlement = await reconcileFreeEntitlements(supabase, {
      orderId,
      userId: user.id,
      productId,
      plan,
    });
  } catch (error: any) {
    console.error('[create-free-order] Entitlement reconciliation failed:', error?.message);
    return response({ error: 'Free access was created but fulfillment needs support.' }, { status: 500 });
  }

  const alreadyOwned = existingOrder?.id === orderId;
  if (!alreadyOwned) {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      if (user.email && (plan.billing_period === 'monthly' || plan.billing_period === 'yearly')) {
        await sendSubscriptionActivated(user.email, {
          customerName: profile?.full_name ?? '',
          productName: product.name,
          planName: plan.name,
          billingPeriod: plan.billing_period,
          amount: 0,
          currency: String(plan.currency || 'USD').toUpperCase(),
          renewalDate: entitlement.periodEnd ?? new Date().toISOString(),
          subscriptionId: entitlement.subscriptionId ?? orderId,
        });
      }

      if (user.email && (plan.billing_period === 'one_time' || plan.billing_period === 'lifetime')) {
        const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://summeca.com').replace(/\/$/, '');
        await sendDownloadLink(user.email, {
          customerName: profile?.full_name ?? '',
          productName: product.name,
          downloadUrl: `${siteUrl}/user-dashboard/downloads`,
          orderId,
        });
      }
    } catch (emailError) {
      console.warn('[create-free-order] Confirmation email failed (non-fatal):', emailError);
    }
  }

  return response({ orderId, alreadyOwned }, { status: alreadyOwned ? 200 : 201 });
}
