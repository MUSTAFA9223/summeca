'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { AlertCircle, ArrowLeft, LifeBuoy, RotateCcw, ShoppingBag } from 'lucide-react';

function CheckoutCancelInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('order_id')?.trim() ?? '';
  const productId = searchParams?.get('product_id')?.trim() ?? '';
  const planId = searchParams?.get('plan_id')?.trim() ?? '';

  const retryParams = new URLSearchParams();
  if (productId) retryParams.set('product_id', productId);
  if (planId) retryParams.set('plan_id', planId);
  const retryHref = productId ? `/checkout?${retryParams.toString()}` : '/products';

  return (
    <div className="pt-28 pb-[max(5rem,env(safe-area-inset-bottom))] flex items-center justify-center px-4 sm:px-6">
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={40} className="text-warning" />
        </div>
        <h1 className="text-2xl font-800 text-foreground mb-3">Payment Cancelled</h1>
        <p className="text-secondary-foreground mb-2">
          The payment flow was cancelled before SUMMECA received verified completion.
        </p>
        <p className="text-xs text-muted-foreground mb-5">
          This return page does not grant product access. You can safely return to checkout and start a new payment, or review the order status from your account.
        </p>
        {orderId && (
          <p className="text-xs text-muted-foreground mb-7 font-mono bg-secondary px-3 py-1.5 rounded-lg inline-block break-all">
            Order ID: {orderId}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={retryHref} className="btn-primary px-6 py-3 text-sm flex items-center gap-2 justify-center min-h-11">
            {productId ? <RotateCcw size={14} /> : <ArrowLeft size={14} />}
            {productId ? 'Return to Checkout' : 'Back to Products'}
          </Link>
          <Link href="/user-dashboard/orders" className="btn-secondary px-6 py-3 text-sm flex items-center gap-2 justify-center min-h-11">
            <ShoppingBag size={14} /> View Orders
          </Link>
        </div>

        <Link href="/support" className="mt-5 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
          <LifeBuoy size={13} /> Contact support
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <Suspense fallback={<div className="pt-28 pb-20 flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
        <CheckoutCancelInner />
      </Suspense>
      <PublicFooter />
    </div>
  );
}
