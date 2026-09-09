import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

interface QuoteRequest {
  productId?: string;
  planId?: string;
  couponCode?: string | null;
}

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function POST(request: NextRequest) {
  let body: QuoteRequest;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: 'Invalid request body.' }, { status: 400 });
  }

  const productId = body.productId?.trim();
  const planId = body.planId?.trim();
  const couponCode = body.couponCode?.trim().toUpperCase() || null;

  if (!productId || !planId) {
    return noStoreJson({ error: 'productId and planId are required.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  let couponId: string | null = null;
  let couponDetails: {
    id: string;
    code: string;
    coupon_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    applies_to: string | null;
  } | null = null;

  if (couponCode) {
    const { data: coupon, error: couponLookupError } = await supabase
      .from('coupons')
      .select('id, code, coupon_type, discount_value, applies_to')
      .eq('code', couponCode)
      .eq('is_active', true)
      .maybeSingle();

    if (couponLookupError || !coupon) {
      return noStoreJson({ error: 'Coupon code not found or unavailable.' }, { status: 409 });
    }

    couponId = coupon.id;
    couponDetails = {
      id: coupon.id,
      code: coupon.code,
      coupon_type: coupon.coupon_type,
      discount_value: Number(coupon.discount_value),
      applies_to: coupon.applies_to,
    };
  }

  const { data: quote, error: quoteError } = await supabase.rpc('quote_product_price', {
    p_plan: planId,
    p_coupon: couponId,
  });

  if (quoteError || !quote) {
    const message = quoteError?.message?.includes('Coupon unavailable')
      ? 'This coupon is not valid for the selected product or has expired.'
      : quoteError?.message?.includes('Plan unavailable')
        ? 'This plan is no longer available.'
        : 'Unable to calculate the checkout total.';
    return noStoreJson({ error: message }, { status: 409 });
  }

  const quotedProductId = String((quote as Record<string, unknown>).product_id ?? '');
  if (quotedProductId !== productId) {
    return noStoreJson({ error: 'Selected plan does not belong to this product.' }, { status: 409 });
  }

  const q = quote as Record<string, unknown>;
  return noStoreJson({
    couponId,
    coupon: couponDetails,
    quote: {
      regularPrice: Number(q.regular_price ?? 0),
      price: Number(q.price ?? 0),
      discountAmount: Number(q.discount_amount ?? 0),
      finalAmount: Number(q.final_amount ?? 0),
      currency: String(q.currency ?? 'USD'),
      billingPeriod: String(q.billing_period ?? ''),
    },
  });
}
