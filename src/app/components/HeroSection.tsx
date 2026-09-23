'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  FileText,
  LifeBuoy,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Store,
  User,
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
        headlineOne: 'حوّل العميل إلى عرض ثم فاتورة',
        headlineTwo: 'باستخدام تطبيقات SUMMECA الذكية.',
        body: 'استخدم LeadFollow AI للمتابعة، وProposalFlow AI لإنشاء عروض العملاء، وInvoiceFlow للفواتير ضمن مجموعة مركزة من تطبيقات AI وSaaS.',
        invoiceFlow: 'استكشف InvoiceFlow',
        leadFollow: 'استكشف LeadFollow AI',
        allProducts: 'عرض كل المنتجات',
        pricing: 'أسعار واضحة',
        checkout: 'دفع محمي',
        access: 'وصول مرتبط بالحساب',
        support: 'دعم العملاء',
        suite: 'منظومة أعمال ذكية',
      }
    : {
        eyebrow: 'Focused AI & SaaS apps for modern business',
        headlineOne: 'Move from lead to proposal to invoice',
        headlineTwo: 'with focused SUMMECA AI & SaaS apps.',
        body: 'Use LeadFollow AI for follow-up, ProposalFlow AI for client proposals, and InvoiceFlow for invoicing in one focused SUMMECA product line.',
        invoiceFlow: 'Explore InvoiceFlow',
        leadFollow: 'Explore LeadFollow AI',
        allProducts: 'View all products',
        pricing: 'Transparent pricing',
        checkout: 'Protected checkout',
        access: 'Account-based access',
        support: 'Customer support',
        suite: 'AI business suite',
      };

  return (
    <section className="summeca-home-hero relative isolate min-h-[580px] overflow-hidden pt-[70px] text-foreground lg:min-h-[620px]">
      <div className="summeca-hero-grid pointer-events-none absolute inset-0" />
      <div className="summeca-hero-noise pointer-events-none absolute inset-0" />
      <div className="summeca-hero-orb summeca-hero-orb-a pointer-events-none absolute" />
      <div className="summeca-hero-orb summeca-hero-orb-b pointer-events-none absolute" />
      <div className="summeca-hero-top-fade pointer-events-none absolute inset-x-0 top-0 h-32" />

      <div className="pointer-events-none absolute left-1/2 top-[13%] hidden -translate-x-1/2 select-none text-[clamp(6rem,14vw,13rem)] font-black tracking-[-0.08em] text-foreground/[0.025] xl:block">
        SUMMECA
      </div>

      <div className="relative z-10 mx-auto grid min-h-[510px] max-w-[1440px] grid-cols-1 items-center lg:min-h-[550px] lg:grid-cols-[46%_54%]">
        <div
          className={`relative px-6 pb-10 pt-10 sm:px-10 sm:pt-12 lg:px-12 lg:pb-12 lg:pt-12 xl:px-16 ${
            isArabic ? 'text-right' : 'text-left'
          }`}
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          <div className="summeca-reveal summeca-reveal-1 mb-5 flex flex-wrap items-center gap-2.5">
            <span className={`summeca-hero-eyebrow inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[10px] font-bold tracking-[0.14em] backdrop-blur-xl ${
              isArabic ? 'normal-case' : 'uppercase'
            }`}>
              <Store size={14} className="text-primary" />
              {copy.eyebrow}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary">
              <Sparkles size={12} />
              {copy.suite}
            </span>
          </div>

          <h1
            className={`summeca-reveal summeca-reveal-2 max-w-[760px] break-normal hyphens-none text-[clamp(2.8rem,5vw,5.35rem)] font-black ${
              isArabic
                ? 'leading-[1.12] tracking-normal'
                : 'leading-[0.92] tracking-[-0.055em] sm:leading-[0.9]'
            }`}
          >
            <span className="summeca-hero-headline-line block">{copy.headlineOne}</span>
            <span className="mt-3 block bg-gradient-to-r from-primary via-[#22d3ee] to-[#7dd3fc] bg-clip-text text-transparent">
              {copy.headlineTwo}
            </span>
          </h1>

          <p className="summeca-hero-copy summeca-reveal summeca-reveal-3 mt-6 max-w-xl text-sm leading-6 sm:text-[17px] sm:leading-8">
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
              className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#0f9f94] via-[#18c7b7] to-[#38bdf8] px-6 py-3.5 text-sm font-extrabold text-[#03231f] shadow-[0_16px_46px_rgba(32,217,189,0.24)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_56px_rgba(75,205,246,0.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4bcdf6] motion-reduce:transform-none motion-reduce:transition-none"
            >
              {copy.invoiceFlow}
              <ArrowRight size={16} className={`transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none ${isArabic ? 'rotate-180 group-hover:-translate-x-0.5' : ''}`} />
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
              className="summeca-hero-secondary-cta group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-5 py-3.5 text-sm font-bold transition duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4bcdf6] motion-reduce:transform-none motion-reduce:transition-none"
            >
              {copy.leadFollow}
              <ArrowRight size={14} className={`text-accent ${isArabic ? 'rotate-180' : ''}`} />
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
            className="summeca-hero-tertiary-link summeca-reveal summeca-reveal-4 mt-3 inline-flex min-h-10 items-center gap-2 px-1 py-2 text-xs font-bold underline-offset-4 transition duration-200 hover:underline focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4bcdf6] motion-reduce:transition-none"
          >
            {copy.allProducts}
            <ArrowRight size={13} className={isArabic ? 'rotate-180' : ''} />
          </Link>

          <div className="summeca-reveal summeca-reveal-4 mt-6 grid max-w-xl grid-cols-3 overflow-hidden rounded-2xl border border-border/70 bg-card/40 backdrop-blur-xl">
            <div className="border-e border-border/70 px-3 py-3.5">
              <Bot size={15} className="mb-2 text-primary" />
              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">LeadFollow AI</p>
            </div>
            <div className="border-e border-border/70 px-3 py-3.5">
              <FileText size={15} className="mb-2 text-primary" />
              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">ProposalFlow AI</p>
            </div>
            <div className="px-3 py-3.5">
              <ReceiptText size={15} className="mb-2 text-primary" />
              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">InvoiceFlow</p>
            </div>
          </div>

          <div className="summeca-hero-trust summeca-reveal summeca-reveal-4 mt-5 flex max-w-2xl flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-primary" /> {copy.pricing}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole size={14} className="text-primary" /> {copy.checkout}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <User size={14} className="text-primary" /> {copy.access}
            </span>
            <Link
              href="/support"
              className="summeca-hero-support-link inline-flex items-center gap-1.5 transition-colors duration-200 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4bcdf6]"
            >
              <LifeBuoy size={14} className="text-accent" /> {copy.support}
            </Link>
          </div>
        </div>

        <div className="relative flex min-h-[400px] items-center self-stretch overflow-hidden px-4 py-7 sm:min-h-[450px] sm:px-8 lg:min-h-[550px] lg:overflow-visible lg:pl-2 lg:pr-12 xl:pr-16">
          <div className="summeca-hero-preview-orb pointer-events-none absolute left-[52%] top-[50%] h-[62%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px]" />
          <div className="summeca-reveal summeca-reveal-3 relative z-10 w-full">
            <div className="relative rounded-[30px] border border-primary/15 bg-card/30 p-2 shadow-[0_34px_100px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-3">
              <div className="pointer-events-none absolute -left-4 top-12 z-30 hidden rounded-2xl border border-primary/20 bg-card/90 px-4 py-3 shadow-xl backdrop-blur-xl sm:block">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">Workflow</p>
                <p className="mt-1 text-sm font-extrabold text-foreground">Lead → Proposal → Invoice</p>
              </div>
              <div className="pointer-events-none absolute -right-3 bottom-14 z-30 hidden rounded-2xl border border-primary/20 bg-card/90 px-4 py-3 shadow-xl backdrop-blur-xl md:block">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
                <p className="mt-1 text-sm font-extrabold text-primary">One SUMMECA account</p>
              </div>
              <SummecaHero3DScene>
                <WorkspaceOverviewPreview className="h-full w-full border-slate-700/60 shadow-none" />
              </SummecaHero3DScene>
            </div>
          </div>
        </div>
      </div>

      <div className="summeca-hero-bottom-fade pointer-events-none absolute inset-x-0 bottom-0 h-20" />
    </section>
  );
}