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
  Copy,
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

interface CartItem { product: Product; plan: ProductPlan }
interface Coupon {
  id: string;
  code: string;
  coupon_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  applies_to: string | null;
}

type ProviderStatus = 'checking' | 'available' | 'unavailable';
type CheckoutMethod = 'payoneer' | 'crypto';

type CryptoSession = {
  orderId: string;
  paymentAddress: string;
  cryptoAmount: string;
  paymentMethodType: string;
  instructions?: string;
};

const CRYPTO_METHODS = [
  { value: 'crypto_usdt_trc20', label: 'USDT · TRON (TRC20)' },
  { value: 'crypto_trx', label: 'TRON (TRX) · Low minimum' },
  { value: 'crypto_usdt_erc20', label: 'USDT · Ethereum (ERC20)' },
];

function cryptoAssetLabel(paymentMethodType: string) {
  return paymentMethodType === 'crypto_trx' ? 'TRX' : 'USDT';
}

const categoryLabel: Record<string, string> = {
  ai_tool: 'AI Tool', api: 'API', plugin: 'Plugin', template: 'Template',
  dataset: 'Dataset', course: 'Course', other: 'Other',
};
const billingPeriodLabel: Record<string, string> = {
  one_time: 'One-time', monthly: 'Monthly', yearly: 'Yearly', lifetime: 'Lifetime',
};

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function CheckoutSkeleton() {
  return <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-pulse">
    <div className="lg:col-span-3 space-y-4"><div className="h-8 bg-secondary/60 rounded-xl w-48" /><div className="h-40 bg-secondary/40 rounded-2xl" /><div className="h-48 bg-secondary/40 rounded-2xl" /></div>
    <div className="lg:col-span-2"><div className="h-72 bg-secondary/40 rounded-2xl" /></div>
  </div>;
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
  const [cryptoMethod, setCryptoMethod] = useState('crypto_usdt_trc20');
  const [cryptoSession, setCryptoSession] = useState<CryptoSession | null>(null);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutTracked, setCheckoutTracked] = useState(false);

  useEffect(() => {
    async function checkProviders() {
      const check = async (url: string, setter: (value: ProviderStatus) => void) => {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          const data = res.ok ? await res.json() as { available?: boolean } : {};
          setter(data.available === true ? 'available' : 'unavailable');
        } catch { setter('unavailable'); }
      };
      await Promise.all([
        check('/api/payment/payoneer-status', setPayoneerStatus),
        check('/api/payment/crypto-status', setCryptoStatus),
      ]);
    }
    void checkProviders();
  }, []);

  useEffect(() => {
    if (payoneerStatus !== 'available' && cryptoStatus === 'available') setCheckoutMethod('crypto');
  }, [cryptoStatus, payoneerStatus]);

  const loadCartItem = useCallback(async () => {
    if (!productIdParam) { setPageError('No product selected.'); setPageLoading(false); return; }
    setPageLoading(true); setPageError('');
    try {
      const { data: product, error: productError } = await supabase.from('products')
        .select('id, name, slug, short_desc, category, thumbnail_url')
        .eq('id', productIdParam).eq('status', 'active').single();
      if (productError || !product) { setPageError('Product not found or unavailable.'); return; }
      const { data: plans, error: plansError } = await supabase.from('product_plans')
        .select('id, name, description, price, currency, billing_period, features, is_active, sale_price, sale_discount_type, sale_discount_value, sale_starts_at, sale_ends_at')
        .eq('product_id', productIdParam).eq('is_active', true).order('sort_order', { ascending: true });
      if (plansError || !plans?.length) { setPageError('No active plans found for this product.'); return; }
      const typedPlans = plans as ProductPlan[];
      setAllPlans(typedPlans);
      const selectedPlan = typedPlans.find((plan) => plan.id === planIdParam) ?? typedPlans[0];
      setBillingFrequency(selectedPlan.billing_period === 'yearly' ? 'yearly' : 'monthly');
      setCartItem({ product: product as Product, plan: selectedPlan });
    } catch { setPageError('Failed to load checkout details.'); }
    finally { setPageLoading(false); }
  }, [planIdParam, productIdParam, supabase]);

  useEffect(() => { if (!authLoading) void loadCartItem(); }, [authLoading, loadCartItem]);

  const pricing = useMemo(() => {
    if (!cartItem) return null;
    try { return getEffectivePrice(cartItem.plan); }
    catch {
      const price = Number(cartItem.plan.price || 0);
      return { regularPrice: price, salePrice: null, finalPrice: price, discountAmount: 0, discountPercent: 0, onSale: false };
    }
  }, [cartItem]);

  const basePrice = Number(pricing?.finalPrice ?? 0);
  const regularPrice = Number(pricing?.regularPrice ?? basePrice);
  const currency = cartItem?.plan.currency ?? 'USD';
  const couponDiscountAmount = appliedCoupon
    ? appliedCoupon.coupon_type === 'percentage'
      ? Math.min(basePrice, Math.max(0, basePrice * Number(appliedCoupon.discount_value) / 100))
      : Math.min(basePrice, Math.max(0, Number(appliedCoupon.discount_value)))
    : 0;
  const finalAmount = Number(Math.max(0, basePrice - couponDiscountAmount).toFixed(2));
  const isFreeOrder = finalAmount === 0;

  useEffect(() => {
    if (cartItem && pricing && !checkoutTracked) {
      trackCheckoutStarted({ id: cartItem.product.id, name: cartItem.product.name, price: pricing.finalPrice, planName: cartItem.plan.name });
      setCheckoutTracked(true);
    }
  }, [cartItem, checkoutTracked, pricing]);

  const handleBillingSwitch = (frequency: 'monthly' | 'yearly') => {
    if (!cartItem) return;
    const matchingPlan = allPlans.find((plan) => plan.billing_period === frequency);
    if (!matchingPlan) return;
    setBillingFrequency(frequency);
    setCartItem({ ...cartItem, plan: matchingPlan });
    setAppliedCoupon(null); setCouponCode(''); setCouponError(''); setCryptoSession(null);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !cartItem) return;
    setCouponLoading(true); setCouponError(''); setAppliedCoupon(null); setCryptoSession(null);
    try {
      const { data, error } = await supabase.from('coupons')
        .select('id, code, coupon_type, discount_value, applies_to, max_uses, used_count, valid_from, valid_until, is_active')
        .ilike('code', couponCode.trim()).eq('is_active', true).maybeSingle();
      if (error || !data) { setCouponError('Coupon code not found or inactive.'); return; }
      const now = new Date();
      if (data.valid_from && new Date(data.valid_from) > now) { setCouponError('This coupon is not active yet.'); return; }
      if (data.valid_until && new Date(data.valid_until) < now) { setCouponError('This coupon has expired.'); return; }
      if (data.max_uses !== null && data.used_count >= data.max_uses) { setCouponError('This coupon has reached its usage limit.'); return; }
      if (data.applies_to && data.applies_to !== cartItem.product.id) { setCouponError('This coupon is not valid for the selected product.'); return; }
      setAppliedCoupon(data as Coupon);
    } catch { setCouponError('Failed to validate coupon.'); }
    finally { setCouponLoading(false); }
  };

  const selectedProviderAvailable = checkoutMethod === 'payoneer' ? payoneerStatus === 'available' : cryptoStatus === 'available';

  const handleCheckout = async () => {
    if (!user) {
      const next = new URLSearchParams();
      if (productIdParam) next.set('product_id', productIdParam);
      if (cartItem?.plan.id) next.set('plan_id', cartItem.plan.id);
      router.push(`/sign-up-login-screen?next=${encodeURIComponent(`/checkout?${next.toString()}`)}`);
      return;
    }
    if (!cartItem || (!isFreeOrder && !selectedProviderAvailable)) return;
    setCheckoutSubmitting(true); setPageError(''); setCryptoSession(null);
    try {
      const endpoint = isFreeOrder
        ? '/api/payment/create-free-order'
        : checkoutMethod === 'crypto'
          ? '/api/payment/create-crypto-session'
          : '/api/payment/create-payoneer-session';
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: cartItem.product.id,
          planId: cartItem.plan.id,
          couponId: appliedCoupon?.id ?? null,
          ...(checkoutMethod === 'crypto' ? { paymentMethodType: cryptoMethod } : {}),
        }),
      });
      const data = await res.json() as {
        orderId?: string; redirectUrl?: string; paymentAddress?: string; cryptoAmount?: string;
        paymentMethodType?: string; instructions?: string; error?: string;
      };
      if (!res.ok || !data.orderId) { setPageError(data.error ?? 'Failed to start checkout.'); return; }
      if (isFreeOrder) { router.push(`/checkout/success?order_id=${encodeURIComponent(data.orderId)}&free=1`); return; }
      if (checkoutMethod === 'crypto') {
        if (!data.paymentAddress || !data.cryptoAmount || !data.paymentMethodType) { setPageError('Crypto provider returned incomplete payment details.'); return; }
        setCryptoSession({ orderId: data.orderId, paymentAddress: data.paymentAddress, cryptoAmount: data.cryptoAmount, paymentMethodType: data.paymentMethodType, instructions: data.instructions });
        return;
      }
      if (!data.redirectUrl) { setPageError('Payment provider did not return a checkout URL.'); return; }
      window.location.assign(data.redirectUrl);
    } catch { setPageError('Failed to start checkout. Please try again.'); }
    finally { setCheckoutSubmitting(false); }
  };

  const hasMonthly = allPlans.some((plan) => plan.billing_period === 'monthly');
  const hasYearly = allPlans.some((plan) => plan.billing_period === 'yearly');

  return <div className="pt-24 pb-20 max-w-screen-xl mx-auto px-6 lg:px-8">
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
      <Link href="/products" className="hover:text-foreground flex items-center gap-1"><ArrowLeft size={14} /> Products</Link><ChevronRight size={13} /><span className="text-foreground font-600">Checkout</span>
    </div>
    <div className="mb-8">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-teal flex items-center justify-center"><ShoppingCart size={18} className="text-white" /></div><div><h1 className="text-2xl font-800">Secure Checkout</h1><p className="text-sm text-muted-foreground">Choose Payoneer, USDT or TRX. Payment return pages never complete paid orders.</p></div></div>
      <div className="flex items-center gap-2 mt-4 p-3 bg-success/5 border border-success/15 rounded-xl"><Shield size={14} className="text-success" /><p className="text-xs">SUMMECA recalculates pricing server-side and grants access only after trusted payment verification.</p></div>
    </div>

    {pageLoading && <CheckoutSkeleton />}
    {!pageLoading && !cartItem && <div className="py-20 text-center"><AlertCircle className="mx-auto text-danger mb-3" /><p>{pageError || 'Checkout could not be loaded.'}</p></div>}
    {!pageLoading && cartItem && <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
      <div className="lg:col-span-3 space-y-5">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border"><h2 className="text-sm font-700 flex items-center gap-2"><Package size={15} /> Your Order</h2></div>
          <div className="p-5 flex gap-4">
            {cartItem.product.thumbnail_url ? <img src={cartItem.product.thumbnail_url} alt={cartItem.product.name} className="w-16 h-16 rounded-xl object-cover border border-border" /> : <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center"><Zap size={22} className="text-primary" /></div>}
            <div className="flex-1"><span className="text-xs text-primary">{categoryLabel[cartItem.product.category] || 'Other'}</span><h3 className="font-700 mt-1">{cartItem.product.name}</h3><p className="text-xs text-muted-foreground mt-1">{cartItem.product.short_desc}</p><p className="text-xs mt-2">{cartItem.plan.name} · {billingPeriodLabel[cartItem.plan.billing_period]}</p></div>
            <div className="text-right">{pricing?.onSale && <div className="text-xs line-through text-muted-foreground">{formatCurrency(regularPrice, currency)}</div>}<div className="font-800">{basePrice === 0 ? 'Free' : formatCurrency(basePrice, currency)}</div></div>
          </div>
        </div>

        {hasMonthly && hasYearly && <div className="bg-card border border-border rounded-2xl p-5"><h2 className="text-sm font-700 flex items-center gap-2 mb-3"><RefreshCw size={15} /> Billing Frequency</h2><div className="flex gap-2"><button onClick={() => handleBillingSwitch('monthly')} className={`flex-1 p-3 rounded-xl border ${billingFrequency === 'monthly' ? 'border-primary bg-primary/5' : 'border-border'}`}>Monthly</button><button onClick={() => handleBillingSwitch('yearly')} className={`flex-1 p-3 rounded-xl border ${billingFrequency === 'yearly' ? 'border-primary bg-primary/5' : 'border-border'}`}>Yearly</button></div></div>}

        {!isFreeOrder && <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-700 flex items-center gap-2"><Wallet size={15} /> Payment Method</h2>
          <button type="button" onClick={() => { setCheckoutMethod('payoneer'); setCryptoSession(null); }} className={`w-full text-left rounded-xl border p-4 flex gap-3 ${checkoutMethod === 'payoneer' ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <Wallet size={20} className="text-primary" /><div className="flex-1"><div className="font-700 text-sm">Payoneer Checkout</div><p className="text-xs text-muted-foreground mt-1">Hosted Payoneer checkout.</p></div><span className="text-[10px]">{payoneerStatus === 'available' ? 'Available' : payoneerStatus === 'checking' ? 'Checking…' : 'Not configured'}</span>
          </button>
          <button type="button" onClick={() => { setCheckoutMethod('crypto'); setCryptoSession(null); }} className={`w-full text-left rounded-xl border p-4 flex gap-3 ${checkoutMethod === 'crypto' ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <Bitcoin size={20} className="text-primary" /><div className="flex-1"><div className="font-700 text-sm">USDT / TRX · NOWPayments</div><p className="text-xs text-muted-foreground mt-1">USDT remains the primary option. TRX is available for lower-total orders when the USDT minimum is too high.</p></div><span className="text-[10px]">{cryptoStatus === 'available' ? 'Available' : cryptoStatus === 'checking' ? 'Checking…' : 'Not configured'}</span>
          </button>
          {checkoutMethod === 'crypto' && <select value={cryptoMethod} onChange={(e) => { setCryptoMethod(e.target.value); setCryptoSession(null); setPageError(''); }} className="w-full px-3 py-3 bg-background border border-border rounded-xl text-sm">{CRYPTO_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select>}
        </div>}

        {cryptoSession && <div className="bg-card border border-primary/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-success" /><h2 className="font-700">{cryptoAssetLabel(cryptoSession.paymentMethodType)} payment created</h2></div>
          <div><p className="text-xs text-muted-foreground mb-1">Amount to send</p><p className="font-800 text-lg">{cryptoSession.cryptoAmount} {cryptoAssetLabel(cryptoSession.paymentMethodType)}</p></div>
          <div><p className="text-xs text-muted-foreground mb-1">Payment address</p><div className="flex gap-2"><code className="flex-1 text-xs break-all p-3 bg-secondary rounded-xl">{cryptoSession.paymentAddress}</code><button type="button" onClick={() => void navigator.clipboard.writeText(cryptoSession.paymentAddress)} className="px-3 rounded-xl border border-border" aria-label="Copy payment address"><Copy size={14} /></button></div></div>
          <div className="p-3 rounded-xl bg-warning/5 border border-warning/20 text-xs">Send only {cryptoAssetLabel(cryptoSession.paymentMethodType)} on the selected network. Sending another asset or the wrong network can result in permanent loss. SUMMECA waits for the verified provider webhook before granting access.</div>
          <p className="text-xs text-muted-foreground">Order: {cryptoSession.orderId}</p>
        </div>}

        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-700 flex items-center gap-2 mb-3"><Tag size={15} /> Coupon Code</h2>
          {appliedCoupon ? <div className="flex items-center justify-between bg-success/5 border border-success/20 rounded-xl px-4 py-3"><span className="text-sm font-700">{appliedCoupon.code}</span><button onClick={() => { setAppliedCoupon(null); setCouponCode(''); setCryptoSession(null); }}><X size={15} /></button></div> : <div className="flex gap-2"><input value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }} placeholder="Enter coupon code" className="flex-1 px-3 py-2.5 bg-secondary border border-border rounded-xl text-sm" /><button onClick={() => void handleApplyCoupon()} disabled={couponLoading || !couponCode.trim()} className="btn-primary px-4 rounded-xl disabled:opacity-50">{couponLoading ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}</button></div>}
          {couponError && <p className="text-xs text-danger mt-2">{couponError}</p>}
        </div>
      </div>

      <div className="lg:col-span-2"><div className="bg-card border border-border rounded-2xl sticky top-24 p-5">
        <h2 className="text-sm font-700 mb-4">Order Summary</h2>
        <div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Regular price</span><span>{formatCurrency(regularPrice, currency)}</span></div>{pricing?.discountAmount ? <div className="flex justify-between text-success"><span>Sale discount</span><span>-{formatCurrency(pricing.discountAmount, currency)}</span></div> : null}{couponDiscountAmount > 0 && <div className="flex justify-between text-success"><span>Coupon discount</span><span>-{formatCurrency(couponDiscountAmount, currency)}</span></div>}<div className="border-t border-border pt-3 flex justify-between"><span className="font-700">Total</span><span className="text-xl font-800">{finalAmount === 0 ? 'Free' : formatCurrency(finalAmount, currency)}</span></div></div>
        <div className="mt-4 p-3 bg-secondary/60 rounded-xl text-xs flex gap-2"><Info size={13} className="mt-0.5" /><span>Payment success pages are informational only. Paid access is granted by verified server-side events.</span></div>
        {!user && !authLoading && <div className="mt-4 p-3 bg-warning/5 border border-warning/20 rounded-xl text-xs">Sign in to continue.</div>}
        {pageError && <div className="mt-4 p-3 bg-danger/5 border border-danger/20 rounded-xl text-xs text-danger">{pageError}</div>}
        <button onClick={() => void handleCheckout()} disabled={authLoading || checkoutSubmitting || (!isFreeOrder && !selectedProviderAvailable) || Boolean(cryptoSession)} className="mt-4 w-full py-3.5 bg-gradient-teal text-white font-700 text-sm rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
          {checkoutSubmitting ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : !user ? 'Sign In to Continue' : isFreeOrder ? <><CheckCircle2 size={15} /> Get Free Access</> : checkoutMethod === 'crypto' ? <><Bitcoin size={15} /> Create {cryptoMethod === 'crypto_trx' ? 'TRX' : 'USDT'} Payment</> : <><ExternalLink size={14} /> Pay with Payoneer</>}
        </button>
        <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1"><Lock size={11} /> {isFreeOrder ? 'No payment information required' : 'Secrets and wallet keys are never exposed to the browser'}</p>
        <div className="mt-5 pt-4 border-t border-border text-center"><Link href={`/products/${cartItem.product.slug}`} className="text-xs text-muted-foreground">← Back to product</Link></div>
      </div></div>
    </div>}
  </div>;
}

export default function CheckoutPage() {
  return <div className="min-h-screen bg-background"><PublicNav /><Suspense fallback={<div className="pt-24 pb-20 max-w-screen-xl mx-auto px-6 lg:px-8"><CheckoutSkeleton /></div>}><CheckoutInner /></Suspense><PublicFooter /></div>;
}
