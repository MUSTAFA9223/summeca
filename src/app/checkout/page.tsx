'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Bitcoin,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Info,
  Loader2,
  Lock,
  Package,
  RefreshCw,
  Shield,
  ShoppingCart,
  Tag,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { trackCheckoutStarted } from '@/lib/analytics';
import { getEffectivePrice } from '@/lib/pricing';

interface ProductPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_period: 'one_time' | 'monthly' | 'yearly' | 'lifetime';
  features: string[];
  is_active: boolean;
  sale_price: number | null;
  sale_discount_type: 'percentage' | 'fixed_amount' | null;
  sale_discount_value: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  short_desc: string;
  category: string;
  thumbnail_url: string;
}

interface CartItem {
  product: Product;
  plan: ProductPlan;
}

interface Coupon {
  id: string;
  code: string;
  coupon_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  applies_to: string | null;
}

type ProviderStatus = 'checking' | 'available' | 'unavailable';
type CheckoutMethod = 'payoneer' | 'crypto';
type CryptoPaymentMethod =
  | 'crypto_usdt_trc20'
  | 'crypto_usdt_erc20'
  | 'crypto_usdc_polygon'
  | 'crypto_btc'
  | 'crypto_eth';

const cryptoOptions: Array<{ value: CryptoPaymentMethod; label: string; detail: string }> = [
  { value: 'crypto_usdt_trc20', label: 'USDT', detail: 'TRC20 · Recommended' },
  { value: 'crypto_usdc_polygon', label: 'USDC', detail: 'Polygon' },
  { value: 'crypto_btc', label: 'BTC', detail: 'Bitcoin' },
  { value: 'crypto_eth', label: 'ETH', detail: 'Ethereum' },
  { value: 'crypto_usdt_erc20', label: 'USDT', detail: 'ERC20' },
];

const categoryLabel: Record<string, string> = {
  ai_tool: 'AI Tool',
  api: 'API',
  plugin: 'Plugin',
  template: 'Template',
  dataset: 'Dataset',
  course: 'Course',
  other: 'Other',
};

const billingPeriodLabel: Record<string, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  yearly: 'Yearly',
  lifetime: 'Lifetime',
};

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function CheckoutSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-pulse">
      <div className="lg:col-span-3 space-y-4">
        <div className="h-8 bg-secondary/60 rounded-xl w-48" />
        <div className="h-40 bg-secondary/40 rounded-2xl" />
        <div className="h-24 bg-secondary/40 rounded-2xl" />
        <div className="h-48 bg-secondary/40 rounded-2xl" />
      </div>
      <div className="lg:col-span-2">
        <div className="h-72 bg-secondary/40 rounded-2xl" />
      </div>
    </div>
  );
}

