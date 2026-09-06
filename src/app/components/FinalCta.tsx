import React from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Sparkles, Shield, Zap, Globe, HeadphonesIcon } from 'lucide-react';

const whyChoose = [
  {
    icon: Shield,
    title: 'Security',
    desc: 'Security-focused infrastructure with role-based access and audit controls.',
  },
  {
    icon: Zap,
    title: 'Fast Setup',
    desc: 'A streamlined setup experience for SUMMECA products and services.',
  },
  {
    icon: Globe,
    title: 'Digital Access',
    desc: 'Access SUMMECA digital products and services online wherever they are available.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Customer Support',
    desc: 'Get help with your SUMMECA account, products, and services.',
  },
];

export default function FinalCta() {
  return (
    <>
      <section className="py-24 bg-white">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 border border-primary/15 mb-5">
                <Sparkles size={11} className="text-primary" />
                <span className="text-xs font-600 text-primary uppercase tracking-wider">Why SUMMECA</span>
              </div>
              <h2 className="text-3xl font-800 text-foreground mb-5 leading-tight">
                Technology for modern digital work
              </h2>
              <p className="text-secondary-foreground text-sm leading-relaxed mb-8 max-w-md">
                Explore SUMMECA digital products, AI tools, and services from one platform.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  'Clear product and pricing information',
                  'Digital products and AI-powered tools',
                  'Account-based access to purchases and downloads',
                  'Support for SUMMECA customers',
                ]?.map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-primary flex-shrink-0" />
                    <span className="text-sm text-secondary-foreground">{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/pricing" className="btn-primary inline-flex items-center gap-2 text-sm px-6 py-3">
                See all plans <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {whyChoose?.map((item) => (
                <div key={item?.title} className="glass-card rounded-2xl p-5 card-hover">
                  <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-4">
                    <item.icon size={18} className="text-primary" />
                  </div>
                  <h4 className="text-sm font-700 text-foreground mb-1.5">{item?.title}</h4>
                  <p className="text-xs text-secondary-foreground leading-relaxed">{item?.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-dark relative overflow-hidden">
        <div className="absolute inset-0 dot-pattern opacity-20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/15 blur-3xl" />

        <div className="relative max-w-screen-xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 mb-6">
            <Sparkles size={11} className="text-primary" />
            <span className="text-xs font-600 text-white/80 uppercase tracking-wider">Explore SUMMECA</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-800 text-white mb-5 leading-tight">
            Discover tools for your<br />
            <span className="text-gradient-primary">digital work</span>
          </h2>
          <p className="text-slate-400 text-base mb-10 max-w-lg mx-auto leading-relaxed">
            Browse SUMMECA products, digital resources, and AI-powered tools.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/products" className="btn-primary flex items-center gap-2 text-sm px-7 py-3.5">
              <Sparkles size={15} />
              Browse Products
              <ArrowRight size={14} />
            </Link>
            <Link href="/pricing" className="btn-ghost-white flex items-center gap-2 text-sm px-7 py-3.5">
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
