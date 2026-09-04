'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Zap } from 'lucide-react';

const plans = [
  {
    id: 'plan-free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Get started with essential AI tools at no cost.',
    features: [
      '100 AI requests / month',
      'Access to 2 AI tools',
      'Basic PDF analysis (5 pages)',
      'Content Generator (500 words)',
      'Community support',
      'Personal use license',
    ],
    unavailable: ['API access', 'Priority support', 'Custom integrations'],
    cta: 'Start for Free',
    href: '/sign-up-login-screen',
    featured: false,
  },
  {
    id: 'plan-pro',
    name: 'Pro',
    monthlyPrice: 39,
    yearlyPrice: 29,
    description: 'For professionals who need full access and higher limits.',
    features: [
      '5,000 AI requests / month',
      'All AI tools included',
      'Unlimited PDF analysis',
      'Full Content Generator',
      'API access (1 key)',
      'Priority email support',
      'Commercial use license',
      'Download history',
    ],
    unavailable: ['Team seats', 'Custom integrations'],
    cta: 'Start Pro Trial',
    href: '/sign-up-login-screen',
    featured: true,
  },
  {
    id: 'plan-business',
    name: 'Business',
    monthlyPrice: 99,
    yearlyPrice: 79,
    description: 'For teams and businesses needing scale and customization.',
    features: [
      '25,000 AI requests / month',
      'All AI tools included',
      'Up to 5 team seats',
      'API access (10 keys)',
      'Custom AI integrations',
      'Dedicated support',
      'Commercial use license',
      'Usage analytics',
      'White-label options',
    ],
    unavailable: [],
    cta: 'Contact Sales',
    href: '/contact',
    featured: false,
  },
];

export default function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section className="py-24 bg-gradient-section" id="pricing">
      <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 border border-primary/15 mb-4">
            <Zap size={11} className="text-primary" />
            <span className="text-xs font-600 text-primary uppercase tracking-wider">Pricing</span>
          </div>
          <h2 className="text-3xl font-800 text-foreground mb-3">
            Simple, transparent pricing
          </h2>
          <p className="text-base text-secondary-foreground max-w-xl mx-auto mb-8">
            Start free. Upgrade when you need more. No hidden fees, no surprises.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 bg-white border border-border rounded-xl p-1.5 shadow-card">
            <button
              onClick={() => setYearly(false)}
              className={`px-4 py-1.5 rounded-lg text-sm font-600 transition-all duration-200 ${
                !yearly ? 'bg-gradient-teal text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-4 py-1.5 rounded-lg text-sm font-600 transition-all duration-200 flex items-center gap-1.5 ${
                yearly ? 'bg-gradient-teal text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-700 ${
                yearly ? 'bg-white/20 text-white' : 'bg-success/10 text-success'
              }`}>
                Save 25%
              </span>
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans?.map((plan) => (
            <div
              key={plan?.id}
              className={`rounded-2xl border p-7 relative ${
                plan?.featured
                  ? 'price-card-featured border-transparent' :'bg-white border-border card-hover'
              }`}
            >
              {plan?.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-white text-primary text-xs font-700 shadow-md">
                    <Zap size={11} className="text-primary" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className={`text-lg font-700 mb-1 ${plan?.featured ? 'text-white' : 'text-foreground'}`}>
                  {plan?.name}
                </h3>
                <p className={`text-xs leading-relaxed mb-5 ${plan?.featured ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {plan?.description}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-4xl font-800 tabular-nums ${plan?.featured ? 'text-white' : 'text-foreground'}`}>
                    ${yearly ? plan?.yearlyPrice : plan?.monthlyPrice}
                  </span>
                  {(yearly ? plan?.yearlyPrice : plan?.monthlyPrice) > 0 && (
                    <span className={`text-sm ${plan?.featured ? 'text-white/70' : 'text-muted-foreground'}`}>/mo</span>
                  )}
                </div>
                {yearly && plan?.monthlyPrice > 0 && (
                  <div className={`text-xs mt-1 ${plan?.featured ? 'text-white/70' : 'text-muted-foreground'}`}>
                    Billed ${(plan?.yearlyPrice * 12)?.toLocaleString()}/year
                  </div>
                )}
              </div>

              <Link
                href={plan?.href}
                className={`block text-center text-sm font-600 px-4 py-2.5 rounded-xl transition-all duration-200 mb-6 ${
                  plan?.featured
                    ? 'bg-white text-primary hover:bg-white/90 shadow-sm'
                    : 'btn-primary'
                }`}
              >
                {plan?.cta}
              </Link>

              {/* Features */}
              <ul className="space-y-2.5">
                {plan?.features?.map((feature) => (
                  <li key={`feature-${plan?.id}-${feature}`} className="flex items-start gap-2.5">
                    <Check size={14} className={`mt-0.5 flex-shrink-0 ${plan?.featured ? 'text-white/80' : 'text-primary'}`} />
                    <span className={`text-sm ${plan?.featured ? 'text-white/90' : 'text-secondary-foreground'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}