function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const productIdParam = searchParams.get('product_id');
  const planIdParam = searchParams.get('plan_id');

  const [cartItem, setCartItem] = useState<CartItem | null>(null);
  const [allPlans, setAllPlans] = useState<ProductPlan[]>([]);
  const [billingFrequency, setBillingFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [payoneerStatus, setPayoneerStatus] = useState<ProviderStatus>('checking');
  const [cryptoStatus, setCryptoStatus] = useState<ProviderStatus>('checking');
  const [checkoutMethod, setCheckoutMethod] = useState<CheckoutMethod>('payoneer');
  const [cryptoMethod, setCryptoMethod] = useState<CryptoPaymentMethod>('crypto_usdt_trc20');
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutTracked, setCheckoutTracked] = useState(false);

  useEffect(() => {
    async function checkProviderStatus(url: string, setter: (status: ProviderStatus) => void) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
          setter('unavailable');
          return;
        }
        const data = (await res.json()) as { available?: boolean };
        setter(data.available === true ? 'available' : 'unavailable');
      } catch {
        setter('unavailable');
      }
    }

    void checkProviderStatus('/api/payment/payoneer-status', setPayoneerStatus);
    void checkProviderStatus('/api/payment/crypto-config-status', setCryptoStatus);
  }, []);

  useEffect(() => {
    if (payoneerStatus === 'unavailable' && cryptoStatus === 'available') {
      setCheckoutMethod('crypto');
    }
  }, [cryptoStatus, payoneerStatus]);

  const loadCartItem = useCallback(async () => {
    if (!productIdParam) {
      setPageError('No product selected. Please go back and choose a product.');
      setPageLoading(false);
      return;
    }

    setPageLoading(true);
    setPageError('');
    try {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, slug, short_desc, category, thumbnail_url')
        .eq('id', productIdParam)
        .eq('status', 'active')
        .single();

      if (productError || !product) {
        setPageError('Product not found or unavailable.');
        return;
      }

      const { data: plans, error: plansError } = await supabase
        .from('product_plans')
        .select('id, name, description, price, currency, billing_period, features, is_active, sale_price, sale_discount_type, sale_discount_value, sale_starts_at, sale_ends_at')
        .eq('product_id', productIdParam)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (plansError || !plans?.length) {
        setPageError('No active plans found for this product.');
        return;
      }

      const typedPlans = plans as ProductPlan[];
      setAllPlans(typedPlans);
      const selectedPlan = typedPlans.find((plan) => plan.id === planIdParam) ?? typedPlans[0];
      setBillingFrequency(selectedPlan.billing_period === 'yearly' ? 'yearly' : 'monthly');
      setCartItem({ product: product as Product, plan: selectedPlan });
    } catch {
      setPageError('Failed to load checkout details.');
    } finally {
      setPageLoading(false);
    }
  }, [planIdParam, productIdParam, supabase]);

  useEffect(() => {
    if (!authLoading) void loadCartItem();
  }, [authLoading, loadCartItem]);

  const pricing = useMemo(() => {
    if (!cartItem) return null;
    try {
      return getEffectivePrice(cartItem.plan);
    } catch {
      const price = Number(cartItem.plan.price || 0);
      return {
        regularPrice: price,
        salePrice: null,
        finalPrice: price,
        discountAmount: 0,
        discountPercent: 0,
        onSale: false,
      };
    }
  }, [cartItem]);

  const basePrice = Number(pricing?.finalPrice ?? 0);
  const regularPrice = Number(pricing?.regularPrice ?? basePrice);
  const currency = cartItem?.plan.currency ?? 'USD';
  const couponDiscountAmount = appliedCoupon
    ? appliedCoupon.coupon_type === 'percentage'
      ? Math.min(basePrice, Math.max(0, (basePrice * Number(appliedCoupon.discount_value)) / 100))
      : Math.min(basePrice, Math.max(0, Number(appliedCoupon.discount_value)))
    : 0;
  const finalAmount = Number(Math.max(0, basePrice - couponDiscountAmount).toFixed(2));
  const isFreeOrder = finalAmount === 0;
  const selectedProviderStatus = checkoutMethod === 'payoneer' ? payoneerStatus : cryptoStatus;

  useEffect(() => {
    if (cartItem && pricing && !checkoutTracked) {
      trackCheckoutStarted({
        id: cartItem.product.id,
        name: cartItem.product.name,
        price: pricing.finalPrice,
        planName: cartItem.plan.name,
      });
      setCheckoutTracked(true);
    }
  }, [cartItem, checkoutTracked, pricing]);

  const handleBillingSwitch = (frequency: 'monthly' | 'yearly') => {
    if (!cartItem) return;
    const matchingPlan = allPlans.find(
      (plan) => plan.billing_period === (frequency === 'monthly' ? 'monthly' : 'yearly'),
    );
    if (!matchingPlan) return;

    setBillingFrequency(frequency);
    setCartItem((current) => (current ? { ...current, plan: matchingPlan } : current));
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !cartItem) return;

    setCouponLoading(true);
    setCouponError('');
    setAppliedCoupon(null);

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('id, code, coupon_type, discount_value, applies_to, max_uses, used_count, valid_from, valid_until, is_active')
        .ilike('code', couponCode.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        setCouponError('Coupon code not found or inactive.');
        return;
      }

      const now = new Date();
      if (data.valid_from && new Date(data.valid_from) > now) {
        setCouponError('This coupon is not active yet.');
        return;
      }
      if (data.valid_until && new Date(data.valid_until) < now) {
        setCouponError('This coupon has expired.');
        return;
      }
      if (data.max_uses !== null && data.used_count >= data.max_uses) {
        setCouponError('This coupon has reached its usage limit.');
        return;
      }
      if (data.applies_to && data.applies_to !== cartItem.product.id) {
        setCouponError('This coupon is not valid for the selected product.');
        return;
      }

      setAppliedCoupon(data as Coupon);
    } catch {
      setCouponError('Failed to validate coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      const next = new URLSearchParams();
      if (productIdParam) next.set('product_id', productIdParam);
      if (cartItem?.plan.id) next.set('plan_id', cartItem.plan.id);
      const checkoutPath = `/checkout?${next.toString()}`;
      router.push(`/sign-up-login-screen?next=${encodeURIComponent(checkoutPath)}`);
      return;
    }
    if (!cartItem) return;
    if (!isFreeOrder && selectedProviderStatus !== 'available') return;

    setCheckoutSubmitting(true);
    setPageError('');

    try {
      const endpoint = isFreeOrder
        ? '/api/payment/create-free-order'
        : checkoutMethod === 'crypto'
          ? '/api/payment/create-crypto-session'
          : '/api/payment/create-payoneer-session';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: cartItem.product.id,
          planId: cartItem.plan.id,
          couponId: appliedCoupon?.id ?? null,
          ...(checkoutMethod === 'crypto' && !isFreeOrder ? { paymentMethodType: cryptoMethod } : {}),
        }),
      });

      const data = (await res.json()) as {
        orderId?: string;
        redirectUrl?: string;
        providerPaymentRef?: string;
        paymentAddress?: string;
        cryptoAmount?: string;
        error?: string;
      };

      if (!res.ok || !data.orderId) {
        setPageError(data.error ?? 'Failed to start checkout. Please try again.');
        return;
      }

      if (isFreeOrder) {
        router.push(`/checkout/success?order_id=${encodeURIComponent(data.orderId)}&free=1`);
        return;
      }

      if (checkoutMethod === 'crypto') {
        if (!data.providerPaymentRef || !data.paymentAddress || !data.cryptoAmount) {
          setPageError('Cryptocurrency provider did not return complete payment details.');
          return;
        }
        router.push(`/checkout/crypto?order_id=${encodeURIComponent(data.orderId)}`);
        return;
      }

      if (!data.redirectUrl) {
        setPageError('Payment provider did not return a checkout URL.');
        return;
      }
      window.location.assign(data.redirectUrl);
    } catch {
      setPageError('Failed to start checkout. Please try again.');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const hasMonthly = allPlans.some((plan) => plan.billing_period === 'monthly');
  const hasYearly = allPlans.some((plan) => plan.billing_period === 'yearly');
  const monthlyPlan = allPlans.find((plan) => plan.billing_period === 'monthly');
  const yearlyPlan = allPlans.find((plan) => plan.billing_period === 'yearly');
  const monthlyEffective = monthlyPlan ? getEffectivePrice(monthlyPlan).finalPrice : null;
  const yearlyEffective = yearlyPlan ? getEffectivePrice(yearlyPlan).finalPrice : null;
  const yearlySavings = monthlyEffective !== null && yearlyEffective !== null && monthlyEffective > 0
    ? Math.max(0, Math.round(((monthlyEffective * 12 - yearlyEffective) / (monthlyEffective * 12)) * 100))
    : 0;

  const providerBadge = (status: ProviderStatus) => (
    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
      status === 'available'
        ? 'bg-success/10 text-success'
        : status === 'checking'
          ? 'bg-secondary text-muted-foreground'
          : 'bg-warning/10 text-warning'
    }`}>
      {status === 'available' ? 'Available' : status === 'checking' ? 'Checking…' : 'Not configured'}
    </span>
  );

  return (
    <div className="pt-24 pb-20 max-w-screen-xl mx-auto px-6 lg:px-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/products" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft size={14} /> Products
        </Link>
        <ChevronRight size={13} />
        <span className="text-foreground font-600">Checkout</span>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-teal flex items-center justify-center shadow-sm">
            <ShoppingCart size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-foreground">Secure Checkout</h1>
            <p className="text-sm text-muted-foreground">
              {isFreeOrder ? 'No payment is required for this order.' : 'Choose Payoneer or cryptocurrency. Payment is verified server-side.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 p-3 bg-success/5 border border-success/15 rounded-xl">
          <Shield size={14} className="text-success" />
          <p className="text-xs text-secondary-foreground">
            SUMMECA recalculates product pricing, sale windows and coupons on the server before granting access or creating payment.
          </p>
        </div>
      </div>

      {pageLoading && <CheckoutSkeleton />}

      {!pageLoading && !cartItem && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle size={30} className="text-danger mb-3" />
          <p className="font-600 text-foreground">{pageError || 'Checkout could not be loaded.'}</p>
          <Link href="/products" className="btn-secondary text-sm mt-4 px-5 py-2">Browse Products</Link>
        </div>
      )}

      {!pageLoading && cartItem && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3 space-y-5">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-primary/5 to-accent/5 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-700 text-foreground flex items-center gap-2">
                  <Package size={15} className="text-primary" /> Your Order
                </h2>
              </div>
              <div className="p-5 flex items-start gap-4">
                {cartItem.product.thumbnail_url ? (
                  <img
                    src={cartItem.product.thumbnail_url}
                    alt={`${cartItem.product.name} product thumbnail`}
                    className="w-16 h-16 rounded-xl object-cover border border-border flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Zap size={22} className="text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-primary font-600">{categoryLabel[cartItem.product.category] || 'Other'}</span>
                  <h3 className="text-base font-700 text-foreground mt-1">{cartItem.product.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{cartItem.product.short_desc}</p>
                  <div className="mt-2 text-xs text-secondary-foreground">
                    {cartItem.plan.name} · {billingPeriodLabel[cartItem.plan.billing_period]}
                  </div>
                </div>
                <div className="text-right">
                  {pricing?.onSale && (
                    <div className="text-xs text-muted-foreground line-through">{formatCurrency(regularPrice, currency)}</div>
                  )}
                  <div className="font-800 text-foreground">{basePrice === 0 ? 'Free' : formatCurrency(basePrice, currency)}</div>
                </div>
              </div>
            </div>

            {hasMonthly && hasYearly && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-700 flex items-center gap-2"><RefreshCw size={15} /> Billing Frequency</h2>
                </div>
                <div className="p-5 flex gap-2">
                  <button
                    onClick={() => handleBillingSwitch('monthly')}
                    className={`flex-1 p-3 rounded-xl border text-sm ${billingFrequency === 'monthly' ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    Monthly {monthlyEffective !== null ? `· ${monthlyEffective === 0 ? 'Free' : formatCurrency(monthlyEffective, monthlyPlan?.currency ?? currency)}` : ''}
                  </button>
                  <button
                    onClick={() => handleBillingSwitch('yearly')}
                    className={`flex-1 p-3 rounded-xl border text-sm ${billingFrequency === 'yearly' ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    Yearly {yearlyEffective !== null ? `· ${yearlyEffective === 0 ? 'Free' : formatCurrency(yearlyEffective, yearlyPlan?.currency ?? currency)}` : ''}
                    {yearlySavings > 0 && <span className="block text-[10px] text-success mt-1">Save {yearlySavings}%</span>}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-700 flex items-center gap-2"><Wallet size={15} /> Checkout Method</h2>
              </div>
              <div className="p-5 space-y-3">
                {isFreeOrder ? (
                  <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-success" />
                    <div className="flex-1">
                      <div className="font-700 text-sm">Free Access</div>
                      <p className="text-xs text-muted-foreground mt-1">No payment provider is required. Access is granted securely after server validation.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { if (payoneerStatus === 'available') setCheckoutMethod('payoneer'); }}
                      disabled={payoneerStatus !== 'available'}
                      className={`w-full text-left rounded-xl border p-4 flex items-center gap-3 transition-colors disabled:cursor-not-allowed ${
                        checkoutMethod === 'payoneer' && payoneerStatus === 'available'
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-secondary/20'
                      }`}
                    >
                      <Wallet size={20} className="text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-700 text-sm">Payoneer Checkout</span>
                          {providerBadge(payoneerStatus)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Redirect to Payoneer&apos;s hosted checkout.</p>
                      </div>
                      {checkoutMethod === 'payoneer' && payoneerStatus === 'available' && <CheckCircle2 size={16} className="text-primary" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => { if (cryptoStatus === 'available') setCheckoutMethod('crypto'); }}
                      disabled={cryptoStatus !== 'available'}
                      className={`w-full text-left rounded-xl border p-4 flex items-center gap-3 transition-colors disabled:cursor-not-allowed ${
                        checkoutMethod === 'crypto' && cryptoStatus === 'available'
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-secondary/20'
                      }`}
                    >
                      <Bitcoin size={20} className="text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-700 text-sm">Crypto · USDT / USDC / BTC / ETH</span>
                          {providerBadge(cryptoStatus)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">NOWPayments generates a unique payment request. Access is granted only after signed confirmation.</p>
                      </div>
                      {checkoutMethod === 'crypto' && cryptoStatus === 'available' && <CheckCircle2 size={16} className="text-primary" />}
                    </button>

                    {checkoutMethod === 'crypto' && cryptoStatus === 'available' && (
                      <div className="rounded-xl border border-border bg-secondary/20 p-4">
                        <div className="text-xs font-700 mb-3">Choose asset and network</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {cryptoOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setCryptoMethod(option.value)}
                              className={`p-3 rounded-xl border text-left transition-colors ${
                                cryptoMethod === option.value ? 'border-primary bg-primary/5' : 'border-border bg-card'
                              }`}
                            >
                              <div className="text-sm font-700">{option.label}</div>
                              <div className="text-[10px] text-muted-foreground mt-1">{option.detail}</div>
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-warning mt-3">Send only on the selected network. A different network may cause permanent loss.</p>
                      </div>
                    )}
                  </>
                )}

                {!isFreeOrder && (
                  <div className="rounded-xl border border-border bg-secondary/20 p-4 flex items-center gap-3 opacity-70">
                    <CreditCard size={20} />
                    <div className="flex-1">
                      <div className="font-700 text-sm">Direct card checkout</div>
                      <p className="text-xs text-muted-foreground mt-1">Coming soon — card numbers are not collected by SUMMECA.</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Coming soon</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-700 flex items-center gap-2"><Tag size={15} /> Coupon Code</h2>
              </div>
              <div className="p-5">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-success/5 border border-success/20 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-success" />
                      <span className="text-sm font-700">{appliedCoupon.code}</span>
                    </div>
                    <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} aria-label="Remove coupon"><X size={15} /></button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        value={couponCode}
                        onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setCouponError(''); }}
                        onKeyDown={(event) => { if (event.key === 'Enter') void handleApplyCoupon(); }}
                        placeholder="Enter coupon code"
                        maxLength={80}
                        className="flex-1 px-3 py-2.5 text-sm bg-secondary border border-border rounded-xl"
                      />
                      <button
                        onClick={() => void handleApplyCoupon()}
                        disabled={couponLoading || !couponCode.trim()}
                        className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50"
                      >
                        {couponLoading ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-danger mt-2">{couponError}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-2xl overflow-hidden sticky top-24">
              <div className="px-5 py-4 border-b border-border"><h2 className="text-sm font-700">Order Summary</h2></div>
              <div className="p-5">
                <div className="space-y-3 mb-5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Regular price</span>
                    <span>{formatCurrency(regularPrice, currency)}</span>
                  </div>
                  {pricing?.discountAmount ? (
                    <div className="flex justify-between text-success">
                      <span>Sale discount</span>
                      <span>-{formatCurrency(pricing.discountAmount, currency)}</span>
                    </div>
                  ) : null}
                  {couponDiscountAmount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Coupon discount</span>
                      <span>-{formatCurrency(couponDiscountAmount, currency)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-3 flex justify-between items-end">
                    <span className="font-700">Total</span>
                    <span className="text-xl font-800">{finalAmount === 0 ? 'Free' : formatCurrency(finalAmount, currency)}</span>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-secondary/60 border border-border rounded-xl text-xs text-muted-foreground flex gap-2">
                  <Info size={13} className="flex-shrink-0 mt-0.5" />
                  <span>The server recalculates the sale price and coupon before access is granted or payment starts.</span>
                </div>

                {!user && !authLoading && (
                  <div className="mb-4 p-3 bg-warning/5 border border-warning/20 rounded-xl text-xs text-warning">Sign in to continue.</div>
                )}
                {pageError && (
                  <div className="mb-4 p-3 bg-danger/5 border border-danger/20 rounded-xl text-xs text-danger">{pageError}</div>
                )}

                <button
                  onClick={() => void handleCheckout()}
                  disabled={authLoading || checkoutSubmitting || (!isFreeOrder && selectedProviderStatus !== 'available')}
                  className="w-full py-3.5 bg-gradient-teal text-white font-700 text-sm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {checkoutSubmitting ? (
                    <><Loader2 size={16} className="animate-spin" /> Processing…</>
                  ) : !user ? (
                    'Sign In to Continue'
                  ) : isFreeOrder ? (
                    <><CheckCircle2 size={15} /> Get Free Access</>
                  ) : selectedProviderStatus !== 'available' ? (
                    `${checkoutMethod === 'crypto' ? 'Crypto' : 'Payoneer'} Checkout Unavailable`
                  ) : checkoutMethod === 'crypto' ? (
                    <><Bitcoin size={15} /> Create Crypto Payment</>
                  ) : (
                    <><ExternalLink size={14} /> Pay with Payoneer</>
                  )}
                </button>

                <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
                  <Lock size={11} /> {isFreeOrder ? 'No payment information required' : 'Payment credentials and wallet secrets are never collected by SUMMECA'}
                </p>

                <div className="mt-5 pt-4 border-t border-border text-center">
                  <Link href={`/products/${cartItem.product.slug}`} className="text-xs text-muted-foreground hover:text-foreground">← Back to product</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <Suspense fallback={<div className="pt-24 pb-20 max-w-screen-xl mx-auto px-6 lg:px-8"><CheckoutSkeleton /></div>}>
        <CheckoutInner />
      </Suspense>
      <PublicFooter />
    </div>
  );
}
