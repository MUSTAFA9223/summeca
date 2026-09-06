'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Shield, Zap, Brain, Globe, CheckCircle2, Cpu } from 'lucide-react';
import dynamic from 'next/dynamic';

const Animated3DBackground = dynamic(
  () => import('@/components/ui/Animated3DBackground'),
  { ssr: false }
);

const capabilities = [
  { icon: Brain, title: 'AI-Powered', text: 'AI tools for modern workflows' },
  { icon: Shield, title: 'Secure by design', text: 'Protected accounts and server-side controls' },
  { icon: Globe, title: 'Digital-first', text: 'SaaS tools and downloadable products' },
  { icon: Zap, title: 'Fast access', text: 'Simple discovery, checkout, and delivery' },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen bg-gradient-hero overflow-hidden flex items-center">
      <Animated3DBackground variant="full" />

      <div className="absolute inset-0 dot-pattern opacity-40" />
      <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full bg-gradient-to-bl from-primary/10 via-accent/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-primary/7 to-transparent blur-3xl pointer-events-none" />

      <div className="relative max-w-screen-xl mx-auto px-6 lg:px-8 pt-28 pb-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_500px] gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-primary/20 shadow-sm mb-7 fade-in">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <Cpu size={12} className="text-primary" />
              </div>
              <span className="text-xs font-700 text-primary tracking-wide">AI-Powered Business Technology Platform</span>
            </div>

            <h1 className="text-5xl xl:text-[66px] font-extrabold leading-[1.06] tracking-tight text-foreground mb-6 fade-in stagger-1">
              The Future of{' '}
              <span className="text-gradient-primary relative">
                Business
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 to-accent/60 rounded-full" />
              </span>{' '}
              Technology
            </h1>

            <p className="text-lg text-secondary-foreground leading-relaxed mb-8 max-w-xl fade-in stagger-2">
              SUMMECA brings AI tools, SaaS applications, and digital products together in one modern platform for work and business.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 mb-9 fade-in stagger-2">
              {capabilities.map(({ icon: Icon, title }) => (
                <div
                  key={title}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/90 backdrop-blur-sm border border-border/80 text-sm text-secondary-foreground shadow-sm hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <Icon size={13} className="text-primary" />
                  <span className="font-600">{title}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 fade-in stagger-3">
              <Link
                href="/products"
                className="btn-primary flex items-center gap-2 text-sm px-7 py-3.5 rounded-xl shadow-lg hover:shadow-xl"
              >
                <Sparkles size={15} />
                Explore Platform
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/pricing"
                className="btn-secondary flex items-center gap-2 text-sm px-7 py-3.5 rounded-xl hover:border-primary/40"
              >
                View Pricing
                <ArrowRight size={13} className="text-muted-foreground" />
              </Link>
            </div>
          </div>

          <div className="hidden lg:block fade-in stagger-2">
            <div className="glass-card rounded-3xl p-6 teal-glow float-animation relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3 rounded-3xl pointer-events-none" />

              <div className="relative flex items-center gap-2.5 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-teal flex items-center justify-center shadow-md">
                  <Brain size={19} className="text-white" />
                </div>
                <div>
                  <div className="text-sm font-700 text-foreground">SUMMECA Workspace</div>
                  <div className="text-xs text-muted-foreground">Product capabilities preview</div>
                </div>
              </div>

              <div className="relative grid grid-cols-2 gap-3">
                {capabilities.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="bg-white/65 backdrop-blur-sm rounded-2xl p-4 border border-white/80">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <Icon size={15} className="text-primary" />
                    </div>
                    <div className="text-sm font-700 text-foreground mb-1">{title}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{text}</div>
                  </div>
                ))}
              </div>

              <div className="relative mt-5 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 flex items-start gap-2.5">
                <CheckCircle2 size={15} className="text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-secondary-foreground leading-relaxed">
                  Customer counts, ratings, sales, and activity are shown only when backed by real SUMMECA data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
