import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEffectivePrice } from '@/lib/pricing';

const BILLING_PERIODS = new Set(['one_time', 'monthly', 'yearly', 'lifetime']);
const CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CHF', 'HKD', 'SGD']);
const DISCOUNT_TYPES = new Set(['percentage', 'fixed_amount']);
const MAX_MONEY = 99_999_999;

type AdminService = Awaited<ReturnType<typeof createClient>>;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

async function requireAdmin() {
  const sessionClient = await createClient();
  const { data: { user }, error } = await sessionClient.auth.getUser();
  if (error || !user) return { error: noStoreJson({ error: 'Authentication required.' }, { status: 401 }) };

  const { data: isAdmin, error: adminError } = await sessionClient.rpc('is_admin');
  if (adminError) {
    console.error('[admin/products/pricing] Admin check failed:', adminError.message);
    return { error: noStoreJson({ error: 'Could not verify admin access.' }, { status: 500 }) };
  }
  if (!isAdmin) return { error: noStoreJson({ error: 'Admin access required.' }, { status: 403 }) };

  return { service: sessionClient, user };
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function normalizeFeatures(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .map((feature) => cleanText(feature, 180))
      .filter(Boolean)
      .slice(0, 50),
  ));
}

function asNumber(value: unknown, field: string): number;
function asNumber(value: unknown, field: string, allowNull: false): number;
function asNumber(value: unknown, field: string, allowNull: true): number | null;
function asNumber(value: unknown, field: string, allowNull = false): number | null {
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

function validateMoney(value: number, currency: string, field: string) {
  if (value < 0 || value > MAX_MONEY) throw new Error(`${field} is outside the supported range.`);
  const decimals = currency === 'JPY' ? 0 : 2;
  const factor = 10 ** decimals;
  if (Math.abs(value * factor - Math.round(value * factor)) > 1e-7) {
    throw new Error(`${field} must use at most ${decimals} decimal places for ${currency}.`);
  }
}

async function activePlanCurrencies(service: AdminService, productId: string) {
  const { data, error } = await service
    .from('product_plans')
    .select('currency')
    .eq('product_id', productId)
    .eq('is_active', true);
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((row) => String(row.currency).toUpperCase())));
}

async function resolveCouponCurrency(
  service: AdminService,
  productId: string,
  couponType: string,
  requested: unknown,
) {
  const requestedCurrency = cleanText(requested, 3).toUpperCase();
  if (requestedCurrency && !CURRENCIES.has(requestedCurrency)) throw new Error('Unsupported coupon currency.');

  const currencies = await activePlanCurrencies(service, productId);
  if (couponType === 'fixed_amount') {
    if (requestedCurrency) {
      if (currencies.length > 0 && !currencies.includes(requestedCurrency)) {
        throw new Error('Fixed coupon currency must match an active plan currency for this product.');
      }
      return requestedCurrency;
    }
    if (currencies.length === 1) return currencies[0];
    if (currencies.length === 0) throw new Error('Add an active pricing plan before creating a fixed-amount coupon.');
    throw new Error('This product has multiple plan currencies. Select a currency for the fixed-amount coupon.');
  }

  return requestedCurrency || currencies[0] || 'USD';
}

