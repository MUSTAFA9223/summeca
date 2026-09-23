'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, LifeBuoy, LockKeyhole, ShieldCheck, Store, User } from 'lucide-react';
import SummecaHero3DScene from '@/components/home/SummecaHero3DScene';
import { WorkspaceOverviewPreview } from '@/components/catalog/ProductProofPreview';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackEvent } from '@/lib/analytics';

export default function HeroSection() {
  const { isArabic } = useLanguage();
  useEffect(() => {
    document.body.classList.add('summeca-home-theme');

    return () => {
      document.body.classList.remove('summeca-home-theme');
    };
  }, []);

  useEffect(() => {
    trackEvent('homepage_view', {
      page: 'home',
      audience: 'small_ecommerce',
    });
  }, []);

  const copy = isArabic
    ? {
        eyebrow: 'InvoiceFlow من SUMMECA',
        headlineOne: 'أنشئ فواتير احترافية خلال دقائق،',
        headlineTwo: 'بدلًا من فوضى الجداول.',
        body: 'أدر العملاء وأنشئ الفواتير وتابع حالة الدفع من مساحة عمل واحدة. ابدأ بالمستوى المجاني المحدود داخل حساب SUMMECA بدون شراء.',
        invoiceFlow: 'جرّب InvoiceFlow مجانًا',
        leadFollow: 'شاهد معاينة المنتج',
        allProducts: 'عرض كل المنتجات',
        pricing: 'أسعار واضحة',
        checkout: 'دفع محمي',
        access: 'وصول مرتبط بالحساب',
        support: 'دعم العملاء',
      }
    : {
        eyebrow: 'SUMMECA InvoiceFlow',
        headlineOne: 'Create professional invoices in minutes,',
        headlineTwo: 'not spreadsheets.',
        body: 'Manage clients, create invoices, track payment status and keep billing organized in one focused workspace. Start with the limited Free tier in your SUMMECA account — no purchase required.',
        invoiceFlow: 'Try InvoiceFlow free',
        leadFollow: 'Watch the real product demo',
        allProducts: 'View all products',
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
      <div className="summeca-hero-top-fade pointer-events-none absolute inset-x-0 top-0 h-32" />

      <div className="relative z-10 mx-auto grid min-h-[510px] max-w-[1440px] grid-cols-1 items-center lg:min-h-[550px] lg:grid-cols-[46%_54%]">
        <div
          className={`relative px-6 pb-8 pt-9 sm:px-10 sm:pt-10 lg:px-12 lg:pb-10 lg:pt-11 xl:px-16 ${
            isArabic ? 'text-right' : 'text-left'
          }`}
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          <div
            className={`summeca-hero-eyebrow summeca-reveal summeca-reveal-1 mb-5 inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[10px] font-bold tracking-[0.14em] backdrop-blur-xl ${
              isArabic ? 'normal-case' : 'uppercase'
            }`}
          >
            <Store size={14} className="text-primary" />
            {copy.eyebrow}
          </div>

          <h1
            className={`summeca-reveal summeca-reveal-2 max-w-[760px] break-normal hyphens-none text-[clamp(2.65rem,4.7vw,4.95rem)] font-black ${
              isArabic
                ? 'leading-[1.12] tracking-normal'
                : 'leading-[0.96] tracking-[-0.045em] sm:leading-[0.94]'
            }`}
          >
            <span className="summeca-hero-headline-line block">{copy.headlineOne}</span>
            <span className="summeca-hero-headline-line mt-2 block">{copy.headlineTwo}</span>
          </h1>

          <p className="summeca-hero-copy summeca-reveal summeca-reveal-3 mt-5 max-w-xl text-sm leading-6 sm:text-base sm:leading-7">
            {copy.body}
          </p>

          <div className={`summeca-reveal summeca-reveal-4 mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${isArabic ? 'sm:flex-row-reverse sm:justify-end' : ''}`}>
            <Link
              href="/user-dashboard/invoiceflow"
              onClick={() =>
                trackEvent('primary_cta_click', {
                  placement: 'homepage_hero',
                  destination: 'invoiceflow-free-workspace',
                  audience: 'freelancers_small_business',
                })
              }
              className="group inline-flex min-h-11 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#109f8d] via-[#20d9bd] to-[#4bcdf6] px-6 py-3 text-sm font-bold text-[#03231f] shadow-[0_14px_42px_rgba(32,217,189,0.22)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(75,205,246,0.24)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4bcdf6] motion-reduce:transform-none motion-reduce:transition-none"
            >
              {copy.invoiceFlow}
              <ArrowRight size={16} className={`transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none ${isArabic ? 'rotate-180 group-hover:-translate-x-0.5' : ''}`} />
            </Link>
            <Link
              href="/products/summeca-invoiceflow#product-preview"
              onClick={() =>
                trackEvent('secondary_cta_click', {
                  placement: 'homepage_hero',
                  destination: 'summeca-invoiceflow-demo',
                  audience: 'freelancers_small_business',
                })
              }
              className="summeca-hero-secondary-cta group inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-bold transition duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4bcdf6] motion-reduce:transform-none motion-reduce:transition-none"
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
            <ArrowRight size={13} className={`${isArabic ? 'rotate-180' : ''}`} />
          </Link>

          <div className="summeca-hero-trust summeca-reveal summeca-reveal-4 mt-4 flex max-w-2xl flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-[11px] font-semibold">
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

        <div className="relative flex min-h-[400px] items-center self-stretch overflow-hidden px-4 py-5 sm:min-h-[450px] sm:px-8 lg:min-h-[550px] lg:overflow-visible lg:pl-1 lg:pr-10 xl:pr-14">
          <div className="summeca-hero-preview-orb pointer-events-none absolute left-[52%] top-[50%] h-[54%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full blur-[82px]" />
          <div className="summeca-reveal summeca-reveal-3 relative z-10 w-full">
            <SummecaHero3DScene>
              <WorkspaceOverviewPreview className="h-full w-full border-slate-700/60 shadow-none" />
            </SummecaHero3DScene>
          </div>
        </div>
      </div>

      <div className="summeca-hero-bottom-fade pointer-events-none absolute inset-x-0 bottom-0 h-20" />
    </section>
  );
}
