'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { trackCheckoutStarted, trackPurchase } from '@/lib/analytics';
import type { PaymentMethodType } from '@/lib/payment/types';
import {
  ShoppingCart, Tag, CheckCircle2, AlertCircle, Loader2, ChevronRight,
  Package, Zap, RefreshCw, Lock, ArrowLeft, X, CreditCard, Plus, Info,
  Bitcoin, Wallet, ExternalLink, Shield, Star, Award, Clock, Users,
  BadgeCheck, Headphones,
} from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


// ─── Types ────────────────────────────────────────────────────────────────────

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

/**
 * Saved payment method — stores ONLY non-sensitive data.
 * Full card numbers, CVV, and raw PAN are NEVER stored here.
 * provider_token is an opaque reference issued by the payment provider.
 */
interface SavedPaymentMethod {
  id: string;
  card_last4: string;
  card_brand: string;
  card_exp_month: string;
  card_exp_year: string;
  cardholder_name: string;
  is_default: boolean;
  payment_method_type: PaymentMethodType;
  provider_token?: string;
}

/**
 * New card form — card_number and expiry are used ONLY for display/UX.
 * They are NEVER persisted to Supabase or user_metadata.
 * CVV is intentionally excluded — it must never be stored anywhere.
 */
interface NewCardForm {
  cardholder_name: string;
  card_number: string;
  expiry: string;
  save_card: boolean;
}

// ─── Payment method option definitions ───────────────────────────────────────

interface PaymentOption {
  id: string;
  type: PaymentMethodType;
  label: string;
  description: string;
  badge?: string;
  icon: React.ReactNode;
  group: 'card' | 'payoneer' | 'crypto';
  /** Whether this option requires server-side redirect (hosted checkout) */
  isHosted?: boolean;
}

