'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Bitcoin, Check, CheckCircle2, Clock3, Copy, Loader2, ShieldCheck } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

type CryptoOrder = {
  orderId: string;
  status: string;
  amount: number;
  currency: string;
  paymentAddress: string | null;
  cryptoAmount: string | null;
  cryptoCurrency: string | null;
  cryptoNetwork: string | null;
  providerStatus: string | null;
};

function shortId(value: string) {
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function CryptoCheckoutInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [order, setOrder] = useState<CryptoOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'amount' | 'address' | null>(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setError('Missing order ID.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/payment/crypto-order-status?order_id=${encodeURIComponent(orderId)}`, {
        cache: 'no-store',
      });
      const data = (await response.json()) as CryptoOrder & { error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Unable to load cryptocurrency payment.');
        return;
      }
      setOrder(data);
      setError('');
    } catch {
      setError('Unable to refresh payment status.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
    const timer = window.setInterval(() => void loadOrder(), 5000);
    return () => window.clearInterval(timer);
  }, [loadOrder]);

  const copy = async (value: string, kind: 'amount' | 'address') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setError('Copy failed. Select the value manually.');
    }
  };

  const completed = order?.status === 'completed';
  const terminalFailure = order && ['failed', 'cancelled', 'refunded'].includes(order.status);

  return (
    <div className="pt-28 pb-20 max-w-2xl mx-auto px-6">
      <div className="text-center mb-8">
        <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${completed ? 'bg-success/10' : 'bg-primary/10'}`}>
          {completed ? <CheckCircle2 className="text-success" size={30} /> : <Bitcoin className="text-primary" size={30} />}
        </div>
        <h1 className="text-2xl font-800">{completed ? 'Crypto Payment Confirmed' : 'Complete Crypto Payment'}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {completed
            ? 'The signed payment notification was verified and your SUMMECA order is complete.'
            : 'Send the exact amount on the exact network below. SUMMECA does not mark the order paid from this page.'}
        </p>
      </div>

      {loading && (
        <div className="bg-card border border-border rounded-2xl p-10 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      )}

      {!loading && error && !order && (
        <div className="bg-danger/5 border border-danger/20 rounded-2xl p-5 text-sm text-danger flex gap-3">
          <AlertCircle size={18} className="flex-shrink-0" /> {error}
        </div>
      )}

      {!loading && order && (
        <div className="space-y-5">
          {!completed && !terminalFailure && (
            <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 text-sm flex gap-3">
              <Clock3 size={18} className="text-warning flex-shrink-0" />
              <div>
                <div className="font-700">Awaiting blockchain/provider confirmation</div>
                <p className="text-xs text-muted-foreground mt-1">Do not send on a different network. Underpaid payments remain pending and do not grant access.</p>
              </div>
            </div>
          )}

          {terminalFailure && (
            <div className="bg-danger/5 border border-danger/20 rounded-xl p-4 text-sm text-danger flex gap-3">
              <AlertCircle size={18} className="flex-shrink-0" />
              Payment is {order.status}. Start a new checkout instead of sending to an old payment address.
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <span className="font-700 text-sm">Payment Request</span>
              <span className={`text-[11px] px-2.5 py-1 rounded-full ${completed ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                {completed ? 'PAID' : order.status.replaceAll('_', ' ').toUpperCase()}
              </span>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Asset / Network</div>
                <div className="font-700">{order.cryptoCurrency ?? 'Crypto'} · {order.cryptoNetwork ?? 'Selected network'}</div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Exact amount to send</div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-secondary border border-border rounded-xl px-3 py-3 font-mono text-sm break-all">
                    {order.cryptoAmount ?? 'Unavailable'} {order.cryptoCurrency ?? ''}
                  </div>
                  {order.cryptoAmount && (
                    <button onClick={() => void copy(order.cryptoAmount as string, 'amount')} className="btn-secondary px-3" aria-label="Copy amount">
                      {copied === 'amount' ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Payment address</div>
                <div className="flex gap-2 items-stretch">
                  <div className="flex-1 bg-secondary border border-border rounded-xl px-3 py-3 font-mono text-xs break-all">
                    {order.paymentAddress ?? 'Unavailable'}
                  </div>
                  {order.paymentAddress && (
                    <button onClick={() => void copy(order.paymentAddress as string, 'address')} className="btn-secondary px-3" aria-label="Copy address">
                      {copied === 'address' ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted-foreground border-t border-border pt-4">
                Order <span className="font-mono">{shortId(order.orderId)}</span> · Store total {order.amount} {order.currency}
              </div>
            </div>
          </div>

          <div className="bg-success/5 border border-success/15 rounded-xl p-4 flex gap-3 text-xs text-secondary-foreground">
            <ShieldCheck size={18} className="text-success flex-shrink-0" />
            Access, downloads and receipts are triggered only after the provider webhook signature, order reference, amount and currency are verified server-side.
          </div>

          {error && <p className="text-xs text-danger text-center">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => void loadOrder()} className="btn-secondary px-5 py-2.5 text-sm">Refresh status</button>
            <Link href="/user-dashboard/orders" className="btn-primary px-5 py-2.5 text-sm text-center">View Orders</Link>
            <Link href="/products" className="btn-secondary px-5 py-2.5 text-sm text-center">Products</Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CryptoCheckoutPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <Suspense fallback={<div className="pt-28 flex justify-center"><Loader2 className="animate-spin" /></div>}>
        <CryptoCheckoutInner />
      </Suspense>
      <PublicFooter />
    </div>
  );
}
