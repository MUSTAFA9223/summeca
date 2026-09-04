'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Shield, Zap, Brain, Globe, CheckCircle2, TrendingUp, Users, Award, Star, Cpu } from 'lucide-react';
import dynamic from 'next/dynamic';

const Animated3DBackground = dynamic(
  () => import('@/components/ui/Animated3DBackground'),
  { ssr: false }
);

export default function HeroSection() {
  const stats = [
    { value: '50K+', label: 'Active Users', icon: Users },
    { value: '99.9%', label: 'Uptime SLA', icon: Shield },
    { value: '150+', label: 'Countries', icon: Globe },
    { value: '4.9★', label: 'Avg Rating', icon: Star },
  ];

  const trustedBy = ['Fortune 500', 'Startups', 'Agencies', 'Freelancers', 'Enterprises'];

  return (
    <section className="relative min-h-screen bg-gradient-hero overflow-hidden flex items-center">
      {/* 3D Animated Background */}
      <Animated3DBackground variant="full" />

      {/* Layered background gradients */}
      <div className="absolute inset-0 dot-pattern opacity-40" />
      <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full bg-gradient-to-bl from-primary/10 via-accent/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-primary/7 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] rounded-full bg-gradient-to-r from-primary/3 via-transparent to-accent/3 blur-3xl pointer-events-none" />

      <div className="relative max-w-screen-xl mx-auto px-6 lg:px-8 pt-28 pb-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_500px] gap-16 items-center">
          {/* Left copy */}
          <div>
            {/* Premium badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-primary/20 shadow-sm mb-7 fade-in">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <Cpu size={12} className="text-primary" />
              </div>
              <span className="text-xs font-700 text-primary tracking-wide">AI-Powered Business Technology Platform</span>
              <div className="w-1 h-1 rounded-full bg-primary/40"></div>
              <span className="text-xs font-600 text-muted-foreground">v37</span>
            </div>

            <h1 className="text-5xl xl:text-[66px] font-extrabold leading-[1.06] tracking-tight text-foreground mb-6 fade-in stagger-1">
              The Future of{' '}
              <span className="text-gradient-primary relative">
                Business
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 to-accent/60 rounded-full"></span>
              </span>{' '}
              Technology
            </h1>

            <p className="text-lg text-secondary-foreground leading-relaxed mb-8 max-w-xl fade-in stagger-2">
              SUMMECA delivers enterprise-grade AI tools, SaaS applications, and digital products that transform how modern businesses operate, compete, and grow.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap items-center gap-2.5 mb-9 fade-in stagger-2">
              {[
                { icon: Brain, text: 'AI-Powered' },
                { icon: Shield, text: 'Enterprise Security' },
                { icon: Globe, text: 'Global Scale' },
                { icon: Zap, text: 'Instant Deploy' },
              ]?.map(({ icon: FeatureIcon, text }) => {
                const Icon = FeatureIcon;
                return (
                  <div
                    key={`trust-${text}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/90 backdrop-blur-sm border border-border/80 text-sm text-secondary-foreground shadow-sm hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <Icon size={13} className="text-primary" />
                    <span className="font-600">{text}</span>
                  </div>
                );
              })}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-12 fade-in stagger-3">
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

            {/* Stats row */}
            <div className="flex flex-wrap gap-7 fade-in stagger-4">
              {stats?.map((stat) => (
                <div key={`stat-${stat?.label}`} className="flex items-center gap-2.5 group">
                  <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center group-hover:bg-primary/14 transition-colors">
                    <stat.icon size={14} className="text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-800 text-foreground tabular-nums leading-tight">{stat?.value}</span>
                    <span className="text-xs text-muted-foreground font-500">{stat?.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Premium glass dashboard card */}
          <div className="hidden lg:block fade-in stagger-2">
            <div className="relative">
              {/* Main glass card */}
              <div className="glass-card rounded-3xl p-6 teal-glow float-animation relative overflow-hidden">
                {/* Subtle inner gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3 rounded-3xl pointer-events-none" />

                {/* Header */}
                <div className="relative flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-teal flex items-center justify-center shadow-md">
                      <Brain size={19} className="text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-700 text-foreground">AI Marketing Engine</div>
                      <div className="text-xs text-muted-foreground">Generating campaign...</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-success/10 border border-success/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
                    <span className="text-xs font-600 text-success">Live</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="relative grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Revenue', value: '$48.2K', change: '+18%' },
                    { label: 'Conversions', value: '3,847', change: '+24%' },
                    { label: 'AI Requests', value: '12.4K', change: '+31%' },
                  ]?.map((m) => (
                    <div key={m?.label} className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-white/80 hover:border-primary/20 transition-colors">
                      <div className="text-xs text-muted-foreground mb-1">{m?.label}</div>
                      <div className="text-base font-700 text-foreground tabular-nums">{m?.value}</div>
                      <div className="text-xs font-600 text-success">{m?.change}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bars */}
                <div className="relative space-y-3 mb-5">
                  {[
                    { label: 'AI Content Generated', pct: 78, color: 'bg-gradient-teal' },
                    { label: 'Campaign Performance', pct: 91, color: 'bg-gradient-to-r from-accent to-primary' },
                    { label: 'Customer Satisfaction', pct: 96, color: 'bg-gradient-to-r from-success to-primary' },
                  ]?.map((bar) => (
                    <div key={bar?.label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-secondary-foreground font-500">{bar?.label}</span>
                        <span className="font-700 text-foreground">{bar?.pct}%</span>
                      </div>
                      <div className="usage-bar-track">
                        <div className={`${bar?.color} h-full rounded-full transition-all duration-700`} style={{ width: `${bar?.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent activity */}
                <div className="relative space-y-1.5">
                  {[
                    { text: 'Product description generated', time: '2m ago', icon: Sparkles },
                    { text: 'SEO keywords optimized', time: '5m ago', icon: TrendingUp },
                    { text: 'Email campaign created', time: '12m ago', icon: CheckCircle2 },
                  ]?.map((item) => (
                    <div key={item?.text} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-white/50 transition-colors">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <item.icon size={11} className="text-primary" />
                      </div>
                      <span className="text-xs text-secondary-foreground flex-1">{item?.text}</span>
                      <span className="text-xs text-muted-foreground">{item?.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating badge — top right */}
              <div className="absolute -top-4 -right-4 glass-card rounded-2xl px-3.5 py-2.5 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center gap-2">
                  <Award size={14} className="text-warning" />
                  <span className="text-xs font-700 text-foreground">Top Rated 2026</span>
                </div>
              </div>

              {/* Floating badge — bottom left */}
              <div className="absolute -bottom-4 -left-4 glass-card rounded-2xl px-3.5 py-2.5 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-primary" />
                  <span className="text-xs font-700 text-foreground">50K+ businesses</span>
                </div>
              </div>

              {/* Floating badge — right middle */}
              <div className="absolute top-1/2 -right-6 -translate-y-1/2 glass-card rounded-2xl px-3 py-2 shadow-md">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
                  <span className="text-xs font-600 text-success">AI Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trusted by strip */}
        <div className="mt-16 pt-8 border-t border-border/50 fade-in stagger-4">
          <p className="text-xs font-600 text-muted-foreground uppercase tracking-widest text-center mb-5">
            Trusted by teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {trustedBy?.map((name) => (
              <span
                key={name}
                className="text-sm font-700 text-secondary-foreground/50 hover:text-primary transition-colors duration-200 cursor-default"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}