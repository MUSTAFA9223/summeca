import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getEffectivePrice } from '@/lib/pricing';
import { sendDownloadLink, sendSubscriptionActivated } from '@/lib/email/sendEmail';

type ServiceClient = ReturnType<typeof createServiceClient>;

type PlanRecord = {
  id: string;
  name: string;
  price: number | string;
  currency: string;
  billing_period: 'one_time' | 'monthly' | 'yearly' | 'lifetime';
  sale_price: number | string | null;
  sale_discount_type: string | null;
  sale_discount_value: number | string | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
};

function response(body: unknown, init?: ResponseInit) {
  const result = NextResponse.json(body, init);
  result.headers.set('Cache-Control', 'private, no-store');
  return result;
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

async function ensureFreeEntitlements(
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

  if (plan.billing_period === 'monthly' || plan.billing_period === 'yearly' || plan.billing_period === 'lifetime') {
    const { data: existingSubscription, error: lookupError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();
    if (lookupError) throw lookupError;

    if (!existingSubscription) {
      const { error } = await supabase.from('subscriptions').insert({
        user_id: userId,
        product_id: productId,
        plan_id: plan.id,
        order_id: orderId,
        status: 'active',
        current_period_start: now,
        current_period_end: periodEnd,
        payment_provider: 'manual',
        metadata: { provider: 'manual', payment_method_type: 'free' },
      });
      if (error && error.code !== '23505') throw error;
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

  return periodEnd;
}

export async function POST(request: NextRequest) {
  const sessionClient = await createClient();
  const {
    data: { user },
    error: authError,
  } = await sessionClient.auth.getUser();

  if (authError || !user) {
    return response({ error: 'Authentication required.' }, { status: 401 });
  }

  let body: { productId?: string; planId?: string };
  try {
    body = await request.json();
  } catch {
    return response({ error: 'Invalid request body.' }, { status: 400 });
  }

  const productId = body.productId?.trim();
  const planId = body.planId?.trim();
  if (!productId || !planId) {
    return response({ error: 'productId and planId are required.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, status')
    .eq('id', productId)
    .eq('status', 'active')
    .single();

  if (productError || !product) {
    return response({ error: 'Product not found or unavailable.' }, { status: 404 });
  }

  const { data: planData, error: planError } = await supabase
    .from('product_plans')
    .select('id, name, price, currency, billing_period, is_active, sale_price, sale_discount_type, sale_discount_value, sale_starts_at, sale_ends_at')
    .eq('id', planId)
    .eq('product_id', productId)
    .eq('is_active', true)
    .single();

  if (planError || !planData) {
    return response({ error: 'Plan not found or unavailable.' }, { status: 404 });
  }

  const plan = planData as PlanRecord;
  let pricing;
  try {
    pricing = getEffectivePrice(plan);
  } catch {
    return response({ error: 'Invalid product price.' }, { status: 500 });
  }

  if (pricing.finalPrice !== 0) {
    return response({ error: 'This plan is not free.' }, { status: 409 });
  }

  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .eq('plan_id', planId)
    .eq('status', 'completed')
    .eq('amount', 0)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingOrder) {
    try {
      await ensureFreeEntitlements(supabase, {
        orderId: existingOrder.id,
        userId: user.id,
        productId,
        plan,
      });
      return response({ orderId: existingOrder.id, alreadyOwned: true });
    } catch (error: any) {
      console.error('[create-free-order] Existing entitlement reconciliation failed:', error?.message);
      return response({ error: 'Free access exists but fulfillment needs support.' }, { status: 500 });
    }
  }

  const now = new Date().toISOString();
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      product_id: productId,
      plan_id: planId,
      coupon_id: null,
      status: 'pending',
      amount: 0,
      currency: String(plan.currency || 'USD').toUpperCase(),
      discount_amount: pricing.discountAmount,
      provider_payment_ref: '',
      receipt_url: '',
      metadata: {
        provider: 'manual',
        payment_method_type: 'free',
        product_name: product.name,
        plan_name: plan.name,
        billing_period: plan.billing_period,
        regular_price: pricing.regularPrice,
        sale_price: pricing.salePrice,
        sale_discount_amount: pricing.discountAmount,
      },
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (orderError || !order) {
    console.error('[create-free-order] Order creation failed:', orderError?.message);
    return response({ error: 'Failed to create free order.' }, { status: 500 });
  }

  let periodEnd: string | null = null;
  try {
    periodEnd = await ensureFreeEntitlements(supabase, {
      orderId: order.id,
      userId: user.id,
      productId,
      plan,
    });
  } catch (error: any) {
    console.error('[create-free-order] Fulfillment failed:', error?.message);
    await supabase
      .from('orders')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', 'pending');
    return response({ error: 'Failed to grant free access.' }, { status: 500 });
  }

  const { data: completedOrder, error: completionError } = await supabase
    .from('orders')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', order.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (completionError || !completedOrder) {
    console.error('[create-free-order] Order completion failed:', completionError?.message);
    return response({ error: 'Access was created but the order could not be finalized.' }, { status: 500 });
  }

  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (user.email && (plan.billing_period === 'monthly' || plan.billing_period === 'yearly' || plan.billing_period === 'lifetime')) {
      await sendSubscriptionActivated(user.email, {
        customerName: profile?.full_name ?? '',
        productName: product.name,
        planName: plan.name,
        billingPeriod: plan.billing_period,
        amount: 0,
        currency: String(plan.currency || 'USD').toUpperCase(),
        renewalDate: periodEnd ?? now,
        subscriptionId: order.id,
      });
    }

    if (user.email && (plan.billing_period === 'one_time' || plan.billing_period === 'lifetime')) {
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://summeca.com').replace(/\/$/, '');
      await sendDownloadLink(user.email, {
        customerName: profile?.full_name ?? '',
        productName: product.name,
        downloadUrl: `${siteUrl}/user-dashboard/downloads`,
        orderId: order.id,
      });
    }
  } catch (emailError) {
    console.warn('[create-free-order] Confirmation email failed (non-fatal):', emailError);
  }

  return response({ orderId: order.id, alreadyOwned: false }, { status: 201 });
}
