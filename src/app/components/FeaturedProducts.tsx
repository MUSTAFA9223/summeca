import React from 'react';
import Link from 'next/link';
import { ArrowRight, Star, Zap, LayoutDashboard, FileText, TrendingUp, Brain, Sparkles, Shield } from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const products = [
  {
    id: 'prod-001',
    name: 'AI Cost Guard',
    slug: 'ai-cost-guard',
    type: 'ai' as const,
    category: 'Analytics',
    shortDesc: 'Monitor, analyze, and optimize your AI API spending in real-time across all providers.',
    rating: 4.8,
    reviewCount: 142,
    price: 0,
    proPice: 29,
    isFree: true,
    isFeatured: true,
    icon: TrendingUp,
    badge: 'Most Popular',
    span: 'lg:col-span-2',
  },
  {
    id: 'prod-002',
    name: 'AI PDF Analyzer',
    slug: 'ai-pdf-analyzer',
    type: 'ai' as const,
    category: 'Productivity',
    shortDesc: 'Extract insights, summaries, and structured data from any PDF document using AI.',
    rating: 4.7,
    reviewCount: 89,
    price: 19,
    proPice: 19,
    isFree: false,
    isFeatured: true,
    icon: Brain,
    badge: 'New',
    span: '',
  },
  {
    id: 'prod-003',
    name: 'AI Content Generator',
    slug: 'ai-content-generator',
    type: 'ai' as const,
    category: 'Writing',
    shortDesc: 'Generate high-quality blog posts, emails, and marketing copy in seconds with GPT-4.',
    rating: 4.9,
    reviewCount: 213,
    price: 0,
    proPice: 39,
    isFree: true,
    isFeatured: true,
    icon: Zap,
    badge: 'Top Rated',
    span: '',
  },
  {
    id: 'prod-004',
    name: 'Business Dashboard',
    slug: 'business-dashboard',
    type: 'saas' as const,
    category: 'Business',
    shortDesc: 'Unified analytics dashboard for revenue, customers, and operational KPIs.',
    rating: 4.6,
    reviewCount: 67,
    price: 49,
    proPice: 49,
    isFree: false,
    isFeatured: true,
    icon: LayoutDashboard,
    badge: 'SaaS',
    span: '',
  },
  {
    id: 'prod-005',
    name: 'Teacher Planner 2026',
    slug: 'teacher-planner-2026',
    type: 'digital' as const,
    category: 'Education',
    shortDesc: 'Complete digital planner for educators — lesson plans, grade tracking, and schedules.',
    rating: 4.9,
    reviewCount: 318,
    price: 12,
    proPice: 12,
    isFree: false,
    isFeatured: true,
    icon: FileText,
    badge: 'Digital',
    span: 'lg:col-span-2',
  },
];

const typeGradientMap: Record<string, string> = {
  ai: 'from-[#F0FDFA] to-[#ECFEFF]',
  saas: 'from-[#EFF6FF] to-[#F0FDFA]',
  digital: 'from-[#FFF7ED] to-[#FFFBEB]',
};

const typeAccentMap: Record<string, string> = {
  ai: 'text-primary bg-primary/10',
  saas: 'text-accent bg-accent/10',
  digital: 'text-warning bg-warning/10',
};

export default function FeaturedProducts() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-screen-xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 border border-primary/15 mb-3">
              <Sparkles size={11} className="text-primary" />
              <span className="text-xs font-600 text-primary uppercase tracking-wider">Featured Products</span>
            </div>
            <h2 className="text-3xl font-800 text-foreground">
              Tools that drive real results
            </h2>
            <p className="text-secondary-foreground mt-2 text-sm max-w-md">
              Precision-built AI tools and SaaS applications for modern business operations.
            </p>
          </div>
          <Link
            href="/products"
            className="flex items-center gap-1.5 text-sm font-600 text-primary hover:text-primary/80 transition-colors whitespace-nowrap"
          >
            View all products <ArrowRight size={14} />
          </Link>
        </div>

        {/* Bento-style products grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className={`group relative rounded-2xl border border-border bg-gradient-to-br ${typeGradientMap[product.type] || 'from-white to-gray-50'} p-5 card-hover cursor-pointer block overflow-hidden ${product.span}`}
            >
              {/* Subtle corner accent */}
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary/4 -translate-y-12 translate-x-12" />

              {/* Top row */}
              <div className="flex items-start justify-between mb-4 relative">
                <div className="w-11 h-11 rounded-xl bg-white shadow-card flex items-center justify-center">
                  <product.icon size={20} className="text-primary" />
                </div>
                <span className={`text-xs font-600 px-2.5 py-1 rounded-full ${typeAccentMap[product.type]}`}>
                  {product.badge}
                </span>
              </div>

              {/* Name + desc */}
              <h3 className="text-sm font-700 text-foreground mb-1.5 group-hover:text-primary transition-colors duration-200">
                {product.name}
              </h3>
              <p className="text-xs text-secondary-foreground leading-relaxed mb-4 line-clamp-2">
                {product.shortDesc}
              </p>

              {/* Rating */}
              <div className="flex items-center gap-1.5 mb-4">
                <Star size={11} className="text-warning fill-warning" />
                <span className="text-xs font-700 text-foreground">{product.rating}</span>
                <span className="text-xs text-muted-foreground">({product.reviewCount} reviews)</span>
              </div>

              {/* Price + CTA */}
              <div className="flex items-center justify-between">
                <div>
                  {product.isFree ? (
                    <span className="text-sm font-700 text-success">Free to start</span>
                  ) : (
                    <span className="text-sm font-700 text-foreground tabular-nums">
                      ${product.proPice}<span className="text-xs font-400 text-muted-foreground">/mo</span>
                    </span>
                  )}
                </div>
                <span className="text-xs font-600 text-primary flex items-center gap-1 group-hover:gap-2 transition-all duration-200">
                  {product.isFree ? 'Try Free' : 'View'} <ArrowRight size={11} />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Trust row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 pt-8 border-t border-border">
          {[
            { icon: Shield, text: 'Enterprise Security' },
            { icon: Zap, text: 'Instant Access' },
            { icon: Star, text: '4.9 Average Rating' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm text-secondary-foreground">
              <Icon size={14} className="text-primary" />
              <span className="font-500">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}