'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { AlertCircle, ArrowLeft } from 'lucide-react';

function CheckoutCancelInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('order_id');

  return (
    <div className="pt-28 pb-20 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={40} className="text-warning" />
        </div>
        <h1 className="text-2xl font-800 text-foreground mb-3">Payment Cancelled</h1>
        <p className="text-secondary-foreground mb-2">
          Your payment was cancelled. No charge has been made.
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Your order has been recorded but will remain in a pending state until payment is completed. You can try again or choose a different payment method.
        </p>
        {orderId && (
          <p className="text-xs text-muted-foreground mb-8 font-mono bg-secondary px-3 py-1.5 rounded-lg inline-block">
            Order ID: {orderId}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/products" className="btn-primary px-6 py-2.5 text-sm flex items-center gap-2 justify-center">
            <ArrowLeft size={14} />Back to Products
          </Link>
          <Link href="/user-dashboard/orders" className="btn-secondary px-6 py-2.5 text-sm">View Orders</Link>
        </div>
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
