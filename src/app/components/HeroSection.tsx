'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, LifeBuoy, LockKeyhole, ShieldCheck, Store, User } from 'lucide-react';
import { WorkspaceOverviewPreview } from '@/components/catalog/ProductProofPreview';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { trackEvent } from '@/lib/analytics';

export default function HeroSection() {
  const { theme } = useTheme();
  const { isArabic } = useLanguage();
  const isLight = theme === 'light';

  useEffect(() => {
    const darkClass = 'summeca-home-theme';
    const lightClass = 'summeca-home-light-theme';

    document.body.classList.toggle(darkClass, theme === 'dark');
    document.body.classList.toggle(lightClass, theme === 'light');

    return () => {
      document.body.classList.remove(darkClass, lightClass);
    };
  }, [theme]);

  useEffect(() => {
    trackEvent('homepage_view', {
      page: 'home',
      audience: 'small_ecommerce',
    });
  }, []);

  const headlineStyle = {
    color: isLight ? '#062b35' : '#e8fbfa',
    WebkitTextStroke: isLight
      ? '0.6px rgba(0, 169, 165, 0.34)'
      : '0.6px rgba(32, 217, 189, 0.34)',
    textShadow: isLight
      ? '0 10px 32px rgba(6, 43, 53, 0.055)'
      : '0 0 30px rgba(34, 211, 238, 0.08)',
  };

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
      };

  return (
    <section
      className={`summeca-home-hero relative isolate min-h-[580px] overflow-hidden pt-[70px] lg:min-h-[620px] ${
        isLight ? 'bg-[#f3fafa] text-[#062b35]' : 'bg-[#06151c] text-white'
      }`}
    >
      <div className="summeca-hero-grid pointer-events-none absolute inset-0" />
      <div className="summeca-hero-noise pointer-events-none absolute inset-0" />
      <div className="summeca-hero-orb summeca-hero-orb-a pointer-events-none absolute" />
      <div className="summeca-hero-orb summeca-hero-orb-b pointer-events-none absolute" />
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b to-transparent ${
          isLight ? 'from-[#f8fcfc] via-[#f8fcfc]/90' : 'from-[#06151c] via-[#06151c]/88'
        }`}
      />

      <div className="relative z-10 mx-auto grid min-h-[510px] max-w-[1440px] grid-cols-1 items-center lg:min-h-[550px] lg:grid-cols-[46%_54%]">
        <div
          className={`relative px-6 pb-8 pt-9 sm:px-10 sm:pt-10 lg:px-12 lg:pb-10 lg:pt-11 xl:px-16 ${
            isArabic ? 'text-right' : 'text-left'
          }`}
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          <div
            className={`summeca-reveal summeca-reveal-1 mb-5 inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[10px] font-bold tracking-[0.14em] backdrop-blur-xl ${
              isArabic ? 'normal-case' : 'uppercase'
            } ${
              isLight
                ? 'border border-[#00a9a5]/20 bg-white/80 text-[#315b63] shadow-[0_8px_24px_rgba(6,43,53,0.05)]'
                : 'border border-[#58ead8]/15 bg-[#58ead8]/[0.055] text-[#ccebed]'
            }`}
          >
            <Store size={14} className={isLight ? 'text-[#00a9a5]' : 'text-[#20d9bd]'} />
            {copy.eyebrow}
          </div>

          <h1
            className={`summeca-reveal summeca-reveal-2 max-w-[760px] break-normal hyphens-none text-[clamp(2.65rem,4.7vw,4.95rem)] font-black ${
              isArabic
                ? 'leading-[1.12] tracking-normal'
                : 'leading-[0.96] tracking-[-0.045em] sm:leading-[0.94]'
            }`}
          >
            <span className="block" style={headlineStyle}>{copy.headlineOne}</span>
            <span className="mt-2 block" style={headlineStyle}>{copy.headlineTwo}</span>
          </h1>

          <p
            className={`summeca-reveal summeca-reveal-3 mt-5 max-w-xl text-sm leading-6 sm:text-base sm:leading-7 ${
              isLight ? 'text-[#5d7f86]' : 'text-[#9abec8]'
            }`}
          >
            {copy.body}
          </p>

          <div className={`summeca-reveal summeca-reveal-4 mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${isArabic ? 'sm:flex-row-reverse sm:justify-end' : ''}`}>
            <Link
              href="/products/summeca-invoiceflow"
              onClick={() =>
                trackEvent('primary_cta_click', {
                  placement: 'homepage_hero',
                  destination: 'summeca-invoiceflow',
                  audience: 'small_ecommerce',
                })
              }
              className="group inline-flex min-h-11 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#109f8d] via-[#20d9bd] to-[#4bcdf6] px-6 py-3 text-sm font-bold text-[#03231f] shadow-[0_14px_42px_rgba(32,217,189,0.22)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(75,205,246,0.24)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4bcdf6] motion-reduce:transform-none motion-reduce:transition-none"
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
              className={`group inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-bold transition duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4bcdf6] motion-reduce:transform-none motion-reduce:transition-none ${
                isLight
                  ? 'border-[#00a9a5]/25 bg-white/70 text-[#24515a] hover:border-[#00a9a5]/45 hover:text-[#007f7c]'
                  : 'border-[#74d8d8]/20 bg-[#0a2229]/65 text-[#d5eef0] hover:border-[#4bcdf6]/45 hover:text-white'
              }`}
            >
              {copy.leadFollow}
              <ArrowRight size={14} className={`${isLight ? 'text-[#00a9a5]' : 'text-[#4bcdf6]'} ${isArabic ? 'rotate-180' : ''}`} />
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
            className={`summeca-reveal summeca-reveal-4 mt-3 inline-flex min-h-10 items-center gap-2 px-1 py-2 text-xs font-bold underline-offset-4 transition duration-200 hover:underline focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4bcdf6] motion-reduce:transition-none ${
              isLight ? 'text-[#5d7f86] hover:text-[#007f7c]' : 'text-[#9abec8] hover:text-white'
            }`}
          >
            {copy.allProducts}
            <ArrowRight size={13} className={`${isArabic ? 'rotate-180' : ''}`} />
          </Link>

          <div
            className={`summeca-reveal summeca-reveal-4 mt-4 flex max-w-2xl flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-[11px] font-semibold ${
              isLight ? 'border-[#00a9a5]/15 text-[#5d7f86]' : 'border-[#74d8d8]/10 text-[#91b5bf]'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className={isLight ? 'text-[#00a9a5]' : 'text-[#20d9bd]'} /> {copy.pricing}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole size={14} className={isLight ? 'text-[#00a9a5]' : 'text-[#20d9bd]'} /> {copy.checkout}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <User size={14} className={isLight ? 'text-[#00a9a5]' : 'text-[#20d9bd]'} /> {copy.access}
            </span>
            <Link
              href="/support"
              className={`inline-flex items-center gap-1.5 transition-colors duration-200 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4bcdf6] ${
                isLight ? 'hover:text-[#008f8c]' : 'hover:text-white'
              }`}
            >
              <LifeBuoy size={14} className={isLight ? 'text-[#149bb3]' : 'text-[#4bcdf6]'} /> {copy.support}
            </Link>
          </div>
        </div>

        <div className="relative flex min-h-[400px] items-center self-stretch overflow-hidden px-4 py-5 sm:min-h-[450px] sm:px-8 lg:min-h-[550px] lg:overflow-visible lg:pl-1 lg:pr-10 xl:pr-14">
          <div
            className={`pointer-events-none absolute left-[52%] top-[50%] h-[54%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full blur-[82px] ${
              isLight ? 'bg-[#00a9a5]/10' : 'bg-[#20d9bd]/10'
            }`}
          />
          <WorkspaceOverviewPreview className="summeca-reveal summeca-reveal-3 relative z-10 w-full max-w-[760px] border-slate-700/70 shadow-[0_24px_70px_rgba(0,0,0,0.28)] lg:scale-[1.055]" />
        </div>
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t to-transparent ${
          isLight ? 'from-[#f3fafa]' : 'from-[#06151c]'
        }`}
      />
    </section>
  );
}
