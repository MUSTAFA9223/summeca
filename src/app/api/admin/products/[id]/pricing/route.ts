import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getEffectivePrice } from '@/lib/pricing';

const BILLING_PERIODS = new Set(['one_time', 'monthly', 'yearly', 'lifetime']);
const CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CHF', 'HKD', 'SGD']);
const DISCOUNT_TYPES = new Set(['percentage', 'fixed_amount']);

async function requireAdmin() {
  const sessionClient = await createClient();
  const { data: { user }, error } = await sessionClient.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };

  const service = createServiceClient();
  const { data: profile } = await service
    .from('user_profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.is_admin) return { error: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }) };
  return { service, user };
}

function asNumber(value: unknown, field: string, allowNull = false) {
  if (allowNull && (value === null || value === undefined || value === '')) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${field} must be a valid number.`);
  return n;
}

function normalizeDate(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date.');
  return date.toISOString();
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id: productId } = await context.params;

  const [{ data: plans, error: plansError }, { data: coupons, error: couponsError }] = await Promise.all([
    auth.service
      .from('product_plans')
      .select('id, product_id, name, description, price, currency, billing_period, features, is_active, sort_order, sale_price, sale_discount_type, sale_discount_value, sale_starts_at, sale_ends_at, created_at, updated_at')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    auth.service
      .from('coupons')
      .select('id, code, coupon_type, discount_value, max_uses, used_count, valid_from, valid_until, is_active, applies_to, created_at, updated_at')
      .eq('applies_to', productId)
      .order('created_at', { ascending: false }),
  ]);

  if (plansError || couponsError) {
    return NextResponse.json({ error: plansError?.message ?? couponsError?.message ?? 'Failed to load pricing.' }, { status: 500 });
  }

  const now = new Date();
  const pricedPlans = (plans ?? []).map((plan) => ({ ...plan, effective: getEffectivePrice(plan, now) }));
  return NextResponse.json({ plans: pricedPlans, coupons: coupons ?? [] });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id: productId } = await context.params;

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }

  try {
    const action = String(body.action ?? '');

    if (action === 'save_plan') {
      const price = asNumber(body.price, 'Price');
      if (price < 0) throw new Error('Price cannot be negative.');
      const currency = String(body.currency ?? 'USD').toUpperCase();
      if (!CURRENCIES.has(currency)) throw new Error('Unsupported currency.');
      const billingPeriod = String(body.billing_period ?? 'one_time');
      if (!BILLING_PERIODS.has(billingPeriod)) throw new Error('Invalid billing period.');

      const salePrice = asNumber(body.sale_price, 'Sale price', true);
      if (salePrice !== null && (salePrice < 0 || salePrice > price)) throw new Error('Sale price must be between 0 and the regular price.');
      const discountType = body.sale_discount_type ? String(body.sale_discount_type) : null;
      if (discountType && !DISCOUNT_TYPES.has(discountType)) throw new Error('Invalid sale discount type.');
      const discountValue = asNumber(body.sale_discount_value, 'Sale discount', true);
      if (discountValue !== null) {
        if (!discountType) throw new Error('Select a sale discount type.');
        if (discountValue <= 0) throw new Error('Sale discount must be greater than zero.');
        if (discountType === 'percentage' && discountValue > 100) throw new Error('Percentage discount cannot exceed 100%.');
      }

      const saleStartsAt = normalizeDate(body.sale_starts_at);
      const saleEndsAt = normalizeDate(body.sale_ends_at);
      if (saleStartsAt && saleEndsAt && new Date(saleEndsAt) <= new Date(saleStartsAt)) throw new Error('Sale end must be after sale start.');

      const payload = {
        product_id: productId,
        name: String(body.name ?? '').trim() || 'Default',
        description: String(body.description ?? '').trim(),
        price,
        currency,
        billing_period: billingPeriod,
        is_active: body.is_active !== false,
        sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
        sale_price: salePrice,
        sale_discount_type: salePrice !== null ? null : discountType,
        sale_discount_value: salePrice !== null ? null : discountValue,
        sale_starts_at: saleStartsAt,
        sale_ends_at: saleEndsAt,
        updated_at: new Date().toISOString(),
      };

      if (body.id) {
        const { data, error } = await auth.service.from('product_plans').update(payload).eq('id', body.id).eq('product_id', productId).select('*').single();
        if (error) throw error;
        return NextResponse.json({ plan: data, effective: getEffectivePrice(data) });
      }

      const { data, error } = await auth.service.from('product_plans').insert(payload).select('*').single();
      if (error) throw error;
      return NextResponse.json({ plan: data, effective: getEffectivePrice(data) }, { status: 201 });
    }

    if (action === 'toggle_plan') {
      const { data, error } = await auth.service
        .from('product_plans')
        .update({ is_active: Boolean(body.is_active), updated_at: new Date().toISOString() })
        .eq('id', body.id)
        .eq('product_id', productId)
        .select('*')
        .single();
      if (error) throw error;
      return NextResponse.json({ plan: data });
    }

    if (action === 'delete_plan') {
      const { error } = await auth.service.from('product_plans').delete().eq('id', body.id).eq('product_id', productId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'save_coupon') {
      const code = String(body.code ?? '').trim().toUpperCase();
      if (!code) throw new Error('Coupon code is required.');
      const couponType = String(body.coupon_type ?? 'percentage');
      if (!DISCOUNT_TYPES.has(couponType)) throw new Error('Invalid coupon type.');
      const discountValue = asNumber(body.discount_value, 'Discount value');
      if (discountValue <= 0) throw new Error('Discount must be greater than zero.');
      if (couponType === 'percentage' && discountValue > 100) throw new Error('Percentage discount cannot exceed 100%.');
      const validFrom = normalizeDate(body.valid_from) ?? new Date().toISOString();
      const validUntil = normalizeDate(body.valid_until);
      if (validUntil && new Date(validUntil) <= new Date(validFrom)) throw new Error('Coupon expiration must be after its start date.');
      const maxUses = body.max_uses === null || body.max_uses === undefined || body.max_uses === '' ? null : Math.max(1, Math.trunc(asNumber(body.max_uses, 'Max uses')));

      const payload = {
        code,
        coupon_type: couponType,
        discount_value: discountValue,
        max_uses: maxUses,
        valid_from: validFrom,
        valid_until: validUntil,
        is_active: body.is_active !== false,
        applies_to: productId,
        updated_at: new Date().toISOString(),
      };

      if (body.id) {
        const { data, error } = await auth.service.from('coupons').update(payload).eq('id', body.id).eq('applies_to', productId).select('*').single();
        if (error) throw error;
        return NextResponse.json({ coupon: data });
      }

      const { data, error } = await auth.service.from('coupons').insert(payload).select('*').single();
      if (error) throw error;
      return NextResponse.json({ coupon: data }, { status: 201 });
    }

    if (action === 'toggle_coupon') {
      const { data, error } = await auth.service
        .from('coupons')
        .update({ is_active: Boolean(body.is_active), updated_at: new Date().toISOString() })
        .eq('id', body.id)
        .eq('applies_to', productId)
        .select('*')
        .single();
      if (error) throw error;
      return NextResponse.json({ coupon: data });
    }

    if (action === 'delete_coupon') {
      const { error } = await auth.service.from('coupons').delete().eq('id', body.id).eq('applies_to', productId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown pricing action.' }, { status: 400 });
  } catch (error: any) {
    const message = error?.code === '23505' ? 'Coupon code or other unique value already exists.' : error?.message || 'Pricing update failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
