'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';

const STORAGE_KEY = 'summeca:dashboard-quick-start-dismissed';

const steps = [
  {
    title: 'Choose one workflow',
    description: 'Start with the single store task you want to improve first.',
    href: '/products',
    cta: 'Browse products',
  },
  {
    title: 'Review the real offer',
    description: 'Check the product interface, included features, and current production price.',
    href: '/pricing',
    cta: 'View pricing',
  },
  {
    title: 'Use your account dashboard',
    description: 'Completed orders, subscriptions, downloads, and eligible product access appear here.',
    href: '/support',
    cta: 'Get help',
  },
];

export default function DashboardQuickStart() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.localStorage.getItem(STORAGE_KEY) !== '1');
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Local storage can be blocked; hiding for this session is still useful.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section className="mb-6 rounded-2xl border border-primary/15 bg-primary/[0.035] p-5 sm:p-6" aria-labelledby="quick-start-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-700 uppercase tracking-[0.16em] text-primary">Quick start</p>
          <h2 id="quick-start-title" className="mt-1 text-lg font-800 text-foreground">
            Get to your first useful workflow in three clear steps.
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            No long setup wizard. Pick a need, review the real offer, then keep access and order history in this account.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
          aria-label="Dismiss quick start"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-800 text-primary">
                {index + 1}
              </span>
              <h3 className="text-sm font-700 text-foreground">{step.title}</h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.description}</p>
            <Link href={step.href} className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-700 text-primary hover:underline">
              <CheckCircle2 size={13} /> {step.cta} <ArrowRight size={12} />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
