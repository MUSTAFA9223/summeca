'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, LifeBuoy, LockKeyhole, ShieldCheck, Store } from 'lucide-react';
import { WorkspaceOverviewPreview } from '@/components/catalog/ProductProofPreview';
import { useTheme } from '@/contexts/ThemeContext';
import { trackEvent } from '@/lib/analytics';

export default function HeroSection() {
  const { theme } = useTheme();
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

  return (
    <section
      className={`summeca-home-hero relative isolate min-h-[620px] overflow-hidden pt-[70px] lg:min-h-[660px] ${
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

      <div className="relative z-10 mx-auto grid min-h-[550px] max-w-[1440px] grid-cols-1 items-center lg:min-h-[590px] lg:grid-cols-[46%_54%]">
        <div className="relative px-6 pb-8 pt-10 sm:px-10 sm:pt-12 lg:px-12 lg:pb-14 lg:pt-14 xl:px-16">
          <div
            className={`summeca-reveal summeca-reveal-1 mb-5 inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-xl ${
              isLight
                ? 'border border-[#00a9a5]/20 bg-white/80 text-[#315b63] shadow-[0_8px_24px_rgba(6,43,53,0.05)]'
                : 'border border-[#58ead8]/15 bg-[#58ead8]/[0.055] text-[#ccebed]'
            }`}
          >
            <Store size={14} className={isLight ? 'text-[#00a9a5]' : 'text-[#20d9bd]'} />
            Built for small e-commerce stores
          </div>

          <h1 className="summeca-reveal summeca-reveal-2 max-w-[720px] text-[clamp(2.75rem,5vw,5.5rem)] font-black uppercase leading-[0.92] tracking-[-0.055em]">
            <span className="summeca-outline-text block">Run your store faster</span>
            <span className="summeca-outline-text mt-2 block">with practical digital tools.</span>
          </h1>

          <p
            className={`summeca-reveal summeca-reveal-3 mt-5 max-w-xl text-sm leading-6 sm:text-base sm:leading-7 ${
              isLight ? 'text-[#5d7f86]' : 'text-[#9abec8]'
            }`}
          >
            Handle invoices, customer follow-ups, and conversion work with focused tools instead of a bloated software stack. See the real product experience before you choose.
          </p>

          <div className="summeca-reveal summeca-reveal-4 mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/sign-up-login-screen"
              onClick={() =>
                trackEvent('primary_cta_click', {
                  placement: 'homepage_hero',
                  destination: 'signup',
                  audience: 'small_ecommerce',
                })
              }
              className="group inline-flex min-h-11 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#109f8d] via-[#20d9bd] to-[#4bcdf6] px-6 py-3 text-sm font-bold text-[#03231f] shadow-[0_14px_42px_rgba(32,217,189,0.22)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_52px_rgba(75,205,246,0.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4bcdf6] motion-reduce:transform-none motion-reduce:transition-none"
            >
              Get Started
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" />
            </Link>
            <Link
              href="/products"
              onClick={() =>
                trackEvent('secondary_cta_click', {
                  placement: 'homepage_hero',
                  destination: 'products',
                })
              }
              className={`group inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4bcdf6] motion-reduce:transform-none motion-reduce:transition-none ${
                isLight
                  ? 'border border-[#00a9a5]/30 bg-white/85 text-[#173f48] shadow-[0_8px_24px_rgba(6,43,53,0.05)] hover:border-[#00a9a5]/55 hover:bg-[#e9f7f7] hover:text-[#007f7c]'
                  : 'border border-[#65dfe0]/15 bg-[#65dfe0]/[0.055] text-[#e6faf9] hover:border-[#4bcdf6]/45 hover:bg-[#4bcdf6]/10 hover:text-white'
              }`}
            >
              View Products
              <ArrowRight size={15} className={isLight ? 'text-[#00a9a5]' : 'text-[#4bcdf6]'} />
            </Link>
          </div>

          <div
            className={`summeca-reveal summeca-reveal-4 mt-6 flex max-w-xl flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-[11px] font-semibold ${
              isLight ? 'border-[#00a9a5]/15 text-[#5d7f86]' : 'border-[#74d8d8]/10 text-[#91b5bf]'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className={isLight ? 'text-[#00a9a5]' : 'text-[#20d9bd]'} /> Transparent production pricing
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole size={14} className={isLight ? 'text-[#00a9a5]' : 'text-[#20d9bd]'} /> Protected digital delivery
            </span>
            <Link
              href="/support"
              className={`inline-flex items-center gap-1.5 transition-colors ${
                isLight ? 'hover:text-[#008f8c]' : 'hover:text-white'
              }`}
            >
              <LifeBuoy size={14} className={isLight ? 'text-[#149bb3]' : 'text-[#4bcdf6]'} /> Customer support
            </Link>
          </div>
        </div>

        <div className="relative flex min-h-[430px] items-center self-stretch overflow-hidden px-5 py-8 sm:min-h-[500px] sm:px-8 lg:min-h-[590px] lg:overflow-visible lg:pl-0 lg:pr-12 xl:pr-16">
          <div
            className={`pointer-events-none absolute inset-[10%] rounded-[28px] backdrop-blur-[2px] ${
              isLight
                ? 'border border-[#00a9a5]/12 bg-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_42px_100px_rgba(6,43,53,0.08)]'
                : 'border border-[#78e4df]/[0.08] bg-[#0c2731]/35 shadow-[inset_0_1px_0_rgba(164,255,244,0.05),0_42px_100px_rgba(0,0,0,0.22)]'
            }`}
          />
          <div
            className={`pointer-events-none absolute left-[50%] top-[48%] h-[48%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full blur-[82px] ${
              isLight ? 'bg-[#00a9a5]/10' : 'bg-[#20d9bd]/10'
            }`}
          />
          <WorkspaceOverviewPreview className="relative z-10 w-full" />
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
