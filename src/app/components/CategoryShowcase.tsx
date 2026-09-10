'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Brain, LayoutDashboard, FileText, ArrowRight, Sparkles, Zap, BarChart3, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type CategoryKind = 'ai' | 'saas' | 'digital';
type CategoryCounts = Record<CategoryKind, number | null>;

const AI_CATEGORIES = ['ai_tool', 'api', 'plugin'];
const DIGITAL_CATEGORIES = ['template', 'dataset'];

const aiSolutions = [
  {
    icon: Brain,
    title: 'AI Content Engine',
    desc: 'Generate product descriptions, marketing copy, SEO content, and campaign materials at scale using GPT-4.',
    href: '/admin/ai',
    tag: 'Marketing',
    color: 'from-[#F0FDFA] to-[#ECFEFF]',
    iconBg: 'bg-primary/10 text-primary',
  },
  {
    icon: BarChart3,
    title: 'Business Intelligence',
    desc: 'AI-powered analytics that surface revenue trends, customer behavior patterns, and growth opportunities.',
    href: '/ai',
    tag: 'Analytics',
    color: 'from-[#EFF6FF] to-[#F0FDFA]',
    iconBg: 'bg-accent/10 text-accent',
  },
  {
    icon: Globe,
    title: 'SEO Optimizer',
    desc: 'Automatically generate SEO metadata, keywords, and schema markup to rank higher in search results.',
    href: '/admin/ai',
    tag: 'SEO',
    color: 'from-[#F0FDF4] to-[#ECFDF5]',
    iconBg: 'bg-success/10 text-success',
  },
  {
    icon: Zap,
    title: 'Campaign Builder',
    desc: 'Create complete marketing campaigns — email sequences, social posts, and ad copy — in minutes.',
    href: '/admin/ai',
    tag: 'Campaigns',
    color: 'from-[#FFF7ED] to-[#FFFBEB]',
    iconBg: 'bg-warning/10 text-warning',
  },
];

const categories = [
  {
    type: 'ai' as const,
    icon: Brain,
    label: 'AI Tools',
    desc: 'Intelligent automation for every workflow',
    href: '/ai',
    gradient: 'from-primary/8 to-accent/8',
    border: 'border-primary/20',
  },
  {
    type: 'saas' as const,
    icon: LayoutDashboard,
    label: 'SaaS Apps',
    desc: 'Cloud-native business applications',
    href: '/saas',
    gradient: 'from-accent/8 to-primary/8',
    border: 'border-accent/20',
  },
  {
    type: 'digital' as const,
    icon: FileText,
    label: 'Digital Products',
    desc: 'Templates, planners & digital assets',
    href: '/digital',
    gradient: 'from-warning/8 to-success/8',
    border: 'border-warning/20',
  },
];

function productCountLabel(count: number | null) {
  if (count === null) return 'Loading products…';
  return `${count} ${count === 1 ? 'product' : 'products'}`;
}

