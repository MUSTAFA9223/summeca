'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { Info, ShoppingBag } from 'lucide-react';

function CheckoutSuccessInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('order_id');

  return (
    <div className="pt-28 pb-20 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
          <Info size={40} className="text-warning" />
        </div>
        <h1 className="text-2xl font-800 text-foreground mb-3">Payment Submitted!</h1>
        <p className="text-secondary-foreground mb-2">
          Thank you for your payment. Your order is being verified.
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Your order will be marked as completed once our payment provider confirms the transaction via secure server-side verification. This usually takes a few moments.
        </p>
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
