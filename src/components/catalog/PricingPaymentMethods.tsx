'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type Provider = {
  id: 'payoneer' | 'crypto' | 'fastspring';
  label: string;
  endpoint: string;
};

const PROVIDERS: Provider[] = [
  { id: 'payoneer', label: 'Payoneer', endpoint: '/api/payment/payoneer-status' },
  { id: 'crypto', label: 'Crypto', endpoint: '/api/payment/crypto-status' },
  { id: 'fastspring', label: 'FastSpring', endpoint: '/api/payment/fastspring-status' },
];

export default function PricingPaymentMethods() {
  const { isArabic } = useLanguage();
  const [available, setAvailable] = useState<Provider[]>([]);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAvailability() {
      const results = await Promise.all(
        PROVIDERS.map(async (provider) => {
          try {
            const response = await fetch(provider.endpoint, {
              cache: 'no-store',
              signal: controller.signal,
            });
            if (!response.ok) return null;
            const data = (await response.json()) as { available?: boolean };
            return data.available === true ? provider : null;
          } catch {
            return null;
          }
        })
      );

      if (!controller.signal.aborted) {
        setAvailable(results.filter((provider): provider is Provider => provider !== null));
        setChecked(true);
      }
    }

    void loadAvailability();
    return () => controller.abort();
  }, []);

  if (!checked) {
    return (
      <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
        {isArabic ? 'جارٍ التحقق من طرق الدفع المتاحة…' : 'Checking currently available payment methods…'}
      </p>
    );
  }

  if (available.length === 0) {
    return (
      <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
        {isArabic ? 'تُؤكَّد طريقة الدفع المتاحة عند Checkout.' : 'Available payment methods are confirmed at checkout.'}
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2" aria-label={isArabic ? 'طرق الدفع المتاحة حاليًا' : 'Currently available payment methods'}>
      {available.map((provider) => (
        <span key={provider.id} className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground">
          {provider.label}
        </span>
      ))}
    </div>
  );
}
