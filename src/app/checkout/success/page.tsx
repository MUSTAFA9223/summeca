'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/client';
import { trackPurchase } from '@/lib/analytics';
import { trackFunnelEvent } from '@/lib/funnelAnalytics';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  PackageCheck,
  ShoppingBag,
} from 'lucide-react';

type OrderState = {
  id: string;
  status: string;
  amount: number | string | null;
  currency: string | null;
  product_id: string | null;
  plan_id: string | null;
  receipt_url: string | null;
};

type PurchaseDetails = {
  productName: string;
  productSlug: string;
  planName: string;
  billingPeriod: string;
};

const ORDER_POLL_INTERVAL_MS = 5000;
const ORDER_POLL_WINDOW_MS = 120000;

const SAAS_DESTINATIONS: Record<string, string> = {
  'summeca-invoiceflow': '/user-dashboard/invoiceflow',
  'summeca-leadfollow-ai': '/user-dashboard/leadfollow',
  'summeca-proposalflow-ai': '/user-dashboard/proposalflow',
  'summeca-siteagent-ai': '/user-dashboard/siteagent',
};

const ACCESS_LABELS: Record<string, string> = {
  one_time: 'One-time purchase',
  monthly: '1-month access',
  yearly: '1-year access',
  lifetime: 'Lifetime access',
};

function getDeliveryDetails(slug: string) {
  const destination = SAAS_DESTINATIONS[slug];
  if (destination) {
    return {
      destination,
      deliveryType: 'Account-based SaaS access',
      locationHint: 'You can open this product later from your SUMMECA dashboard.',
    };
  }

  return {
    destination: '/user-dashboard/downloads',
    deliveryType: 'Protected digital download',
    locationHint: 'You can find protected product files later in Dashboard → Downloads.',
  };
}

function CheckoutSuccessInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('order_id')?.trim() ?? '';
  const supabase = useMemo(() => createClient(), []);
  const [order, setOrder] = useState<OrderState | null>(null);
  const [purchaseDetails, setPurchaseDetails] = useState<PurchaseDetails | null>(null);
  const [checking, setChecking] = useState(Boolean(orderId));
  const [lookupFailed, setLookupFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();

    async function loadPurchaseDetails(nextOrder: OrderState) {
      if (!nextOrder.product_id) return;

      const productId = nextOrder.product_id;
      const [{ data: product }, { data: plan }] = await Promise.all([
        supabase
          .from('products')
          .select('id, name, slug')
          .eq('id', productId)
          .maybeSingle(),
        nextOrder.plan_id
          ? supabase
              .from('product_plans')
              .select('id, name, billing_period')
              .eq('id', nextOrder.plan_id)
              .eq('product_id', productId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (cancelled) return;
      setPurchaseDetails({
        productName: typeof product?.name === 'string' && product.name.trim()
          ? product.name
          : 'SUMMECA product',
        productSlug: typeof product?.slug === 'string' ? product.slug : '',
        planName: typeof plan?.name === 'string' && plan.name.trim()
          ? plan.name
          : 'Purchased plan',
        billingPeriod: typeof plan?.billing_period === 'string'
          ? plan.billing_period
          : '',
      });
    }

    async function loadOrder() {
      if (!orderId) {
        setChecking(false);
        setLookupFailed(true);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('id, status, amount, currency, product_id, plan_id, receipt_url')
        .eq('id', orderId)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setOrder(null);
        setPurchaseDetails(null);
        setLookupFailed(true);
        setChecking(false);
        return;
      }

      const nextOrder = data as OrderState;
      setOrder(nextOrder);
      setLookupFailed(false);
      setChecking(false);

      if (nextOrder.status === 'completed') {
        void loadPurchaseDetails(nextOrder);
      }

      const terminal = nextOrder.status === 'completed'
        || nextOrder.status === 'failed'
        || nextOrder.status === 'cancelled'
        || nextOrder.status === 'refunded';
      if (!terminal && Date.now() - startedAt < ORDER_POLL_WINDOW_MS) {
        pollTimer = setTimeout(() => void loadOrder(), ORDER_POLL_INTERVAL_MS);
      }
    }

    void loadOrder();
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [orderId, supabase]);

  useEffect(() => {
    if (!order || !order.product_id) return;

    const amount = Number(order.amount ?? NaN);
    const paidCompleted = order.status === 'completed' && Number.isFinite(amount) && amount > 0;
    const failedPayment = order.status === 'failed' || order.status === 'cancelled' || order.status === 'refunded';
    if (!paidCompleted && !failedPayment) return;

    const eventType = paidCompleted ? 'payment_completed' : 'payment_failed';
    const storageKey = `summeca:funnel:${eventType}:${order.id}`;

    try {
      if (window.localStorage.getItem(storageKey) === '1') return;
    } catch {
      // Funnel tracking is best-effort when browser storage is unavailable.
    }

    trackFunnelEvent(eventType, {
      productId: order.product_id,
      orderId: order.id,
      amount: Number.isFinite(amount) ? amount : 0,
      currency: order.currency || 'USD',
      reason: failedPayment ? order.status : '',
      source: 'checkout_result',
    });

    try {
      window.localStorage.setItem(storageKey, '1');
    } catch {
      // Server analytics can still accept the event without local persistence.
    }
  }, [order]);

  useEffect(() => {
    if (!order || order.status !== 'completed' || !order.product_id) return;

    const productId = order.product_id;
    const verifiedOrder = order;
    const amount = Number(verifiedOrder.amount ?? NaN);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const storageKey = `summeca:ga4:purchase:${verifiedOrder.id}`;
    try {
      if (window.localStorage.getItem(storageKey) === '1') return;
    } catch {
      // Analytics may still run when storage is unavailable.
    }

    let cancelled = false;

    async function sendVerifiedPurchase() {
      const { data: product } = await supabase
        .from('products')
        .select('id, name')
        .eq('id', productId)
        .maybeSingle();

      if (cancelled) return;

      // gtag is loaded after hydration. Give it a short window before sending
      // so a verified purchase is not lost during a fast return redirect.
      for (let attempt = 0; attempt < 20 && typeof window.gtag !== 'function'; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        if (cancelled) return;
      }
      if (typeof window.gtag !== 'function' || cancelled) return;

      trackPurchase({
        id: verifiedOrder.id,
        productName: typeof product?.name === 'string' && product.name.trim()
          ? product.name
          : 'SUMMECA product',
        productId,
        amount,
        currency: verifiedOrder.currency || 'USD',
      });

      try {
        window.localStorage.setItem(storageKey, '1');
      } catch {
        // GA4 also deduplicates ecommerce purchases by transaction_id.
      }
    }

    void sendVerifiedPurchase();
    return () => { cancelled = true; };
  }, [order, supabase]);

  const completed = order?.status === 'completed';
  const freeCompleted = completed && Number(order?.amount ?? NaN) === 0;
  const cancelledPayment = order?.status === 'cancelled';
  const failed = order?.status === 'failed' || order?.status === 'refunded';
  const terminalFailure = failed || cancelledPayment;
  const delivery = purchaseDetails
    ? getDeliveryDetails(purchaseDetails.productSlug)
    : null;
  const accessDuration = purchaseDetails?.billingPeriod
    ? ACCESS_LABELS[purchaseDetails.billingPeriod] || purchaseDetails.billingPeriod
    : 'Access according to the purchased plan';

  const heading = checking
    ? 'Preparing your order status…'
    : freeCompleted
      ? 'Access Granted!'
      : completed
        ? 'Payment Confirmed!'
        : cancelledPayment
          ? 'Payment Cancelled'
          : failed
            ? 'Payment Failed'
            : lookupFailed
              ? 'Order Status Unavailable'
              : 'Awaiting Payment Confirmation';

  const description = checking
    ? 'We are reading the current order state from your SUMMECA account.'
    : freeCompleted
      ? 'Your zero-value order is complete and eligible access has been added to your account.'
      : completed
        ? 'Your payment has been verified and the order is complete.'
        : cancelledPayment
          ? 'This payment was cancelled. No paid access was granted.'
          : failed
            ? 'This payment was not completed successfully. No paid access was granted.'
            : lookupFailed
              ? 'We could not verify this order for the signed-in account. Sign in with the purchasing account and open your Orders page.'
              : 'Your order exists, but SUMMECA is still waiting for verified provider confirmation.';

  const detail = checking
    ? 'Do not retry payment until the current status finishes loading.'
    : completed
      ? delivery?.locationHint || 'Open your dashboard to view your purchased product.'
      : terminalFailure
        ? 'Return to the product or checkout if you want to start a new payment safely.'
        : lookupFailed
          ? 'A URL parameter or return redirect is never treated as proof of payment or access.'
          : 'Paid access is granted only after the server-side order state is confirmed as completed.';

  const iconClass = completed
    ? 'bg-success/10'
    : terminalFailure || lookupFailed
      ? 'bg-danger/10'
      : 'bg-warning/10';
  const icon = checking
    ? <Loader2 size={40} className="animate-spin text-primary" />
    : completed
      ? <CheckCircle2 size={40} className="text-success" />
      : terminalFailure || lookupFailed
        ? <AlertCircle size={40} className="text-danger" />
        : <Info size={40} className="text-warning" />;

  return (
    <div className="pt-28 pb-[max(5rem,env(safe-area-inset-bottom))] flex items-center justify-center px-4 sm:px-6">
      <div className="max-w-2xl w-full text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${iconClass}`}>
          {icon}
        </div>
        <h1 className="text-2xl font-800 text-foreground mb-3">{heading}</h1>
        <p className="text-secondary-foreground mb-2">{description}</p>
        <p className="text-xs text-muted-foreground mb-5">{detail}</p>

        {orderId && (
          <p className="text-xs text-muted-foreground mb-6 font-mono bg-secondary px-3 py-1.5 rounded-lg inline-block break-all">
            Order ID: {orderId}
          </p>
        )}

        {completed && (
          <div className="text-left bg-card border border-border rounded-2xl p-5 sm:p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <PackageCheck size={18} className="text-success" />
              <h2 className="font-700 text-foreground">Purchase details</h2>
            </div>
            <dl className="space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <dt className="text-muted-foreground">Product</dt>
                <dd className="font-600 sm:text-right">{purchaseDetails?.productName || 'SUMMECA product'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="font-600 sm:text-right">{purchaseDetails?.planName || 'Purchased plan'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <dt className="text-muted-foreground">Access duration</dt>
                <dd className="font-600 sm:text-right">{accessDuration}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <dt className="text-muted-foreground">Delivery type</dt>
                <dd className="font-600 sm:text-right">{delivery?.deliveryType || 'Account delivery'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-t border-border pt-3">
                <dt className="text-muted-foreground">Order total</dt>
                <dd className="font-700 sm:text-right">
                  {Number(order?.amount ?? 0) === 0
                    ? 'Free'
                    : `${Number(order?.amount ?? 0).toFixed(2)} ${order?.currency || 'USD'}`}
                </dd>
              </div>
            </dl>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {completed && delivery && (
            <Link
              href={delivery.destination}
              className="btn-primary px-6 py-3 text-sm flex items-center gap-2 justify-center min-h-11"
            >
              Open your product <ArrowRight size={14} />
            </Link>
          )}
          <Link
            href="/user-dashboard/orders"
            className={completed && delivery
              ? 'btn-secondary px-6 py-3 text-sm flex items-center gap-2 justify-center min-h-11'
              : 'btn-primary px-6 py-3 text-sm flex items-center gap-2 justify-center min-h-11'}
          >
            <ShoppingBag size={14} /> View Orders
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
          {completed && order?.receipt_url && (
            <a
              href={order.receipt_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              <FileText size={13} /> View receipt
            </a>
          )}
          <Link href="/support" className="text-primary hover:underline">Contact support</Link>
          <Link href="/products" className="text-muted-foreground hover:text-foreground">Continue shopping</Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <Suspense fallback={<div className="pt-28 pb-20 flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <CheckoutSuccessInner />
      </Suspense>
      <PublicFooter />
    </div>
  );
}