async function productIsActive(service: AdminService, productId: string) {
  const { data, error } = await service
    .from('products')
    .select('status')
    .eq('id', productId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Product not found.');
  return data.status === 'active';
}

async function assertCanDisablePlan(service: AdminService, productId: string, planId: string) {
  if (!(await productIsActive(service, productId))) return;
  const { count, error } = await service
    .from('product_plans')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
    .eq('is_active', true)
    .neq('id', planId);
  if (error) throw error;
  if (!count) throw new Error('A published product must keep at least one active pricing plan. Draft the product before disabling its last plan.');
}

async function assertPlanUnused(service: AdminService, planId: string) {
  const [{ count: orderCount, error: orderError }, { count: subscriptionCount, error: subscriptionError }] = await Promise.all([
    service.from('orders').select('id', { count: 'exact', head: true }).eq('plan_id', planId),
    service.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan_id', planId),
  ]);
  if (orderError || subscriptionError) throw orderError ?? subscriptionError;
  if ((orderCount ?? 0) > 0 || (subscriptionCount ?? 0) > 0) {
    throw new Error('This plan has purchase history. Deactivate it instead of deleting it.');
  }
}

async function assertCouponUnused(service: AdminService, couponId: string) {
  const { count, error } = await service
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('coupon_id', couponId);
  if (error) throw error;
  if ((count ?? 0) > 0) throw new Error('This coupon has purchase history. Deactivate it instead of deleting it.');
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
      .select('id, code, coupon_type, discount_value, currency, max_uses, used_count, valid_from, valid_until, is_active, applies_to, created_at, updated_at')
      .eq('applies_to', productId)
      .order('created_at', { ascending: false }),
  ]);

  if (plansError || couponsError) {
    return noStoreJson({ error: plansError?.message ?? couponsError?.message ?? 'Failed to load pricing.' }, { status: 500 });
  }

  const now = new Date();
  const pricedPlans = (plans ?? []).map((plan) => ({ ...plan, effective: getEffectivePrice(plan, now) }));
  return noStoreJson({ plans: pricedPlans, coupons: coupons ?? [] });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id: productId } = await context.params;

  let body: any;
  try { body = await request.json(); } catch { return noStoreJson({ error: 'Invalid request body.' }, { status: 400 }); }

  try {
    const action = String(body.action ?? '');

    if (action === 'save_plan') {
      const price = asNumber(body.price, 'Price');
      const currency = cleanText(body.currency || 'USD', 3).toUpperCase();
      if (!CURRENCIES.has(currency)) throw new Error('Unsupported currency.');
      validateMoney(price, currency, 'Price');

      const billingPeriod = String(body.billing_period ?? 'one_time');
      if (!BILLING_PERIODS.has(billingPeriod)) throw new Error('Invalid billing period.');

      const salePrice = asNumber(body.sale_price, 'Sale price', true);
      if (salePrice !== null) {
        validateMoney(salePrice, currency, 'Sale price');
        if (salePrice > price) throw new Error('Sale price cannot exceed the regular price.');
      }

      const discountType = body.sale_discount_type ? String(body.sale_discount_type) : null;
      if (discountType && !DISCOUNT_TYPES.has(discountType)) throw new Error('Invalid sale discount type.');
      const discountValue = asNumber(body.sale_discount_value, 'Sale discount', true);
      if (salePrice === null && discountType && discountValue === null) throw new Error('Enter a sale discount value.');
      if (discountValue !== null) {
        if (!discountType) throw new Error('Select a sale discount type.');
        if (discountValue <= 0) throw new Error('Sale discount must be greater than zero.');
        if (discountType === 'percentage' && discountValue > 100) throw new Error('Percentage discount cannot exceed 100%.');
        if (discountType === 'fixed_amount') {
          validateMoney(discountValue, currency, 'Sale discount');
          if (discountValue > price) throw new Error('Fixed sale discount cannot exceed the regular price.');
        }
      }

      const saleStartsAt = normalizeDate(body.sale_starts_at);
      const saleEndsAt = normalizeDate(body.sale_ends_at);
      if (saleStartsAt && saleEndsAt && new Date(saleEndsAt) <= new Date(saleStartsAt)) throw new Error('Sale end must be after sale start.');

      const id = cleanText(body.id, 100);
      const isActive = body.is_active !== false;
      if (id && !isActive) await assertCanDisablePlan(auth.service, productId, id);

      const payload = {
        product_id: productId,
        name: cleanText(body.name, 120) || 'Default',
        description: cleanText(body.description, 1200),
        price,
        currency,
        billing_period: billingPeriod,
        is_active: isActive,
        sort_order: Math.max(-10_000, Math.min(10_000, Math.trunc(Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0))),
        sale_price: salePrice,
        sale_discount_type: salePrice !== null ? null : discountType,
        sale_discount_value: salePrice !== null ? null : discountValue,
        sale_starts_at: saleStartsAt,
        sale_ends_at: saleEndsAt,
        ...(Array.isArray(body.features) ? { features: normalizeFeatures(body.features) } : {}),
        updated_at: new Date().toISOString(),
      };

      if (id) {
        const { data, error } = await auth.service.from('product_plans').update(payload).eq('id', id).eq('product_id', productId).select('*').single();
        if (error) throw error;
        return noStoreJson({ plan: data, effective: getEffectivePrice(data) });
      }

      const { data, error } = await auth.service.from('product_plans').insert(payload).select('*').single();
      if (error) throw error;
      return noStoreJson({ plan: data, effective: getEffectivePrice(data) }, { status: 201 });
    }

    if (action === 'toggle_plan') {
      const planId = cleanText(body.id, 100);
      if (!planId) throw new Error('Plan id is required.');
      const nextActive = Boolean(body.is_active);
      if (!nextActive) await assertCanDisablePlan(auth.service, productId, planId);

      const { data, error } = await auth.service
        .from('product_plans')
        .update({ is_active: nextActive, updated_at: new Date().toISOString() })
        .eq('id', planId)
        .eq('product_id', productId)
        .select('*')
        .single();
      if (error) throw error;
      return noStoreJson({ plan: data });
    }

    if (action === 'delete_plan') {
      const planId = cleanText(body.id, 100);
      if (!planId) throw new Error('Plan id is required.');

      const { data: plan, error: planError } = await auth.service
        .from('product_plans')
        .select('id, is_active')
        .eq('id', planId)
        .eq('product_id', productId)
        .maybeSingle();
      if (planError) throw planError;
      if (!plan) throw new Error('Plan not found.');
      if (plan.is_active) await assertCanDisablePlan(auth.service, productId, planId);
      await assertPlanUnused(auth.service, planId);

      const { error } = await auth.service.from('product_plans').delete().eq('id', planId).eq('product_id', productId);
      if (error) throw error;
      return noStoreJson({ success: true });
    }

    if (action === 'save_coupon') {
      const code = cleanText(body.code, 40).toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code)) {
        throw new Error('Coupon code must be 2–40 characters using letters, numbers, hyphens or underscores.');
      }

      const couponType = String(body.coupon_type ?? 'percentage');
      if (!DISCOUNT_TYPES.has(couponType)) throw new Error('Invalid coupon type.');
      const couponCurrency = await resolveCouponCurrency(auth.service, productId, couponType, body.currency);

      const discountValue = asNumber(body.discount_value, 'Discount value');
      if (discountValue <= 0) throw new Error('Discount must be greater than zero.');
      if (couponType === 'percentage' && discountValue > 100) throw new Error('Percentage discount cannot exceed 100%.');
      if (couponType === 'fixed_amount') validateMoney(discountValue, couponCurrency, 'Discount value');

      const validFrom = normalizeDate(body.valid_from) ?? new Date().toISOString();
      const validUntil = normalizeDate(body.valid_until);
      if (validUntil && new Date(validUntil) <= new Date(validFrom)) throw new Error('Coupon expiration must be after its start date.');
      const maxUses = body.max_uses === null || body.max_uses === undefined || body.max_uses === ''
        ? null
        : Math.max(1, Math.min(10_000_000, Math.trunc(asNumber(body.max_uses, 'Max uses'))));

      const payload = {
        code,
        coupon_type: couponType,
        discount_value: discountValue,
        currency: couponCurrency,
        max_uses: maxUses,
        valid_from: validFrom,
        valid_until: validUntil,
        is_active: body.is_active !== false,
        applies_to: productId,
        updated_at: new Date().toISOString(),
      };

      const couponId = cleanText(body.id, 100);
      if (couponId) {
        const { data, error } = await auth.service.from('coupons').update(payload).eq('id', couponId).eq('applies_to', productId).select('*').single();
        if (error) throw error;
        return noStoreJson({ coupon: data });
      }

      const { data, error } = await auth.service.from('coupons').insert(payload).select('*').single();
      if (error) throw error;
      return noStoreJson({ coupon: data }, { status: 201 });
    }

    if (action === 'toggle_coupon') {
      const couponId = cleanText(body.id, 100);
      if (!couponId) throw new Error('Coupon id is required.');
      const { data, error } = await auth.service
        .from('coupons')
        .update({ is_active: Boolean(body.is_active), updated_at: new Date().toISOString() })
        .eq('id', couponId)
        .eq('applies_to', productId)
        .select('*')
        .single();
      if (error) throw error;
      return noStoreJson({ coupon: data });
    }

    if (action === 'delete_coupon') {
      const couponId = cleanText(body.id, 100);
      if (!couponId) throw new Error('Coupon id is required.');
      await assertCouponUnused(auth.service, couponId);
      const { error } = await auth.service.from('coupons').delete().eq('id', couponId).eq('applies_to', productId);
      if (error) throw error;
      return noStoreJson({ success: true });
    }

    return noStoreJson({ error: 'Unknown pricing action.' }, { status: 400 });
  } catch (error: any) {
    const message = error?.code === '23505' ? 'Coupon code or other unique value already exists.' : error?.message || 'Pricing update failed.';
    return noStoreJson({ error: message }, { status: 400 });
  }
}
