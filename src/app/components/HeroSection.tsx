'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Boxes, LifeBuoy, LockKeyhole, ShieldCheck } from 'lucide-react';
import { WorkspaceOverviewPreview } from '@/components/catalog/ProductProofPreview';
import { useTheme } from '@/contexts/ThemeContext';

export default function HeroSection() {
  const { theme } = useTheme();

  useEffect(() => {
    const darkClass = 'summeca-home-theme';
    const lightClass = 'summeca-home-light-theme';

    document.body.classList.toggle(darkClass, theme === 'dark');
    document.body.classList.toggle(lightClass, theme === 'light');

    return () => {
      document.body.classList.remove(darkClass, lightClass);
    };
  }, [theme]);

  return (
    <section className="summeca-home-hero relative isolate min-h-[620px] overflow-hidden bg-[#06151c] pt-[70px] text-white lg:min-h-[660px]">
      <div className="summeca-hero-grid pointer-events-none absolute inset-0" />
      <div className="summeca-hero-noise pointer-events-none absolute inset-0" />
      <div className="summeca-hero-orb summeca-hero-orb-a pointer-events-none absolute" />
      <div className="summeca-hero-orb summeca-hero-orb-b pointer-events-none absolute" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#06151c] via-[#06151c]/88 to-transparent" />

      <div className="relative z-10 mx-auto grid min-h-[550px] max-w-[1440px] grid-cols-1 items-center lg:min-h-[590px] lg:grid-cols-[46%_54%]">
        <div className="relative px-6 pb-8 pt-10 sm:px-10 sm:pt-12 lg:px-12 lg:pb-14 lg:pt-14 xl:px-16">
          <div className="summeca-reveal summeca-reveal-1 mb-5 inline-flex items-center gap-3 rounded-full border border-[#58ead8]/15 bg-[#58ead8]/[0.055] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#ccebed] backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-[#20d9bd] shadow-[0_0_18px_rgba(32,217,189,0.9)]" />
            AI <span className="text-[#4bcdf6]">•</span> SaaS <span className="text-[#4bcdf6]">•</span> Digital Products
          </div>

          <h1 className="summeca-reveal summeca-reveal-2 max-w-[700px] uppercase font-black leading-[0.86] tracking-[-0.06em]">
            <span className="summeca-outline-text block text-[clamp(3.1rem,5vw,5.8rem)]">DIGITAL</span>
            <span className="summeca-outline-text mt-1 block text-[clamp(2.55rem,4.15vw,4.75rem)]">TOOLS &amp; SAAS</span>
            <span className="summeca-outline-text mt-2 block text-[clamp(2.05rem,3.3vw,3.8rem)]">BUILT FOR FASTER</span>
            <span className="summeca-outline-text mt-2 block pb-2 text-[clamp(2.55rem,4.05vw,4.65rem)]">BUSINESS<span className="text-[#20d9bd]">.</span></span>
          </h1>

          <p className="summeca-reveal summeca-reveal-3 mt-5 max-w-lg text-sm leading-6 text-[#9abec8] sm:text-base sm:leading-7">
            Practical SaaS apps, AI tools, and ready-to-use digital products designed to help modern businesses move faster through everyday workflows.
          </p>

          <div className="summeca-reveal summeca-reveal-4 mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/products"
              className="group inline-flex min-h-11 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#109f8d] via-[#20d9bd] to-[#4bcdf6] px-6 py-3 text-sm font-bold text-[#03231f] shadow-[0_14px_42px_rgba(32,217,189,0.22)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_52px_rgba(75,205,246,0.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4bcdf6] motion-reduce:transform-none motion-reduce:transition-none"
            >
              Explore Products
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" />
            </Link>
            <Link
              href="/saas"
              className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#65dfe0]/15 bg-[#65dfe0]/[0.055] px-6 py-3 text-sm font-bold text-[#e6faf9] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[#4bcdf6]/45 hover:bg-[#4bcdf6]/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4bcdf6] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <Boxes size={15} className="text-[#4bcdf6]" /> View SaaS Apps
            </Link>
          </div>

          <div className="summeca-reveal summeca-reveal-4 mt-6 flex max-w-xl flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#74d8d8]/10 pt-4 text-[11px] font-semibold text-[#91b5bf]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#20d9bd]" /> Provider-confirmed payments
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole size={14} className="text-[#20d9bd]" /> Protected digital delivery
            </span>
            <Link
              href="/support"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <LifeBuoy size={14} className="text-[#4bcdf6]" /> Customer support
            </Link>
            <Link href="/refunds" className="transition-colors hover:text-white hover:underline">
              Refund policy
            </Link>
          </div>
        </div>

        <div className="relative flex min-h-[430px] items-center self-stretch overflow-hidden px-5 py-8 sm:min-h-[500px] sm:px-8 lg:min-h-[590px] lg:overflow-visible lg:pl-0 lg:pr-12 xl:pr-16">
          <div className="pointer-events-none absolute inset-[10%] rounded-[28px] border border-[#78e4df]/[0.08] bg-[#0c2731]/35 shadow-[inset_0_1px_0_rgba(164,255,244,0.05),0_42px_100px_rgba(0,0,0,0.22)] backdrop-blur-[2px]" />
          <div className="pointer-events-none absolute left-[50%] top-[48%] h-[48%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#20d9bd]/10 blur-[82px]" />
          <WorkspaceOverviewPreview className="relative z-10 w-full" />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#06151c] to-transparent" />
    </section>
  );
}
