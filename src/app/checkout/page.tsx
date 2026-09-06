'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Bitcoin,
  CheckCircle2,
  ChevronRight,
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
  CreditCard,
} from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { trackCheckoutStarted } from '@/lib/analytics';

interface ProductPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_period: 'one_time' | 'monthly' | 'yearly' | 'lifetime';
  features: string[];
  is_active: boolean;
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

type PayoneerStatus = 'checking' | 'available' | 'unavailable';

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
  const supabase = createClient();

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
  const [payoneerStatus, setPayoneerStatus] = useState<PayoneerStatus>('checking');
  const [payoneerRedirecting, setPayoneerRedirecting] = useState(false);
  const [checkoutTracked, setCheckoutTracked] = useState(false);

  useEffect(() => {
    async function checkPayoneerStatus() {
      try {
        const res = await fetch('/api/payment/payoneer-status', { cache: 'no-store' });
        if (!res.ok) {
          setPayoneerStatus('unavailable');
          return;
        }
        const data = await res.json() as { available?: boolean };
        setPayoneerStatus(data.available === true ? 'available' : 'unavailable');
      } catch {
        setPayoneerStatus('unavailable');
      }
    }
    void checkPayoneerStatus();
  }, []);

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
        .select('id, name, description, price, currency, billing_period, features, is_active')
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

  useEffect(() => {
    if (cartItem && !checkoutTracked) {
      trackCheckoutStarted({
        id: cartItem.product.id,
        name: cartItem.product.name,
        price: cartItem.plan.price,
        planName: cartItem.plan.name,
      });
      setCheckoutTracked(true);
    }
  }, [cartItem, checkoutTracked]);

  const handleBillingSwitch = (frequency: 'monthly' | 'yearly') => {
    if (!cartItem) return;
    const matchingPlan = allPlans.find(
      (plan) => plan.billing_period === (frequency === 'monthly' ? 'monthly' : 'yearly')
    );
    if (!matchingPlan) return;

    setBillingFrequency(frequency);
    setCartItem((current) => current ? { ...current, plan: matchingPlan } : current);
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

  const handlePayoneerCheckout = async () => {
    if (!user) {
      router.push('/sign-up-login-screen');
      return;
    }
    if (!cartItem || payoneerStatus !== 'available') return;

    setPayoneerRedirecting(true);
    setPageError('');

    try {
      const res = await fetch('/api/payment/create-payoneer-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: cartItem.product.id,
          planId: cartItem.plan.id,
          couponId: appliedCoupon?.id ?? null,
        }),
      });

      const data = await res.json() as { redirectUrl?: string; error?: string };
      if (!res.ok || !data.redirectUrl) {
        setPageError(data.error ?? 'Failed to start Payoneer checkout. Please try again.');
        return;
      }

      window.location.assign(data.redirectUrl);
    } catch {
      setPageError('Failed to start Payoneer checkout. Please try again.');
    } finally {
      setPayoneerRedirecting(false);
    }
  };

  const basePrice = Number(cartItem?.plan.price ?? 0);
  const currency = cartItem?.plan.currency ?? 'USD';
  const discountAmount = appliedCoupon
    ? appliedCoupon.coupon_type === 'percentage'
      ? Math.min(basePrice, Math.max(0, (basePrice * Number(appliedCoupon.discount_value)) / 100))
      : Math.min(basePrice, Math.max(0, Number(appliedCoupon.discount_value)))
    : 0;
  const finalAmount = Math.max(0, basePrice - discountAmount);

  const hasMonthly = allPlans.some((plan) => plan.billing_period === 'monthly');
  const hasYearly = allPlans.some((plan) => plan.billing_period === 'yearly');
  const monthlyPlan = allPlans.find((plan) => plan.billing_period === 'monthly');
  const yearlyPlan = allPlans.find((plan) => plan.billing_period === 'yearly');
  const yearlySavings = yearlyPlan && monthlyPlan && monthlyPlan.price > 0
    ? Math.max(0, Math.round(((monthlyPlan.price * 12 - yearlyPlan.price) / (monthlyPlan.price * 12)) * 100))
    : 0;

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
            <p className="text-sm text-muted-foreground">Payment is completed on the provider&apos;s hosted page.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 p-3 bg-success/5 border border-success/15 rounded-xl">
          <Shield size={14} className="text-success" />
          <p className="text-xs text-secondary-foreground">
            SUMMECA does not collect or store full card numbers or CVV. Payment credentials are entered directly with the payment provider.
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
                <div className="font-800 text-foreground">{formatCurrency(basePrice, currency)}</div>
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
                    Monthly {monthlyPlan ? `· ${formatCurrency(monthlyPlan.price, currency)}` : ''}
                  </button>
                  <button
                    onClick={() => handleBillingSwitch('yearly')}
                    className={`flex-1 p-3 rounded-xl border text-sm ${billingFrequency === 'yearly' ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    Yearly {yearlyPlan ? `· ${formatCurrency(yearlyPlan.price, currency)}` : ''}
                    {yearlySavings > 0 && <span className="block text-[10px] text-success mt-1">Save {yearlySavings}%</span>}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border">
                <h2 className="text-sm font-700 flex items-center gap-2"><Wallet size={15} /> Payment Method</h2>
              </div>
              <div className="p-5 space-y-3">
                <div className={`rounded-xl border p-4 flex items-center gap-3 ${payoneerStatus === 'available' ? 'border-primary bg-primary/5' : 'border-border bg-secondary/30'}`}>
                  <Wallet size={20} className="text-primary" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-700 text-sm">Payoneer Checkout</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        payoneerStatus === 'available'
                          ? 'bg-success/10 text-success'
                          : payoneerStatus === 'checking'
                            ? 'bg-secondary text-muted-foreground'
                            : 'bg-warning/10 text-warning'
                      }`}>
                        {payoneerStatus === 'available' ? 'Available' : payoneerStatus === 'checking' ? 'Checking…' : 'Not configured'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      You will be redirected to Payoneer&apos;s hosted checkout to enter payment details.
                    </p>
                  </div>
                  {payoneerStatus === 'available' && <ExternalLink size={14} className="text-muted-foreground" />}
                </div>

                <div className="rounded-xl border border-border bg-secondary/20 p-4 flex items-center gap-3 opacity-70">
                  <CreditCard size={20} />
                  <div className="flex-1">
                    <div className="font-700 text-sm">Direct card checkout</div>
                    <p className="text-xs text-muted-foreground mt-1">Coming soon — card numbers are not collected by SUMMECA.</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Coming soon</span>
                </div>

                <div className="rounded-xl border border-border bg-secondary/20 p-4 flex items-center gap-3 opacity-70">
                  <Bitcoin size={20} />
                  <div className="flex-1">
                    <div className="font-700 text-sm">Crypto · BTC / ETH / USDT</div>
                    <p className="text-xs text-muted-foreground mt-1">Coming soon — crypto payment processing is not live yet.</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Coming soon</span>
                </div>
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
                    <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} aria-label="Remove coupon">
                      <X size={15} />
                    </button>
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
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-700">Order Summary</h2>
              </div>
              <div className="p-5">
                <div className="space-y-3 mb-5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{cartItem.plan.name}</span>
                    <span>{formatCurrency(basePrice, currency)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Discount</span>
                      <span>-{formatCurrency(discountAmount, currency)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-3 flex justify-between items-end">
                    <span className="font-700">Total</span>
                    <span className="text-xl font-800">{formatCurrency(finalAmount, currency)}</span>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-secondary/60 border border-border rounded-xl text-xs text-muted-foreground flex gap-2">
                  <Info size={13} className="flex-shrink-0 mt-0.5" />
                  <span>The final price and coupon are recalculated on the server before the payment session is created.</span>
                </div>

                {!user && !authLoading && (
                  <div className="mb-4 p-3 bg-warning/5 border border-warning/20 rounded-xl text-xs text-warning">
                    Sign in to continue to payment.
                  </div>
                )}

                {pageError && (
                  <div className="mb-4 p-3 bg-danger/5 border border-danger/20 rounded-xl text-xs text-danger">
                    {pageError}
                  </div>
                )}

                <button
                  onClick={() => void handlePayoneerCheckout()}
                  disabled={authLoading || payoneerRedirecting || payoneerStatus !== 'available'}
                  className="w-full py-3.5 bg-gradient-teal text-white font-700 text-sm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {payoneerRedirecting ? (
                    <><Loader2 size={16} className="animate-spin" /> Opening Payoneer…</>
                  ) : !user ? (
                    'Sign In to Continue'
                  ) : payoneerStatus === 'available' ? (
                    <><ExternalLink size={14} /> Pay with Payoneer</>
                  ) : (
                    'Payoneer Checkout Unavailable'
                  )}
                </button>

                <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
                  <Lock size={11} /> Payment credentials stay with the provider
                </p>

                <div className="mt-5 pt-4 border-t border-border text-center">
                  <Link href={`/products/${cartItem.product.slug}`} className="text-xs text-muted-foreground hover:text-foreground">
                    ← Back to product
                  </Link>
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
      <Suspense fallback={
        <div className="pt-24 pb-20 max-w-screen-xl mx-auto px-6 lg:px-8"><CheckoutSkeleton /></div>
      }>
        <CheckoutInner />
      </Suspense>
      <PublicFooter />
    </div>
  );
}
