'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/client';
import { trackPurchase } from '@/lib/analytics';
import { AlertCircle, CheckCircle2, Info, Loader2, ShoppingBag } from 'lucide-react';

type OrderState = {
  id: string;
  status: string;
  amount: number | string | null;
  currency: string | null;
  product_id: string | null;
};

const ORDER_POLL_INTERVAL_MS = 5000;
const ORDER_POLL_WINDOW_MS = 120000;

function CheckoutSuccessInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('order_id')?.trim() ?? '';
  const supabase = useMemo(() => createClient(), []);
  const [order, setOrder] = useState<OrderState | null>(null);
  const [checking, setChecking] = useState(Boolean(orderId));
  const [lookupFailed, setLookupFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();

    async function loadOrder() {
      if (!orderId) {
        setChecking(false);
        setLookupFailed(true);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('id, status, amount, currency, product_id')
        .eq('id', orderId)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setOrder(null);
        setLookupFailed(true);
        setChecking(false);
        return;
      }

      const nextOrder = data as OrderState;
      setOrder(nextOrder);
      setLookupFailed(false);
      setChecking(false);

      const terminal = nextOrder.status === 'completed'
        || nextOrder.status === 'failed'
        || nextOrder.status === 'cancelled';
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
    if (!order || order.status !== 'completed' || !order.product_id) return;

    const amount = Number(order.amount ?? NaN);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const storageKey = `summeca:ga4:purchase:${order.id}`;
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
        .eq('id', order.product_id)
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
        id: order.id,
        productName: typeof product?.name === 'string' && product.name.trim()
          ? product.name
          : 'SUMMECA product',
        productId: order.product_id,
        amount,
        currency: order.currency || 'USD',
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
  const failed = order?.status === 'failed' || order?.status === 'cancelled';

  const heading = checking
    ? 'Checking your order…'
    : freeCompleted
      ? 'Access Granted!'
      : completed
        ? 'Payment Confirmed!'
        : failed
          ? 'Payment Not Completed'
          : lookupFailed
            ? 'Order Status Unavailable'
            : 'Payment Submitted!';

  const description = checking
    ? 'We are reading the current order state from your SUMMECA account.'
    : freeCompleted
      ? 'Your zero-value order is complete and eligible access has been added to your account.'
      : completed
        ? 'Your payment has been verified and the order is complete.'
        : failed
          ? 'This order was not completed. No paid access was granted.'
          : lookupFailed
            ? 'We could not verify this order for the signed-in account. Sign in with the purchasing account and open your Orders page.'
            : 'Your payment was submitted and the order is still waiting for verified provider confirmation.';

  const detail = checking
    ? 'Do not retry payment until the current status finishes loading.'
    : completed
      ? 'Open your dashboard to view the order, subscription, or any available downloads.'
      : failed
        ? 'You can return to checkout and start a new payment if you still want this product.'
        : lookupFailed
          ? 'A URL parameter is never treated as proof of payment or free access.'
          : 'SUMMECA grants paid access only after a trusted server-side webhook confirms the transaction.';

  const iconClass = completed ? 'bg-success/10' : failed || lookupFailed ? 'bg-danger/10' : 'bg-warning/10';
  const icon = checking
    ? <Loader2 size={40} className="animate-spin text-primary" />
    : completed
      ? <CheckCircle2 size={40} className="text-success" />
      : failed || lookupFailed
        ? <AlertCircle size={40} className="text-danger" />
        : <Info size={40} className="text-warning" />;

  return (
    <div className="pt-28 pb-20 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${iconClass}`}>
          {icon}
        </div>
        <h1 className="text-2xl font-800 text-foreground mb-3">{heading}</h1>
        <p className="text-secondary-foreground mb-2">{description}</p>
        <p className="text-xs text-muted-foreground mb-4">{detail}</p>
        {orderId && (
          <p className="text-xs text-muted-foreground mb-8 font-mono bg-secondary px-3 py-1.5 rounded-lg inline-block">
            Order ID: {orderId}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/user-dashboard/orders" className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2 justify-center">
            <ShoppingBag size={14} />View Orders
          </Link>
          <Link href="/products" className="btn-secondary px-6 py-2.5 text-sm">Continue Shopping</Link>
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
