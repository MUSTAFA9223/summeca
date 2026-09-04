import React from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, Sparkles, Shield, Zap, Globe, HeadphonesIcon, Star, Quote } from 'lucide-react';

const whyChoose = [
  {
    icon: Shield,
    title: 'Enterprise-Grade Security',
    desc: 'SOC 2 compliant infrastructure with end-to-end encryption, role-based access, and audit logs.',
    metric: '99.9% uptime',
  },
  {
    icon: Zap,
    title: 'Instant Deployment',
    desc: 'Go live in minutes, not months. Pre-built integrations and one-click setup for every product.',
    metric: '< 5 min setup',
  },
  {
    icon: Globe,
    title: 'Global Infrastructure',
    desc: 'Distributed across 15 data centers worldwide for ultra-low latency and maximum reliability.',
    metric: '150+ countries',
  },
  {
    icon: HeadphonesIcon,
    title: 'Dedicated Support',
    desc: '24/7 expert support with guaranteed response times. Real humans, not bots.',
    metric: '< 2h response',
  },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Head of Marketing',
    company: 'TechFlow Inc.',
    avatar: 'SC',
    rating: 5,
    quote: 'SUMMECA\'s AI Marketing Engine cut our content production time by 80%. The quality is indistinguishable from our best copywriters.',
    color: 'from-primary/8 to-accent/8',
  },
  {
    name: 'Marcus Rodriguez',
    role: 'CEO',
    company: 'ScaleUp Labs',
    avatar: 'MR',
    rating: 5,
    quote: 'We replaced 3 separate SaaS tools with SUMMECA. The unified platform saves us $2,400/month and everything actually works together.',
    color: 'from-[#F0FDF4] to-[#ECFDF5]',
  },
  {
    name: 'Aisha Patel',
    role: 'Product Manager',
    company: 'Nexus Digital',
    avatar: 'AP',
    rating: 5,
    quote: 'The AI SEO optimizer alone paid for itself in the first week. Our organic traffic increased 340% in 60 days.',
    color: 'from-[#FFF7ED] to-[#FFFBEB]',
  },
];

export default function FinalCta() {
  return (
    <>
      {/* Why Choose SUMMECA */}
      <section className="py-24 bg-white">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 border border-primary/15 mb-5">
                <Sparkles size={11} className="text-primary" />
                <span className="text-xs font-600 text-primary uppercase tracking-wider">Why SUMMECA</span>
              </div>
              <h2 className="text-3xl font-800 text-foreground mb-5 leading-tight">
                Built for businesses that demand the best
              </h2>
              <p className="text-secondary-foreground text-sm leading-relaxed mb-8 max-w-md">
                SUMMECA isn't just another software platform. It's a complete technology ecosystem designed to give your business an unfair competitive advantage.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  'No vendor lock-in — export your data anytime',
                  'Transparent pricing with no hidden fees',
                  'Regular feature updates included in all plans',
                  'Dedicated onboarding for enterprise customers',
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

            {/* Metrics bento */}
            <div className="grid grid-cols-2 gap-4">
              {whyChoose?.map((item) => (
                <div key={item?.title} className="glass-card rounded-2xl p-5 card-hover">
                  <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center mb-4">
                    <item.icon size={18} className="text-primary" />
                  </div>
                  <div className="text-lg font-800 text-gradient-primary mb-1">{item?.metric}</div>
                  <h4 className="text-sm font-700 text-foreground mb-1.5">{item?.title}</h4>
                  <p className="text-xs text-secondary-foreground leading-relaxed">{item?.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-gradient-section">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 border border-primary/15 mb-4">
              <Star size={11} className="text-primary fill-primary" />
              <span className="text-xs font-600 text-primary uppercase tracking-wider">Customer Stories</span>
            </div>
            <h2 className="text-3xl font-800 text-foreground mb-3">
              Trusted by 50,000+ businesses worldwide
            </h2>
            <p className="text-secondary-foreground text-sm max-w-md mx-auto">
              Real results from real customers who transformed their operations with SUMMECA.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials?.map((t) => (
              <div key={t?.name} className={`rounded-2xl border border-border bg-gradient-to-br ${t?.color} p-6 card-hover`}>
                <Quote size={20} className="text-primary/30 mb-4" />
                <div className="flex items-center gap-0.5 mb-4">
                  {[...Array(t?.rating)]?.map((_, i) => (
                    <Star key={i} size={12} className="text-warning fill-warning" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-5 font-500">
                  &ldquo;{t?.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-border/60">
                  <div className="w-9 h-9 rounded-full bg-gradient-teal flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-700 text-white">{t?.avatar}</span>
                  </div>
                  <div>
                    <div className="text-sm font-700 text-foreground">{t?.name}</div>
                    <div className="text-xs text-muted-foreground">{t?.role} · {t?.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-dark relative overflow-hidden">
        <div className="absolute inset-0 dot-pattern opacity-20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/15 blur-3xl" />

        <div className="relative max-w-screen-xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 mb-6">
            <Sparkles size={11} className="text-primary" />
            <span className="text-xs font-600 text-white/80 uppercase tracking-wider">Start Today</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-800 text-white mb-5 leading-tight">
            Ready to transform your<br />
            <span className="text-gradient-primary">business with AI?</span>
          </h2>
          <p className="text-slate-400 text-base mb-10 max-w-lg mx-auto leading-relaxed">
            Join 50,000+ businesses already using SUMMECA to automate, scale, and outperform the competition.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/sign-up-login-screen" className="btn-primary flex items-center gap-2 text-sm px-7 py-3.5">
              <Sparkles size={15} />
              Start Free Trial
              <ArrowRight size={14} />
            </Link>
            <Link href="/pricing" className="btn-ghost-white flex items-center gap-2 text-sm px-7 py-3.5">
              View Pricing
            </Link>
          </div>
          <p className="text-xs text-slate-600 mt-6">No credit card required · Cancel anytime · Free plan available</p>
        </div>
      </section>
    </>
  );
}