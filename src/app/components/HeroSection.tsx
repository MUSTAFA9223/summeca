'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BriefcaseBusiness,
  LifeBuoy,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Zap,
} from 'lucide-react';
import SummecaHero3DScene from '@/components/home/SummecaHero3DScene';
import { WorkspaceOverviewPreview } from '@/components/catalog/ProductProofPreview';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackEvent } from '@/lib/analytics';

export default function HeroSection() {
  const { isArabic } = useLanguage();

  useEffect(() => {
    document.body.classList.add('summeca-home-theme');
    return () => document.body.classList.remove('summeca-home-theme');
  }, []);

  useEffect(() => {
    trackEvent('homepage_view', {
      page: 'home',
      audience: 'small_ecommerce',
    });
  }, []);

  const copy = isArabic
    ? {
        eyebrow: 'تطبيقات ذكاء اصطناعي وSaaS للأعمال الحديثة',
        suite: 'منظومة أعمال ذكية',
        headlineOne: 'حوّل العميل إلى عرض ثم فاتورة',
        headlineTwo: 'باستخدام تطبيقات SUMMECA الذكية.',
        body: 'استخدم LeadFollow AI للمتابعة، وProposalFlow AI لإنشاء عروض العملاء، وInvoiceFlow للفواتير ضمن مجموعة مركزة من تطبيقات AI وSaaS.',
        invoiceFlow: 'استكشف InvoiceFlow',
        leadFollow: 'استكشف LeadFollow AI',
        allProducts: 'عرض كل المنتجات',
        workFaster: 'اعمل أسرع',
        connected: 'منظومة واحدة متصلة',
        modern: 'مصمم للأعمال الحديثة',
        pricing: 'أسعار واضحة',
        checkout: 'دفع محمي',
        access: 'وصول مرتبط بالحساب',
        support: 'دعم العملاء',
      }
    : {
        eyebrow: 'Focused AI & SaaS apps for modern business',
        suite: 'AI business suite',
        headlineOne: 'Move from lead to proposal to invoice',
        headlineTwo: 'with focused SUMMECA AI & SaaS apps.',
        body: 'Use LeadFollow AI for follow-up, ProposalFlow AI for client proposals, and InvoiceFlow for invoicing in one focused SUMMECA product line.',
        invoiceFlow: 'Explore InvoiceFlow',
        leadFollow: 'Explore LeadFollow AI',
        allProducts: 'View all products',
        workFaster: 'Work faster',
        connected: 'One connected suite',
        modern: 'Built for modern business',
        pricing: 'Transparent pricing',
        checkout: 'Protected checkout',
        access: 'Account-based access',
        support: 'Customer support',
      };

  return (
    <section className="summeca-home-hero relative isolate min-h-[580px] overflow-hidden pt-[70px] text-foreground lg:min-h-[620px]">
      <div className="summeca-hero-grid pointer-events-none absolute inset-0" />
      <div className="summeca-hero-noise pointer-events-none absolute inset-0" />
      <div className="summeca-hero-orb summeca-hero-orb-a pointer-events-none absolute" />
      <div className="summeca-hero-orb summeca-hero-orb-b pointer-events-none absolute" />
      <div className="summeca-hero-top-fade pointer-events-none absolute inset-x-0 top-0 h-28" />

      <div className="relative z-10 mx-auto grid min-h-[510px] max-w-[1440px] grid-cols-1 items-center lg:min-h-[550px] lg:grid-cols-[46%_54%]">
        <div
          className={`relative px-6 pb-10 pt-10 sm:px-10 sm:pt-12 lg:px-12 lg:pb-14 lg:pt-14 xl:px-16 ${
            isArabic ? 'text-right' : 'text-left'
          }`}
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          <div className="summeca-reveal summeca-reveal-1 mb-7 flex flex-wrap items-center gap-2.5">
            <span className={`summeca-hero-eyebrow inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[10px] font-bold tracking-[0.14em] backdrop-blur-xl ${
              isArabic ? 'normal-case' : 'uppercase'
            }`}>
              <Store size={14} className="text-primary" />
              {copy.eyebrow}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.06] px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary">
              <Sparkles size={12} />
              {copy.suite}
            </span>
          </div>

          <h1
            className={`summeca-reveal summeca-reveal-2 max-w-[760px] break-normal hyphens-none text-[clamp(3rem,5.2vw,5.4rem)] font-black ${
              isArabic
                ? 'leading-[1.1] tracking-normal'
                : 'leading-[0.91] tracking-[-0.055em]'
            }`}
          >
            <span className="summeca-hero-headline-line block">{copy.headlineOne}</span>
            <span className="mt-4 block bg-gradient-to-r from-[#0aa7a5] via-[#16c8cc] to-[#38bdf8] bg-clip-text text-transparent">
              {copy.headlineTwo}
            </span>
          </h1>

          <p className="summeca-hero-copy summeca-reveal summeca-reveal-3 mt-7 max-w-[620px] text-base leading-7 sm:text-[17px] sm:leading-8">
            {copy.body}
          </p>

          <div className={`summeca-reveal summeca-reveal-4 mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${
            isArabic ? 'sm:flex-row-reverse sm:justify-end' : ''
          }`}>
            <Link
              href="/products/summeca-invoiceflow"
              onClick={() =>
                trackEvent('primary_cta_click', {
                  placement: 'homepage_hero',
                  destination: 'summeca-invoiceflow',
                  audience: 'small_ecommerce',
                })
              }
              className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#08a99f] via-[#18c7b7] to-[#27b8ef] px-6 py-3.5 text-sm font-extrabold text-[#03231f] shadow-[0_16px_38px_rgba(20,184,166,0.20)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(56,189,248,0.24)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transform-none motion-reduce:transition-none"
            >
              {copy.invoiceFlow}
              <ArrowRight size={16} className={`transition-transform duration-200 group-hover:translate-x-0.5 ${isArabic ? 'rotate-180 group-hover:-translate-x-0.5' : ''}`} />
            </Link>

            <Link
              href="/products/summeca-leadfollow-ai"
              onClick={() =>
                trackEvent('secondary_cta_click', {
                  placement: 'homepage_hero',
                  destination: 'summeca-leadfollow-ai',
                  audience: 'small_ecommerce',
                })
              }
              className="summeca-hero-secondary-cta group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card/70 px-5 py-3.5 text-sm font-bold text-foreground shadow-sm backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transform-none motion-reduce:transition-none"
            >
              {copy.leadFollow}
              <ArrowRight size={14} className={`text-primary ${isArabic ? 'rotate-180' : ''}`} />
            </Link>
          </div>

          <Link
            href="/products"
            onClick={() =>
              trackEvent('product_catalog_click', {
                placement: 'homepage_hero',
                destination: 'products',
              })
            }
            className="summeca-hero-tertiary-link summeca-reveal summeca-reveal-4 mt-3 inline-flex min-h-10 items-center gap-2 px-1 py-2 text-xs font-bold text-muted-foreground underline-offset-4 transition duration-200 hover:text-primary hover:underline focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {copy.allProducts}
            <ArrowRight size={13} className={isArabic ? 'rotate-180' : ''} />
          </Link>

          <div className="summeca-reveal summeca-reveal-4 mt-7 grid max-w-[650px] grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: Zap, title: copy.workFaster, body: 'Turn leads into revenue' },
              { icon: Users, title: copy.connected, body: 'From contact to cash' },
              { icon: ShieldCheck, title: copy.modern, body: 'Secure. Scalable. Focused.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/45 px-3.5 py-3 backdrop-blur-xl">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={17} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold text-foreground">{title}</p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="sr-only">
            {copy.pricing}. {copy.checkout}. {copy.access}.
          </p>

          <Link
            href="/support"
            className="summeca-reveal summeca-reveal-4 mt-4 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            <LifeBuoy size={14} className="text-primary" />
            {copy.support}
          </Link>
        </div>

        <div className="relative flex min-h-[400px] items-center self-stretch overflow-visible px-4 py-8 sm:min-h-[450px] sm:px-8 lg:min-h-[550px] lg:pl-2 lg:pr-12 xl:pr-16">
          <div className="summeca-hero-preview-orb pointer-events-none absolute left-[55%] top-[48%] h-[68%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]" />

          <div className="summeca-reveal summeca-reveal-3 relative z-10 w-full">
            <div className="relative mx-auto max-w-[820px]">
              <div className="relative rounded-[32px] border border-primary/15 bg-card/50 p-3 shadow-[0_34px_90px_rgba(8,68,78,0.18)] backdrop-blur-xl sm:p-4">
                <div className="rounded-[24px] border border-slate-700/50 bg-[#07171d] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
                  <SummecaHero3DScene>
                    <WorkspaceOverviewPreview className="h-full w-full border-slate-700/60 shadow-none" />
                  </SummecaHero3DScene>
                </div>
              </div>

              <div className="mx-auto h-5 w-[76%] rounded-b-[50%] bg-gradient-to-b from-slate-300/70 to-slate-500/20 shadow-[0_16px_30px_rgba(15,118,110,0.12)]" />

              <div className="absolute -bottom-2 right-2 hidden rounded-2xl border border-primary/20 bg-card/95 px-4 py-3 shadow-xl backdrop-blur-xl sm:block">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BriefcaseBusiness size={17} />
                  </span>
                  <div>
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground">Workspace</p>
                    <p className="mt-0.5 text-xs font-extrabold text-primary">One SUMMECA account</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}