'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { CheckCircle2, Info, ShoppingBag } from 'lucide-react';

function CheckoutSuccessInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('order_id');
  const isFree = searchParams?.get('free') === '1';

  return (
    <div className="pt-28 pb-20 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isFree ? 'bg-success/10' : 'bg-warning/10'}`}>
          {isFree ? (
            <CheckCircle2 size={40} className="text-success" />
          ) : (
            <Info size={40} className="text-warning" />
          )}
        </div>
        <h1 className="text-2xl font-800 text-foreground mb-3">
          {isFree ? 'Access Granted!' : 'Payment Submitted!'}
        </h1>
        <p className="text-secondary-foreground mb-2">
          {isFree
            ? 'Your free order is complete and your access has been added to your SUMMECA account.'
            : 'Thank you for your payment. Your order is being verified.'}
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          {isFree
            ? 'You can open your dashboard now to view the order and any available downloads or subscription access.'
            : 'Your order will be marked as completed once our payment provider confirms the transaction via secure server-side verification. This usually takes a few moments.'}
        </p>
        {orderId && (
          <p className="text-xs text-muted-foreground mb-8 font-mono bg-secondary px-3 py-1.5 rounded-lg inline-block">
            Order ID: {orderId}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={isFree ? '/user-dashboard' : '/user-dashboard/orders'} className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2 justify-center">
            <ShoppingBag size={14} />{isFree ? 'Open Dashboard' : 'View Orders'}
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
