'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, CheckCircle2, Info, Loader2, ShoppingBag } from 'lucide-react';

type OrderState = {
  id: string;
  status: string;
  amount: number | string | null;
  currency: string | null;
};

function CheckoutSuccessInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('order_id')?.trim() ?? '';
  const supabase = useMemo(() => createClient(), []);
  const [order, setOrder] = useState<OrderState | null>(null);
  const [checking, setChecking] = useState(Boolean(orderId));
  const [lookupFailed, setLookupFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      if (!orderId) {
        setChecking(false);
        setLookupFailed(true);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('id, status, amount, currency')
        .eq('id', orderId)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setOrder(null);
        setLookupFailed(true);
      } else {
        setOrder(data as OrderState);
        setLookupFailed(false);
      }
      setChecking(false);
    }

    void loadOrder();
    return () => { cancelled = true; };
  }, [orderId, supabase]);

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