// Payoneer availability is determined at runtime via the API
// The checkout UI fetches this from /api/payment/payoneer-status
type PayoneerStatus = 'checking' | 'available' | 'unavailable';

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'opt_card',
    type: 'card',
    label: 'Credit / Debit Card',
    description: 'Visa, Mastercard, Amex, Discover',
    icon: <CreditCard size={16} className="text-primary" />,
    group: 'card',
  },
  {
    id: 'opt_payoneer',
    type: 'payoneer',
    label: 'Payoneer',
    description: 'Pay with your Payoneer balance or linked card',
    badge: 'Coming soon',
    icon: <Wallet size={16} className="text-blue-500" />,
    group: 'payoneer',
  },
  {
    id: 'opt_crypto_btc',
    type: 'crypto_btc',
    label: 'Bitcoin (BTC)',
    description: 'Pay with Bitcoin',
    badge: 'Coming soon',
    icon: <Bitcoin size={16} className="text-orange-500" />,
    group: 'crypto',
  },
  {
    id: 'opt_crypto_eth',
    type: 'crypto_eth',
    label: 'Ethereum (ETH)',
    description: 'Pay with Ethereum',
    badge: 'Coming soon',
    icon: <Bitcoin size={16} className="text-purple-500" />,
    group: 'crypto',
  },
  {
    id: 'opt_crypto_usdt',
    type: 'crypto_usdt',
    label: 'USDT (Tether)',
    description: 'Pay with USDT stablecoin',
    badge: 'Coming soon',
    icon: <Bitcoin size={16} className="text-green-500" />,
    group: 'crypto',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const categoryLabel: Record<string, string> = {
  ai_tool: 'AI Tool', api: 'API', plugin: 'Plugin',
  template: 'Template', dataset: 'Dataset', course: 'Course', other: 'Other',
};

const categoryStyles: Record<string, string> = {
  ai_tool: 'bg-primary/10 text-primary', api: 'bg-primary/10 text-primary',
  plugin: 'bg-primary/10 text-primary', template: 'bg-warning/10 text-warning',
  dataset: 'bg-warning/10 text-warning', course: 'bg-success/10 text-success',
  other: 'bg-secondary text-muted-foreground',
};

const billingPeriodLabel: Record<string, string> = {
  one_time: 'One-time', monthly: 'Monthly', yearly: 'Yearly', lifetime: 'Lifetime',
};

function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

function detectCardBrand(number: string): string {
  const n = number.replace(/\s/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^5[1-5]/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^6(?:011|5)/.test(n)) return 'discover';
  return 'card';
}

// ─── Trust Badges ─────────────────────────────────────────────────────────────

function TrustBadges() {
  const badges = [
    { icon: Shield, label: 'SSL Secured', sub: '256-bit encryption', color: 'text-success' },
    { icon: BadgeCheck, label: 'Verified Store', sub: 'Trusted platform', color: 'text-primary' },
    { icon: RefreshCw, label: 'Money-back', sub: '30-day guarantee', color: 'text-warning' },
    { icon: Headphones, label: '24/7 Support', sub: 'Always available', color: 'text-accent' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 mt-5 pt-5 border-t border-border">
      {badges.map(({ icon: Icon, label, sub, color }) => (
        <div key={label} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-secondary/40">
          <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <Icon size={14} className={color} />
          </div>
          <div>
            <div className="text-xs font-700 text-foreground">{label}</div>
            <div className="text-[10px] text-muted-foreground">{sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Social Proof ─────────────────────────────────────────────────────────────

function SocialProof() {
  return (
    <div className="mt-4 p-3 bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {['#0D9488', '#0891B2', '#059669'].map((color, i) => (
            <div key={i} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-700" style={{ backgroundColor: color }}>
              {['A', 'B', 'C'][i]}
            </div>
          ))}
        </div>
        <div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={10} className="text-warning fill-warning" />
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            <span className="font-600 text-foreground">2,400+</span> customers trust SUMMECA
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CheckoutSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-pulse">
      <div className="lg:col-span-3 space-y-4">
        <div className="h-8 bg-secondary/60 rounded-xl w-48" />
        <div className="h-40 bg-secondary/40 rounded-2xl" />
        <div className="h-24 bg-secondary/40 rounded-2xl" />
        <div className="h-32 bg-secondary/40 rounded-2xl" />
      </div>
      <div className="lg:col-span-2">
        <div className="h-72 bg-secondary/40 rounded-2xl" />
      </div>
    </div>
  );
}

// ─── Inner checkout ───────────────────────────────────────────────────────────

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
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [newCard, setNewCard] = useState<NewCardForm>({
    cardholder_name: '', card_number: '', expiry: '', save_card: false,
  });
  const [cardErrors, setCardErrors] = useState<Partial<Record<keyof NewCardForm, string>>>({});
  const [payoneerStatus, setPayoneerStatus] = useState<PayoneerStatus>('checking');
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<string>('new_card');
  const [payoneerRedirecting, setPayoneerRedirecting] = useState(false);
  const [checkoutTracked, setCheckoutTracked] = useState(false);

  // Check Payoneer availability on mount
  useEffect(() => {
    async function checkPayoneerStatus() {
      try {
        const res = await fetch('/api/payment/payoneer-status');
        if (res.ok) {
          const data = await res.json() as { available: boolean };
          setPayoneerStatus(data.available ? 'available' : 'unavailable');
        } else {
          setPayoneerStatus('unavailable');
        }
      } catch {
        setPayoneerStatus('unavailable');
      }
    }
    checkPayoneerStatus();
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
        .single();

      if (productError || !product) { setPageError('Product not found.'); setPageLoading(false); return; }

      const { data: plans, error: plansError } = await supabase
        .from('product_plans')
        .select('id, name, description, price, currency, billing_period, features, is_active')
        .eq('product_id', productIdParam)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (plansError || !plans || plans.length === 0) {
        setPageError('No active plans found for this product.'); setPageLoading(false); return;
      }

      setAllPlans(plans as ProductPlan[]);
      let selectedPlan: ProductPlan | undefined;
      if (planIdParam) selectedPlan = plans.find((p) => p.id === planIdParam);
      if (!selectedPlan) selectedPlan = plans[0];
      if (selectedPlan.billing_period === 'yearly') setBillingFrequency('yearly');
      else setBillingFrequency('monthly');
      setCartItem({ product: product as Product, plan: selectedPlan as ProductPlan });
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : 'Failed to load checkout details.');
    } finally {
      setPageLoading(false);
    }
  }, [productIdParam, planIdParam, supabase]);

  /**
   * Load saved payment methods from user_metadata.
   * Only non-sensitive fields are stored: last4, brand, exp month/year,
   * cardholder name, payment_method_type, and an optional provider_token.
   */
  const loadSavedMethods = useCallback(async () => {
    if (!user) return;
    try {
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      const methods: SavedPaymentMethod[] = freshUser?.user_metadata?.payment_methods ?? [];
      setSavedMethods(methods);
      if (methods.length > 0) {
        const defaultMethod = methods.find((m) => m.is_default) ?? methods[0];
        setSelectedMethodId(defaultMethod.id);
        setSelectedPaymentOption('saved_card');
        setShowNewCardForm(false);
      } else {
        setSelectedPaymentOption('new_card');
        setShowNewCardForm(true);
      }
    } catch {
      setSelectedPaymentOption('new_card');
      setShowNewCardForm(true);
    }
  }, [user, supabase]);

  useEffect(() => { if (!authLoading) loadCartItem(); }, [authLoading, loadCartItem]);
  useEffect(() => { if (!authLoading && user) loadSavedMethods(); }, [authLoading, user, loadSavedMethods]);

  // Track checkout started once cart is loaded
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

  const handleBillingSwitch = (freq: 'monthly' | 'yearly') => {
    setBillingFrequency(freq);
    if (!cartItem) return;
    const matchingPlan = allPlans.find((p) => p.billing_period === (freq === 'monthly' ? 'monthly' : 'yearly'));
    if (matchingPlan) setCartItem((prev) => prev ? { ...prev, plan: matchingPlan } : prev);
    setAppliedCoupon(null); setCouponCode(''); setCouponError('');
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true); setCouponError(''); setAppliedCoupon(null);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('id, code, coupon_type, discount_value, applies_to, max_uses, used_count, valid_from, valid_until, is_active')
        .ilike('code', couponCode.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) { setCouponError('Coupon code not found or inactive.'); return; }
      if (data.valid_until && new Date(data.valid_until) < new Date()) { setCouponError('This coupon has expired.'); return; }
      if (data.max_uses !== null && data.used_count >= data.max_uses) { setCouponError('This coupon has reached its usage limit.'); return; }
      if (data.applies_to && cartItem && data.applies_to !== cartItem.product.id) { setCouponError('This coupon is not valid for the selected product.'); return; }
      setAppliedCoupon(data as Coupon);
    } catch (err: unknown) {
      setCouponError(err instanceof Error ? err.message : 'Failed to validate coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponCode(''); setCouponError(''); };

  // Card form validation — CVV is intentionally NOT validated (never collected)
  const validateNewCard = (): boolean => {
    const errors: Partial<Record<keyof NewCardForm, string>> = {};
    if (!newCard.cardholder_name.trim()) errors.cardholder_name = 'Cardholder name is required';
    const digits = newCard.card_number.replace(/\s/g, '');
    if (digits.length < 13 || digits.length > 16) errors.card_number = 'Enter a valid card number';
    const expiryParts = newCard.expiry.split('/');
    if (expiryParts.length !== 2 || expiryParts[0].length !== 2 || expiryParts[1].length !== 2) {
      errors.expiry = 'Enter expiry as MM/YY';
    } else {
      const month = parseInt(expiryParts[0], 10);
      const year = parseInt('20' + expiryParts[1], 10);
      const now = new Date();
      if (month < 1 || month > 12 || year < now.getFullYear() ||
        (year === now.getFullYear() && month < now.getMonth() + 1)) {
        errors.expiry = 'Card has expired or invalid date';
      }
    }
    setCardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Save ONLY non-sensitive card metadata to user_metadata.
   * Stores: last4, brand, exp month/year, cardholder name, payment_method_type.
   * NEVER stores: full card number, CVV, or any raw PAN data.
   */
  const saveNonSensitiveCardToMetadata = async (card: NewCardForm): Promise<SavedPaymentMethod> => {
    const digits = card.card_number.replace(/\s/g, '');
    const brand = detectCardBrand(card.card_number);
    const expiryParts = card.expiry.split('/');
    const newMethod: SavedPaymentMethod = {
      id: `card_${Date.now()}`,
      card_last4: digits.slice(-4),
      card_brand: brand,
      card_exp_month: expiryParts[0] ?? '',
      card_exp_year: expiryParts[1] ?? '',
      cardholder_name: card.cardholder_name,
      is_default: savedMethods.length === 0,
      payment_method_type: 'card',
    };
    const updatedMethods = [...savedMethods, newMethod];
    await supabase.auth.updateUser({ data: { payment_methods: updatedMethods } });
    setSavedMethods(updatedMethods);
    setSelectedMethodId(newMethod.id);
    return newMethod;
  };

  const basePrice = cartItem?.plan.price ?? 0;
  const currency = cartItem?.plan.currency ?? 'USD';
  const discountAmount = appliedCoupon
    ? appliedCoupon.coupon_type === 'percentage'
      ? (basePrice * appliedCoupon.discount_value) / 100
      : Math.min(appliedCoupon.discount_value, basePrice)
    : 0;
  const finalAmount = Math.max(0, basePrice - discountAmount);

  // Determine the active payment method type for order metadata
  const getActivePaymentMethodType = (): PaymentMethodType => {
    if (selectedPaymentOption === 'saved_card') {
      return savedMethods.find((m) => m.id === selectedMethodId)?.payment_method_type ?? 'card';
    }
    if (selectedPaymentOption === 'new_card') return 'card';
    // For future providers, the option ID maps directly to the type
    const opt = PAYMENT_OPTIONS.find((o) => o.id === selectedPaymentOption);
    return opt?.type ?? 'card';
  };

  /**
   * Handle Payoneer hosted checkout.
   * Creates a server-side order and Payoneer session, then redirects the user
   * to Payoneer's hosted payment page.
   */
  const handlePayoneerCheckout = async () => {
    if (!user) { router.push('/sign-up-login-screen'); return; }
    if (!cartItem) return;

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

      const data = await res.json() as { orderId?: string; redirectUrl?: string; error?: string };

      if (!res.ok || !data.redirectUrl) {
        setPageError(data.error ?? 'Failed to start Payoneer checkout. Please try again.');
        setPayoneerRedirecting(false);
        return;
      }

      // Redirect to Payoneer's hosted payment page
      // The order is already created server-side with pending_payment status
      window.location.href = data.redirectUrl;
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : 'Failed to start Payoneer checkout.');
      setPayoneerRedirecting(false);
    }
  };

  /**
   * Place order handler for card payments.
   *
   * Security rules enforced:
   * 1. Order is inserted with status = 'pending_payment' — NEVER 'completed'.
   * 2. Only non-sensitive payment metadata is stored in orders.metadata.
   * 3. The architecture is provider-agnostic — no Stripe-specific fields.
   */
  const handlePlaceOrder = async () => {
    if (!user) { router.push('/sign-up-login-screen'); return; }
    if (!cartItem) return;

    // Route Payoneer to its own handler
    if (selectedPaymentOption === 'opt_payoneer') {
      if (payoneerStatus !== 'available') {
        setPageError('Payoneer is temporarily unavailable. Please use a card or try again later.');
        return;
      }
      await handlePayoneerCheckout();
      return;
    }

    // Validate based on selected payment option
    if (selectedPaymentOption === 'new_card') {
      if (!validateNewCard()) return;
    } else if (selectedPaymentOption === 'saved_card' && !selectedMethodId) {
      setPageError('Please select a saved payment method.');
      return;
    } else if (
      selectedPaymentOption !== 'new_card' &&
      selectedPaymentOption !== 'saved_card' &&
      selectedPaymentOption !== 'opt_payoneer'
    ) {
      setPageError('This payment method is coming soon. Please use a card for now.');
      return;
    }

    setSubmitting(true);
    setPageError('');

    try {
      let paymentMeta: {
        payment_method_type: PaymentMethodType;
        card_brand?: string;
        card_last4?: string;
        provider_token?: string;
      };

      if (selectedPaymentOption === 'new_card') {
        if (newCard.save_card) {
          const saved = await saveNonSensitiveCardToMetadata(newCard);
          paymentMeta = { payment_method_type: 'card', card_brand: saved.card_brand, card_last4: saved.card_last4 };
        } else {
          const digits = newCard.card_number.replace(/\s/g, '');
          paymentMeta = { payment_method_type: 'card', card_brand: detectCardBrand(newCard.card_number), card_last4: digits.slice(-4) };
        }
      } else {
        const method = savedMethods.find((m) => m.id === selectedMethodId);
        paymentMeta = {
          payment_method_type: method?.payment_method_type ?? 'card',
          card_brand: method?.card_brand,
          card_last4: method?.card_last4,
          provider_token: method?.provider_token,
        };
      }

      /**
       * Insert order with status = 'pending_payment'. * The order will only be marked'completed' after the payment provider
       * confirms the charge via webhook or server-side verification.
       * provider_payment_ref is left empty — populated by the webhook handler.
       */
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          product_id: cartItem.product.id,
          plan_id: cartItem.plan.id,
          coupon_id: appliedCoupon?.id ?? null,
          status: 'pending_payment',
          amount: finalAmount,
          currency,
          discount_amount: discountAmount,
          provider_payment_ref: '',
          receipt_url: '',
          metadata: {
            billing_frequency: billingFrequency,
            plan_name: cartItem.plan.name,
            product_name: cartItem.product.name,
            payment_method_type: paymentMeta.payment_method_type,
            ...(paymentMeta.card_brand ? { card_brand: paymentMeta.card_brand } : {}),
            ...(paymentMeta.card_last4 ? { card_last4: paymentMeta.card_last4 } : {}),
            ...(paymentMeta.provider_token ? { provider_token: paymentMeta.provider_token } : {}),
          },
        })
        .select('id')
        .single();

      if (orderError) throw orderError;

      // Track purchase event
      trackPurchase({
        id: order.id,
        productName: cartItem.product.name,
        productId: cartItem.product.id,
        amount: finalAmount,
        currency,
      });

      setOrderSuccess(order.id);
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasMonthly = allPlans.some((p) => p.billing_period === 'monthly');
  const hasYearly = allPlans.some((p) => p.billing_period === 'yearly');
  const showBillingToggle = hasMonthly && hasYearly;
  const yearlyPlan = allPlans.find((p) => p.billing_period === 'yearly');
  const monthlyPlan = allPlans.find((p) => p.billing_period === 'monthly');
  const yearlySavings = yearlyPlan && monthlyPlan
    ? Math.round(((monthlyPlan.price * 12 - yearlyPlan.price) / (monthlyPlan.price * 12)) * 100)
    : 0;

  // Order success screen
  if (orderSuccess) {
    return (
      <div className="pt-28 pb-20 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6 ring-4 ring-success/20">
            <CheckCircle2 size={40} className="text-success" />
          </div>
          <h1 className="text-2xl font-800 text-foreground mb-3">Order Received!</h1>
          <p className="text-secondary-foreground mb-2">
            Your order has been submitted and is awaiting payment confirmation.
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Your order will be marked as completed once payment is verified by our payment provider via secure server-side verification.
          </p>
          <p className="text-xs text-muted-foreground mb-8 font-mono bg-secondary px-3 py-1.5 rounded-lg inline-block">
            Order ID: {orderSuccess}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/user-dashboard/orders" className="btn-primary px-6 py-2.5 text-sm">View Orders</Link>
            <Link href="/products" className="btn-secondary px-6 py-2.5 text-sm">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  if (payoneerRedirecting) {
    return (
      <div className="pt-28 pb-20 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
            <ExternalLink size={40} className="text-blue-500" />
          </div>
          <h1 className="text-2xl font-800 text-foreground mb-3">Redirecting to Payoneer…</h1>
          <p className="text-secondary-foreground mb-2">You are being redirected to Payoneer&apos;s secure checkout page.</p>
          <p className="text-xs text-muted-foreground mb-6">Please do not close this window. Your order will be confirmed after payment verification.</p>
          <Loader2 size={32} className="animate-spin text-blue-500 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 max-w-screen-xl mx-auto px-6 lg:px-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/products" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft size={14} />Products
        </Link>
        <ChevronRight size={13} />
        <span className="text-foreground font-600">Checkout</span>
      </div>

      {/* Premium header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-teal flex items-center justify-center shadow-sm">
            <ShoppingCart size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-foreground">Secure Checkout</h1>
            <p className="text-sm text-muted-foreground">Complete your purchase safely</p>
          </div>
        </div>
        {/* Security strip */}
        <div className="flex flex-wrap items-center gap-4 mt-4 p-3 bg-success/5 border border-success/15 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-success font-600">
            <Lock size={12} /> SSL Secured
          </div>
          <div className="flex items-center gap-1.5 text-xs text-primary font-600">
            <Shield size={12} /> PCI Compliant
          </div>
          <div className="flex items-center gap-1.5 text-xs text-warning font-600">
            <Award size={12} /> 30-Day Guarantee
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-600">
            <Users size={12} /> 2,400+ Customers
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-600">
            <Clock size={12} /> Instant Access
          </div>
        </div>
      </div>

      {pageLoading && <CheckoutSkeleton />}

      {!pageLoading && pageError && !cartItem && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center mb-4">
            <AlertCircle size={24} className="text-danger" />
          </div>
          <p className="text-foreground font-600 mb-2">{pageError}</p>
          <Link href="/products" className="btn-secondary text-sm mt-4 px-5 py-2">Browse Products</Link>
        </div>
      )}

      {!pageLoading && cartItem && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* ── Left: Cart + Options ── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Cart item — premium card */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-primary/5 to-accent/5 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-700 text-foreground flex items-center gap-2">
                  <Package size={15} className="text-primary" />Your Order
                </h2>
              </div>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {cartItem.product.thumbnail_url ? (
                    <img src={cartItem.product.thumbnail_url} alt={`${cartItem.product.name} product thumbnail`}
                      className="w-16 h-16 rounded-xl object-cover border border-border flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0 border border-border">
                      <Zap size={22} className="text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${categoryStyles[cartItem.product.category] || 'bg-secondary text-muted-foreground'}`}>
                        {categoryLabel[cartItem.product.category] || 'Other'}
                      </span>
                    </div>
                    <h3 className="text-base font-700 text-foreground truncate">{cartItem.product.name}</h3>
                    {cartItem.product.short_desc && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{cartItem.product.short_desc}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md font-500">{cartItem.plan.name}</span>
                      <span className="text-xs text-muted-foreground">{billingPeriodLabel[cartItem.plan.billing_period]}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-800 text-foreground tabular-nums">{formatCurrency(cartItem.plan.price, currency)}</div>
                    {cartItem.plan.billing_period === 'monthly' && <div className="text-xs text-muted-foreground">/mo</div>}
                    {cartItem.plan.billing_period === 'yearly' && <div className="text-xs text-muted-foreground">/yr</div>}
                  </div>
                </div>
                {cartItem.plan.features && cartItem.plan.features.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs font-600 text-muted-foreground mb-2 uppercase tracking-wide">What&apos;s Included</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {cartItem.plan.features.slice(0, 6).map((feat, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-secondary-foreground">
                          <CheckCircle2 size={12} className="text-success flex-shrink-0" />{feat}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Billing frequency toggle */}
            {showBillingToggle && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-primary/5 to-accent/5 px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-700 text-foreground flex items-center gap-2">
                    <RefreshCw size={15} className="text-primary" />Billing Frequency
                  </h2>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 bg-secondary rounded-xl p-1.5">
                    <button onClick={() => handleBillingSwitch('monthly')}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-600 transition-all duration-150 ${billingFrequency === 'monthly' ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}>
                      Monthly
                      {monthlyPlan && <span className="block text-xs font-500 mt-0.5 opacity-70">{formatCurrency(monthlyPlan.price, currency)}/mo</span>}
                    </button>
                    <button onClick={() => handleBillingSwitch('yearly')}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-600 transition-all duration-150 relative ${billingFrequency === 'yearly' ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}>
                      Yearly
                      {yearlyPlan && <span className="block text-xs font-500 mt-0.5 opacity-70">{formatCurrency(yearlyPlan.price, currency)}/yr</span>}
                      {yearlySavings > 0 && (
                        <span className="absolute -top-2 right-2 text-[10px] font-700 bg-success text-white px-1.5 py-0.5 rounded-full">Save {yearlySavings}%</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method */}
            {user && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-primary/5 to-accent/5 px-5 py-3 border-b border-border">
                  <h2 className="text-sm font-700 text-foreground flex items-center gap-2">
                    <CreditCard size={15} className="text-primary" />Payment Method
                  </h2>
                </div>
                <div className="p-5">
                  {/* Security notice */}
                  <div className="flex items-start gap-2 bg-success/5 border border-success/15 rounded-xl px-3 py-2.5 mb-4">
                    <Shield size={13} className="text-success flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-secondary-foreground leading-relaxed">
                      Payment is processed securely. Sensitive card data is never stored on our servers — only the last 4 digits and card type are saved for reference.
                    </p>
                  </div>

                  {savedMethods.length > 0 && (
                    <div className="space-y-2 mb-3">
                      <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">Saved Cards</p>
                      {savedMethods.map((method) => (
                        <button key={method.id} type="button"
                          onClick={() => { setSelectedPaymentOption('saved_card'); setSelectedMethodId(method.id); setShowNewCardForm(false); setCardErrors({}); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${selectedPaymentOption === 'saved_card' && selectedMethodId === method.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-secondary/40 hover:border-border/80 hover:bg-secondary/60'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${selectedPaymentOption === 'saved_card' && selectedMethodId === method.id ? 'border-primary' : 'border-muted-foreground/40'}`}>
                            {selectedPaymentOption === 'saved_card' && selectedMethodId === method.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <div className="w-10 h-7 bg-secondary border border-border rounded-md flex items-center justify-center flex-shrink-0">
                            <CreditCard size={14} className="text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-600 text-foreground capitalize">{method.card_brand}</span>
                              <span className="text-sm text-foreground">•••• {method.card_last4}</span>
                              {method.is_default && <span className="text-[10px] font-600 bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Default</span>}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{method.cardholder_name} · Expires {method.card_exp_month}/{method.card_exp_year}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-2">
                      {savedMethods.length > 0 ? 'Other Payment Methods' : 'Select Payment Method'}
                    </p>

                    {PAYMENT_OPTIONS.map((opt) => {
                      const isPayoneer = opt.group === 'payoneer';
                      const isCrypto = opt.group === 'crypto';
                      const isPayoneerUnavailable = isPayoneer && payoneerStatus !== 'available';
                      const isPayoneerChecking = isPayoneer && payoneerStatus === 'checking';
                      const isFuture = isCrypto || isPayoneerUnavailable;
                      const isSelected = selectedPaymentOption === opt.id ||
                        (opt.id === 'opt_card' && selectedPaymentOption === 'new_card');

                      let badgeContent = opt.badge;
                      let badgeStyle = 'bg-secondary text-muted-foreground border border-border';
                      if (isPayoneer) {
                        if (payoneerStatus === 'available') {
                          badgeContent = 'Available';
                          badgeStyle = 'bg-success/10 text-success border border-success/20';
                        } else if (payoneerStatus === 'checking') {
                          badgeContent = 'Checking…';
                          badgeStyle = 'bg-secondary text-muted-foreground border border-border';
                        } else {
                          badgeContent = 'Temporarily unavailable';
                          badgeStyle = 'bg-warning/10 text-warning border border-warning/20';
                        }
                      }

                      return (
                        <button key={opt.id} type="button"
                          onClick={() => {
                            if (isFuture || isPayoneerChecking) return;
                            if (opt.group === 'card') {
                              setSelectedPaymentOption('new_card');
                              setShowNewCardForm(true);
                              setSelectedMethodId(null);
                            } else if (isPayoneer && payoneerStatus === 'available') {
                              setSelectedPaymentOption(opt.id);
                              setShowNewCardForm(false);
                            }
                            setCardErrors({});
                          }}
                          disabled={isFuture || isPayoneerChecking}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                            isFuture || isPayoneerChecking
                              ? 'opacity-50 cursor-not-allowed border-border bg-secondary/20'
                              : isSelected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/20' :'border-border bg-secondary/40 hover:border-border/80 hover:bg-secondary/60'
                          }`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected && !isFuture ? 'border-primary' : 'border-muted-foreground/40'}`}>
                            {isSelected && !isFuture && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <div className="w-10 h-7 bg-secondary border border-border rounded-md flex items-center justify-center flex-shrink-0">
                            {opt.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-600 text-foreground">{opt.label}</span>
                              {badgeContent && (
                                <span className={`text-[10px] font-600 px-1.5 py-0.5 rounded-full ${badgeStyle}`}>{badgeContent}</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
                          </div>
                          {isPayoneer && payoneerStatus === 'available' && (
                            <ExternalLink size={12} className="text-muted-foreground flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}

                    {savedMethods.length > 0 && (
                      <button type="button"
                        onClick={() => { setSelectedPaymentOption('new_card'); setShowNewCardForm(true); setSelectedMethodId(null); setCardErrors({}); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${selectedPaymentOption === 'new_card' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-dashed border-border hover:border-primary/40 hover:bg-secondary/40'}`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${selectedPaymentOption === 'new_card' ? 'border-primary' : 'border-muted-foreground/40'}`}>
                          {selectedPaymentOption === 'new_card' && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <Plus size={14} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-600 text-muted-foreground">Add new card</span>
                      </button>
                    )}
                  </div>

                  {selectedPaymentOption === 'opt_payoneer' && payoneerStatus === 'available' && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/15 rounded-xl px-3 py-2.5">
                        <ExternalLink size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-secondary-foreground leading-relaxed">
                          You will be redirected to Payoneer&apos;s secure hosted checkout page to complete your payment.
                        </p>
                      </div>
                    </div>
                  )}

                  {(selectedPaymentOption === 'new_card' || (showNewCardForm && selectedPaymentOption !== 'opt_payoneer')) && (
                    <div className="space-y-3 pt-4 mt-3 border-t border-border">
                      <div>
                        <label className="block text-xs font-600 text-muted-foreground mb-1.5">Cardholder Name</label>
                        <input type="text" placeholder="Full name on card" value={newCard.cardholder_name}
                          onChange={(e) => { setNewCard((p) => ({ ...p, cardholder_name: e.target.value })); setCardErrors((p) => ({ ...p, cardholder_name: undefined })); }}
                          className={`w-full px-3 py-2.5 text-sm bg-secondary border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all ${cardErrors.cardholder_name ? 'border-danger/50' : 'border-border'}`} />
                        {cardErrors.cardholder_name && <p className="text-xs text-danger mt-1 flex items-center gap-1"><AlertCircle size={11} />{cardErrors.cardholder_name}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-600 text-muted-foreground mb-1.5">Card Number</label>
                        <div className="relative">
                          <input type="text" inputMode="numeric" placeholder="1234 5678 9012 3456"
                            value={newCard.card_number}
                            onChange={(e) => { setNewCard((p) => ({ ...p, card_number: formatCardNumber(e.target.value) })); setCardErrors((p) => ({ ...p, card_number: undefined })); }}
                            maxLength={19} autoComplete="cc-number"
                            className={`w-full px-3 py-2.5 pr-16 text-sm bg-secondary border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all font-mono tracking-wider ${cardErrors.card_number ? 'border-danger/50' : 'border-border'}`} />
                          {newCard.card_number && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-600 text-muted-foreground capitalize">{detectCardBrand(newCard.card_number)}</span>
                          )}
                        </div>
                        {cardErrors.card_number && <p className="text-xs text-danger mt-1 flex items-center gap-1"><AlertCircle size={11} />{cardErrors.card_number}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-600 text-muted-foreground mb-1.5">Expiry Date</label>
                        <input type="text" inputMode="numeric" placeholder="MM/YY" value={newCard.expiry}
                          onChange={(e) => { setNewCard((p) => ({ ...p, expiry: formatExpiry(e.target.value) })); setCardErrors((p) => ({ ...p, expiry: undefined })); }}
                          maxLength={5} autoComplete="cc-exp"
                          className={`w-full px-3 py-2.5 text-sm bg-secondary border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all font-mono ${cardErrors.expiry ? 'border-danger/50' : 'border-border'}`} />
                        {cardErrors.expiry && <p className="text-xs text-danger mt-1 flex items-center gap-1"><AlertCircle size={11} />{cardErrors.expiry}</p>}
                        <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                          <Lock size={10} />CVV is entered directly with your payment provider — never stored here.
                        </p>
                      </div>
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <div onClick={() => setNewCard((p) => ({ ...p, save_card: !p.save_card }))}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${newCard.save_card ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                          {newCard.save_card && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <span onClick={() => setNewCard((p) => ({ ...p, save_card: !p.save_card }))}
                          className="text-xs text-secondary-foreground select-none">
                          Save card info (last 4 digits &amp; type only) for future purchases
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Coupon */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-primary/5 to-accent/5 px-5 py-3 border-b border-border">
                <h2 className="text-sm font-700 text-foreground flex items-center gap-2">
                  <Tag size={15} className="text-primary" />Coupon Code
                </h2>
              </div>
              <div className="p-5">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-success/5 border border-success/20 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-success" />
                      <div>
                        <span className="text-sm font-700 text-foreground font-mono">{appliedCoupon.code}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {appliedCoupon.coupon_type === 'percentage' ? `${appliedCoupon.discount_value}% off` : `${formatCurrency(appliedCoupon.discount_value, currency)} off`}
                        </span>
                      </div>
                    </div>
                    <button onClick={removeCoupon} className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input type="text" placeholder="Enter coupon code" value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                        className="flex-1 px-3 py-2.5 text-sm bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all font-mono" />
                      <button onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}
                        className="px-4 py-2.5 bg-primary text-white text-sm font-600 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                        {couponLoading ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-danger flex items-center gap-1.5"><AlertCircle size={12} />{couponError}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Order Summary ── */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-2xl overflow-hidden sticky top-24">
              {/* Summary header */}
              <div className="bg-gradient-to-r from-primary/8 to-accent/8 px-5 py-4 border-b border-border">
                <h2 className="text-sm font-700 text-foreground">Order Summary</h2>
              </div>

              <div className="p-5">
                <div className="space-y-3 mb-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{cartItem.plan.name}</span>
                    <span className="font-600 text-foreground tabular-nums">{formatCurrency(basePrice, currency)}</span>
                  </div>

                  {appliedCoupon && discountAmount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-success flex items-center gap-1.5"><Tag size={12} />Coupon ({appliedCoupon.code})</span>
                      <span className="font-600 text-success tabular-nums">-{formatCurrency(discountAmount, currency)}</span>
                    </div>
                  )}

                  {user && selectedPaymentOption === 'saved_card' && (() => {
                    const method = savedMethods.find((m) => m.id === selectedMethodId);
                    return method ? (
                      <div className="flex items-center justify-between text-sm pt-1">
                        <span className="text-muted-foreground flex items-center gap-1.5"><CreditCard size={12} />Payment</span>
                        <span className="text-foreground font-500 capitalize">{method.card_brand} •••• {method.card_last4}</span>
                      </div>
                    ) : null;
                  })()}

                  {user && selectedPaymentOption === 'new_card' && newCard.card_number.replace(/\s/g, '').length >= 4 && (
                    <div className="flex items-center justify-between text-sm pt-1">
                      <span className="text-muted-foreground flex items-center gap-1.5"><CreditCard size={12} />Payment</span>
                      <span className="text-foreground font-500 capitalize">{detectCardBrand(newCard.card_number)} •••• {newCard.card_number.replace(/\s/g, '').slice(-4)}</span>
                    </div>
                  )}

                  {user && selectedPaymentOption === 'opt_payoneer' && (
                    <div className="flex items-center justify-between text-sm pt-1">
                      <span className="text-muted-foreground flex items-center gap-1.5"><Wallet size={12} />Payment</span>
                      <span className="text-foreground font-500">Payoneer</span>
                    </div>
                  )}

                  <div className="border-t border-border pt-3 flex items-center justify-between">
                    <span className="text-sm font-700 text-foreground">Total</span>
                    <div className="text-right">
                      <span className="text-xl font-800 text-foreground tabular-nums">{formatCurrency(finalAmount, currency)}</span>
                      {cartItem.plan.billing_period === 'monthly' && <div className="text-xs text-muted-foreground">/month</div>}
                      {cartItem.plan.billing_period === 'yearly' && <div className="text-xs text-muted-foreground">/year</div>}
                    </div>
                  </div>
                </div>

                {/* Pending payment notice */}
                <div className="mb-4 p-3 bg-secondary/60 border border-border rounded-xl text-xs text-muted-foreground flex items-start gap-2">
                  <Info size={12} className="flex-shrink-0 mt-0.5 text-primary" />
                  <span>Order status updates to <strong className="text-foreground">Completed</strong> after server-side payment verification.</span>
                </div>

                {!user && !authLoading && (
                  <div className="mb-4 p-3 bg-warning/5 border border-warning/20 rounded-xl text-xs text-warning flex items-start gap-2">
                    <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                    <span>You need to be signed in to complete your purchase.</span>
                  </div>
                )}

                {pageError && cartItem && (
                  <div className="mb-4 p-3 bg-danger/5 border border-danger/20 rounded-xl text-xs text-danger flex items-start gap-2">
                    <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                    <span>{pageError}</span>
                  </div>
                )}

                {/* CTA Button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={submitting || authLoading || payoneerRedirecting}
                  className="w-full py-3.5 bg-gradient-teal text-white font-700 text-sm rounded-xl hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm">
                  {submitting || payoneerRedirecting
                    ? (<><Loader2 size={16} className="animate-spin" />Processing…</>)
                    : !user
                    ? 'Sign In to Complete Order'
                    : selectedPaymentOption === 'opt_payoneer'
                    ? (<><ExternalLink size={14} />Pay with Payoneer</>)
                    : (<><Lock size={14} />Complete Purchase</>)}
                </button>

                <p className="text-center text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
                  <Lock size={11} />Secure checkout — sensitive data handled by payment provider
                </p>

                {/* Trust Badges */}
                <TrustBadges />

                {/* Social Proof */}
                <SocialProof />

                <div className="mt-4 pt-4 border-t border-border text-center">
                  <Link href={`/products/${cartItem.product.slug}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
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

// ─── Page ─────────────────────────────────────────────────────────────────────

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
