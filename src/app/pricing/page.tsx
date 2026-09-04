'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { Check, X, Zap, ArrowRight, Sparkles, Building2, Users } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


// ─── Data ─────────────────────────────────────────────────────────────────────

const plans = [
  {
    id: 'free',
    name: 'Free',
    icon: Sparkles,
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Explore the platform with no commitment.',
    color: 'border-border',
    badgeColor: 'bg-secondary text-secondary-foreground',
    featured: false,
    cta: 'Get Started Free',
    href: '/sign-up-login-screen',
    features: [
      '100 AI requests / month',
      'Access to 2 AI tools',
      'Basic PDF analysis (5 pages)',
      'Content Generator (500 words/run)',
      'Community support',
      'Personal use license',
      '1 active download at a time',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Zap,
    monthlyPrice: 39,
    yearlyPrice: 29,
    description: 'Full access for professionals who move fast.',
    color: 'border-primary',
    badgeColor: 'bg-primary text-white',
    featured: true,
    cta: 'Start Pro Trial',
    href: '/sign-up-login-screen',
    features: [
      '5,000 AI requests / month',
      'All AI tools included',
      'Unlimited PDF analysis',
      'Full Content Generator (no limits)',
      'API access (1 key)',
      'Priority email support',
      'Commercial use license',
      'Download history & re-downloads',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    icon: Building2,
    monthlyPrice: 99,
    yearlyPrice: 79,
    description: 'Scale across your team with advanced controls.',
    color: 'border-accent/40',
    badgeColor: 'bg-accent/10 text-accent',
    featured: false,
    cta: 'Contact Sales',
    href: '/sign-up-login-screen',
    features: [
      '25,000 AI requests / month',
      'All AI tools included',
      'Up to 5 team seats',
      'API access (10 keys)',
      'Custom AI integrations',
      'Dedicated account support',
      'Commercial use license',
      'Usage analytics dashboard',
      'White-label options',
    ],
  },
];

// ─── Comparison table rows ─────────────────────────────────────────────────────

type CellValue = boolean | string;

interface ComparisonRow {
  category: string;
  rows: { feature: string; free: CellValue; pro: CellValue; business: CellValue }[];
}

const comparisonData: ComparisonRow[] = [
  {
    category: 'AI Requests',
    rows: [
      { feature: 'Monthly AI requests', free: '100', pro: '5,000', business: '25,000' },
      { feature: 'Request rollover', free: false, pro: false, business: true },
      { feature: 'Burst capacity', free: false, pro: false, business: true },
    ],
  },
  {
    category: 'Tools & Products',
    rows: [
      { feature: 'AI tools access', free: '2 tools', pro: 'All tools', business: 'All tools' },
      { feature: 'PDF analysis', free: '5 pages', pro: 'Unlimited', business: 'Unlimited' },
      { feature: 'Content Generator', free: '500 words', pro: 'Unlimited', business: 'Unlimited' },
      { feature: 'Template downloads', free: '3 / month', pro: 'Unlimited', business: 'Unlimited' },
      { feature: 'Dataset access', free: false, pro: true, business: true },
    ],
  },
  {
    category: 'API & Integrations',
    rows: [
      { feature: 'API access', free: false, pro: '1 key', business: '10 keys' },
      { feature: 'Webhook support', free: false, pro: false, business: true },
      { feature: 'Custom integrations', free: false, pro: false, business: true },
      { feature: 'White-label options', free: false, pro: false, business: true },
    ],
  },
  {
    category: 'Team & Collaboration',
    rows: [
      { feature: 'Team seats', free: '1', pro: '1', business: 'Up to 5' },
      { feature: 'Shared workspace', free: false, pro: false, business: true },
      { feature: 'Usage analytics', free: false, pro: false, business: true },
    ],
  },
  {
    category: 'Support',
    rows: [
      { feature: 'Community forum', free: true, pro: true, business: true },
      { feature: 'Email support', free: false, pro: 'Priority', business: 'Dedicated' },
      { feature: 'SLA guarantee', free: false, pro: false, business: true },
    ],
  },
  {
    category: 'Licensing',
    rows: [
      { feature: 'Personal use', free: true, pro: true, business: true },
      { feature: 'Commercial use', free: false, pro: true, business: true },
      { feature: 'Resale rights', free: false, pro: false, business: true },
    ],
  },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const faqs = [
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes. Upgrades take effect immediately and are prorated. Downgrades apply at the next billing cycle.',
  },
  {
    q: 'Is there a free trial for Pro or Business?',
    a: 'Pro includes a 7-day free trial with no credit card required. Business plans can be trialed via a sales call.',
  },
  {
    q: 'What counts as an AI request?',
    a: 'Each call to an AI tool (PDF analysis, content generation, API call, etc.) counts as one request.',
  },
  {
    q: 'Do unused requests roll over?',
    a: 'On Free and Pro plans, unused requests reset monthly. Business plans can negotiate rollover terms.',
  },
  {
    q: 'How does the commercial license work?',
    a: 'Pro and Business licenses let you use generated content and downloaded assets in client work and commercial products.',
  },
];

// ─── Cell renderer ─────────────────────────────────────────────────────────────

function Cell({ value, featured }: { value: CellValue; featured?: boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check size={16} className={featured ? 'text-primary mx-auto' : 'text-success mx-auto'} />
    ) : (
      <X size={14} className="text-muted-foreground/40 mx-auto" />
    );
  }
  return (
    <span className={`text-sm font-500 ${featured ? 'text-foreground font-600' : 'text-secondary-foreground'}`}>
      {value}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      {/* ── Hero ── */}
      <section className="pt-28 pb-16 bg-gradient-hero relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="max-w-screen-xl mx-auto px-6 lg:px-8 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-700 uppercase tracking-widest mb-5">
            <Zap size={11} />
            Pricing
          </div>
          <h1 className="text-4xl lg:text-5xl font-800 text-foreground mb-4 leading-tight">
            One platform.{' '}
            <span className="text-gradient-primary">Three tiers.</span>
          </h1>
          <p className="text-lg text-secondary-foreground max-w-2xl mx-auto mb-10">
            Start free, scale as you grow. No hidden fees, no lock-in. Every plan includes access to the SUMMECA marketplace.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-2 bg-card border border-border rounded-xl p-1.5 shadow-sm">
            <button
              onClick={() => setYearly(false)}
              className={`px-5 py-2 rounded-lg text-sm font-600 transition-all duration-150 ${
                !yearly ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-5 py-2 rounded-lg text-sm font-600 transition-all duration-150 flex items-center gap-2 ${
                yearly ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <span className={`text-xs px-2 py-0.5 rounded-full font-700 ${
                yearly ? 'bg-white/20 text-white' : 'bg-success/10 text-success'
              }`}>
                Save 25%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Plan Cards ── */}
      <section className="py-16 max-w-screen-xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => {
            const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-7 transition-all duration-200 ${
                  plan.featured
                    ? 'price-card-featured border-primary shadow-primary scale-[1.02]'
                    : `bg-card ${plan.color} card-hover`
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-white text-xs font-700 shadow-sm whitespace-nowrap">
                      <Zap size={11} />
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    plan.featured ? 'bg-white/20' : 'bg-primary/8'
                  }`}>
                    <Icon size={18} className={plan.featured ? 'text-white' : 'text-primary'} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-700 ${plan.featured ? 'text-white' : 'text-foreground'}`}>
                      {plan.name}
                    </h3>
                    <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${plan.featured ? 'bg-white/20 text-white' : plan.badgeColor}`}>
                      {plan.id === 'free' ? 'Forever free' : plan.id === 'pro' ? 'Most popular' : 'For teams'}
                    </span>
                  </div>
                </div>

                <p className={`text-sm mb-5 leading-relaxed ${plan.featured ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {plan.description}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className={`text-5xl font-800 tabular-nums ${plan.featured ? 'text-white' : 'text-foreground'}`}>
                    ${price}
                  </span>
                  {price > 0 && (
                    <span className={`text-sm ${plan.featured ? 'text-white/70' : 'text-muted-foreground'}`}>/mo</span>
                  )}
                </div>
                {yearly && plan.monthlyPrice > 0 && (
                  <p className={`text-xs mb-5 ${plan.featured ? 'text-white/60' : 'text-muted-foreground'}`}>
                    Billed ${(plan.yearlyPrice * 12).toLocaleString()}/year
                  </p>
                )}
                {(!yearly || plan.monthlyPrice === 0) && <div className="mb-5" />}

                <Link
                  href={plan.href}
                  className={`flex items-center justify-center gap-2 text-sm font-600 px-4 py-2.5 rounded-xl transition-all duration-150 mb-7 ${
                    plan.featured
                      ? 'bg-white text-primary hover:bg-white/90' :'btn-primary'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight size={14} />
                </Link>

                {/* Features list */}
                <ul className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check
                        size={14}
                        className={`mt-0.5 flex-shrink-0 ${plan.featured ? 'text-white' : 'text-success'}`}
                      />
                      <span className={`text-sm ${plan.featured ? 'text-white/90' : 'text-secondary-foreground'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="py-16 bg-secondary/30">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-700 uppercase tracking-widest text-primary mb-2">Compare Plans</p>
            <h2 className="text-3xl font-800 text-foreground">Everything side by side</h2>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-4 border-b border-border">
              <div className="p-5 col-span-1" />
              {plans.map((plan) => (
                <div
                  key={`th-${plan.id}`}
                  className={`p-5 text-center border-l border-border ${
                    plan.featured ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className={`text-sm font-700 mb-0.5 ${plan.featured ? 'text-primary' : 'text-foreground'}`}>
                    {plan.name}
                  </div>
                  <div className="text-xl font-800 text-foreground tabular-nums">
                    ${yearly ? plan.yearlyPrice : plan.monthlyPrice}
                    {(yearly ? plan.yearlyPrice : plan.monthlyPrice) > 0 && (
                      <span className="text-xs font-500 text-muted-foreground">/mo</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Table body */}
            {comparisonData.map((section, si) => (
              <React.Fragment key={`section-${si}`}>
                {/* Category header */}
                <div className="grid grid-cols-4 bg-secondary/50 border-b border-border">
                  <div className="px-5 py-3 col-span-4">
                    <span className="text-xs font-700 uppercase tracking-wider text-muted-foreground">
                      {section.category}
                    </span>
                  </div>
                </div>
                {/* Rows */}
                {section.rows.map((row, ri) => (
                  <div
                    key={`row-${si}-${ri}`}
                    className={`grid grid-cols-4 border-b border-border last:border-b-0 hover:bg-secondary/20 transition-colors duration-100`}
                  >
                    <div className="px-5 py-3.5 text-sm text-secondary-foreground font-500 flex items-center">
                      {row.feature}
                    </div>
                    {(['free', 'pro', 'business'] as const).map((planId) => {
                      const isFeatured = planId === 'pro';
                      return (
                        <div
                          key={`cell-${planId}`}
                          className={`px-5 py-3.5 border-l border-border flex items-center justify-center ${
                            isFeatured ? 'bg-primary/5' : ''
                          }`}
                        >
                          <Cell value={row[planId]} featured={isFeatured} />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 max-w-screen-xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-700 uppercase tracking-widest text-primary mb-2">FAQ</p>
            <h2 className="text-3xl font-800 text-foreground">Common questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={`faq-${i}`}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-600 text-foreground pr-4">{faq.q}</span>
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full border border-border flex items-center justify-center transition-transform duration-200 ${openFaq === i ? 'rotate-45 bg-primary border-primary' : ''}`}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M5 1v8M1 5h8" stroke={openFaq === i ? '#fff' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-secondary-foreground leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA to Products ── */}
      <section className="py-16 bg-gradient-hero border-t border-border">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
          <div className="bg-card border border-border rounded-2xl p-10 lg:p-14 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-sm">
            <div className="text-center lg:text-left max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-700 uppercase tracking-widest mb-4">
                <Users size={11} />
                Marketplace
              </div>
              <h2 className="text-3xl font-800 text-foreground mb-3">
                Ready to explore the products?
              </h2>
              <p className="text-secondary-foreground text-base leading-relaxed">
                Browse AI tools, SaaS apps, and digital products built for your workflow. Every plan gives you access to the full SUMMECA marketplace.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <Link
                href="/products"
                className="btn-primary flex items-center gap-2 px-6 py-3 text-sm"
              >
                Browse Products
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/sign-up-login-screen"
                className="btn-secondary flex items-center gap-2 px-6 py-3 text-sm"
              >
                Start for Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
