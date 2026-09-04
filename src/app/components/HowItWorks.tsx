import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    num: '01',
    title: 'Choose your tools',
    desc: 'Browse our catalog of AI tools, SaaS apps, and digital products. Filter by category, use case, or budget.',
    cta: { label: 'Browse products', href: '/products' },
  },
  {
    num: '02',
    title: 'Instant access',
    desc: 'Purchase or subscribe in seconds. Your tools are available immediately — no waiting, no setup complexity.',
    cta: { label: 'See pricing', href: '/pricing' },
  },
  {
    num: '03',
    title: 'Scale with AI',
    desc: 'Use the built-in AI Marketing Engine to generate content, optimize SEO, and run campaigns automatically.',
    cta: { label: 'Explore AI', href: '/ai' },
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 border border-primary/15 mb-4">
            <Sparkles size={11} className="text-primary" />
            <span className="text-xs font-600 text-primary uppercase tracking-wider">How It Works</span>
          </div>
          <h2 className="text-3xl font-800 text-foreground mb-3">
            From zero to operational in minutes
          </h2>
          <p className="text-secondary-foreground text-sm max-w-md mx-auto">
            SUMMECA is designed for speed. Get your business tools running before your next meeting.
          </p>
        </div>

        {/* Horizontal step cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-12 left-[calc(33.33%+24px)] right-[calc(33.33%+24px)] h-px bg-gradient-to-r from-primary/30 via-primary/60 to-primary/30" />

          {steps?.map((step, idx) => (
            <div key={step?.num} className={`relative rounded-2xl border border-border bg-white p-7 card-hover fade-in stagger-${idx + 1}`}>
              {/* Step number */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-teal flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-xs font-800 text-white">{step?.num}</span>
                </div>
                <CheckCircle2 size={16} className="text-primary/40" />
              </div>
              <h3 className="text-base font-700 text-foreground mb-2">{step?.title}</h3>
              <p className="text-sm text-secondary-foreground leading-relaxed mb-5">{step?.desc}</p>
              <Link href={step?.cta?.href} className="flex items-center gap-1.5 text-sm font-600 text-primary hover:gap-2.5 transition-all duration-200">
                {step?.cta?.label} <ArrowRight size={13} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}