export default function CategoryShowcase() {
  const supabase = useMemo(() => createClient(), []);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCounts>({
    ai: null,
    saas: null,
    digital: null,
  });

  const loadCategoryCounts = useCallback(async () => {
    const [totalResult, aiResult, digitalResult] = await Promise.all([
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .in('category', AI_CATEGORIES),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .in('category', DIGITAL_CATEGORIES),
    ]);

    if (totalResult.error || aiResult.error || digitalResult.error) {
      console.error(
        'Homepage category counts could not be refreshed:',
        totalResult.error?.message || aiResult.error?.message || digitalResult.error?.message,
      );
      return;
    }

    const total = totalResult.count ?? 0;
    const ai = aiResult.count ?? 0;
    const digital = digitalResult.count ?? 0;

    setCategoryCounts({
      ai,
      digital,
      saas: Math.max(0, total - ai - digital),
    });
  }, [supabase]);

  useEffect(() => {
    void loadCategoryCounts();

    const channel = supabase
      .channel('homepage-product-counts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => void loadCategoryCounts(),
      )
      .subscribe();

    const refreshOnFocus = () => void loadCategoryCounts();
    const refreshOnVisibility = () => {
      if (document.visibilityState === 'visible') void loadCategoryCounts();
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisibility);

    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisibility);
      void supabase.removeChannel(channel);
    };
  }, [loadCategoryCounts, supabase]);

  return (
    <>
      {/* AI Solutions Section */}
      <section className="py-24 bg-gradient-section">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 border border-primary/15 mb-4">
              <Sparkles size={11} className="text-primary" />
              <span className="text-xs font-600 text-primary uppercase tracking-wider">AI Solutions</span>
            </div>
            <h2 className="text-3xl font-800 text-foreground mb-3">
              Intelligence built into every product
            </h2>
            <p className="text-secondary-foreground max-w-xl mx-auto text-sm leading-relaxed">
              SUMMECA's AI engine powers content generation, SEO optimization, campaign building, and business analytics — all from one platform.
            </p>
          </div>

          {/* Asymmetric grid — 2 large + 2 small */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Large card */}
            <div className={`lg:row-span-2 rounded-2xl border border-primary/15 bg-gradient-to-br ${aiSolutions[0].color} p-7 flex flex-col card-hover`}>
              <div className={`w-12 h-12 rounded-2xl ${aiSolutions[0].iconBg} flex items-center justify-center mb-5`}>
                {React.createElement(aiSolutions[0].icon, { size: 22 })}
              </div>
              <span className="text-xs font-600 text-primary uppercase tracking-wider mb-3">{aiSolutions[0].tag}</span>
              <h3 className="text-xl font-700 text-foreground mb-3">{aiSolutions[0].title}</h3>
              <p className="text-sm text-secondary-foreground leading-relaxed flex-1">{aiSolutions[0].desc}</p>
              <Link href={aiSolutions[0].href} className="mt-6 flex items-center gap-1.5 text-sm font-600 text-primary hover:gap-2.5 transition-all duration-200">
                Explore <ArrowRight size={14} />
              </Link>
            </div>

            {/* Regular cards */}
            {aiSolutions.slice(1).map((sol) => (
              <div key={sol.title} className={`rounded-2xl border border-border bg-gradient-to-br ${sol.color} p-6 flex flex-col card-hover`}>
                <div className={`w-10 h-10 rounded-xl ${sol.iconBg} flex items-center justify-center mb-4`}>
                  {React.createElement(sol.icon, { size: 18 })}
                </div>
                <span className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-2">{sol.tag}</span>
                <h3 className="text-base font-700 text-foreground mb-2">{sol.title}</h3>
                <p className="text-xs text-secondary-foreground leading-relaxed flex-1">{sol.desc}</p>
                <Link href={sol.href} className="mt-4 flex items-center gap-1 text-xs font-600 text-primary hover:gap-2 transition-all duration-200">
                  Learn more <ArrowRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category Showcase */}
      <section className="py-20 bg-white">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-800 text-foreground mb-3">Browse by category</h2>
            <p className="text-secondary-foreground text-sm">Find exactly what your business needs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {categories.map((cat) => (
              <Link
                key={cat.type}
                href={cat.href}
                className={`group relative rounded-2xl border ${cat.border} bg-gradient-to-br ${cat.gradient} p-7 card-hover overflow-hidden`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/30 -translate-y-16 translate-x-16" />
                <div className="w-12 h-12 rounded-2xl bg-white shadow-card flex items-center justify-center mb-5">
                  {React.createElement(cat.icon, { size: 22, className: 'text-primary' })}
                </div>
                <div className="text-xs font-600 text-muted-foreground mb-1">{productCountLabel(categoryCounts[cat.type])}</div>
                <h3 className="text-xl font-700 text-foreground mb-2 group-hover:text-primary transition-colors">{cat.label}</h3>
                <p className="text-sm text-secondary-foreground mb-5">{cat.desc}</p>
                <div className="flex items-center gap-1.5 text-sm font-600 text-primary group-hover:gap-3 transition-all duration-200">
                  Browse <ArrowRight size={14} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
