'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Boxes, LifeBuoy, LockKeyhole, ShieldCheck } from 'lucide-react';
import SplineNexbotScene from '@/components/ui/SplineNexbotScene';
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
    <section className="summeca-home-hero relative isolate min-h-[620px] overflow-hidden bg-[#0d1116] pt-[70px] text-white lg:min-h-[660px]">
      <div className="summeca-hero-grid pointer-events-none absolute inset-0" />
      <div className="summeca-hero-noise pointer-events-none absolute inset-0" />
      <div className="summeca-hero-orb summeca-hero-orb-a pointer-events-none absolute" />
      <div className="summeca-hero-orb summeca-hero-orb-b pointer-events-none absolute" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0d1116] via-[#0d1116]/85 to-transparent" />

      <div className="relative z-10 mx-auto grid min-h-[550px] max-w-[1440px] grid-cols-1 items-center lg:min-h-[590px] lg:grid-cols-[46%_54%]">
        <div className="relative px-6 pb-8 pt-10 sm:px-10 sm:pt-12 lg:px-12 lg:pb-14 lg:pt-14 xl:px-16">
          <div className="summeca-reveal summeca-reveal-1 mb-5 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-300 backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-[#22d3ee] shadow-[0_0_18px_rgba(34,211,238,0.9)]" />
            AI <span className="text-[#22d3ee]">•</span> SaaS <span className="text-[#22d3ee]">•</span> Digital Products
          </div>

          <h1 className="summeca-reveal summeca-reveal-2 max-w-[700px] uppercase font-black leading-[0.86] tracking-[-0.06em]">
            <span className="summeca-outline-text block text-[clamp(3.1rem,5vw,5.8rem)]">DIGITAL</span>
            <span className="summeca-outline-text mt-1 block text-[clamp(2.55rem,4.15vw,4.75rem)]">TOOLS &amp; SAAS</span>
            <span className="summeca-outline-text mt-2 block text-[clamp(2.05rem,3.3vw,3.8rem)]">BUILT FOR FASTER</span>
            <span className="summeca-outline-text mt-2 block pb-2 text-[clamp(2.55rem,4.05vw,4.65rem)]">BUSINESS<span className="text-[#22d3ee]">.</span></span>
          </h1>

          <p className="summeca-reveal summeca-reveal-3 mt-5 max-w-lg text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
            Practical SaaS apps, AI tools, and ready-to-use digital products designed to help modern businesses move faster through everyday workflows.
          </p>

          <div className="summeca-reveal summeca-reveal-4 mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/products"
              className="group inline-flex min-h-11 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#0d9488] via-[#08aeba] to-[#22d3ee] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_42px_rgba(8,197,209,0.2)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_52px_rgba(8,197,209,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#22d3ee] motion-reduce:transform-none motion-reduce:transition-none"
            >
              Explore Products
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" />
            </Link>
            <Link
              href="/saas"
              className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.055] px-6 py-3 text-sm font-bold text-slate-100 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:border-[#22d3ee]/45 hover:bg-[#22d3ee]/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#22d3ee] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <Boxes size={15} className="text-[#22d3ee]" /> View SaaS Apps
            </Link>
          </div>

          <div className="summeca-reveal summeca-reveal-4 mt-6 flex max-w-xl flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/8 pt-4 text-[11px] font-semibold text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#22d3ee]" /> Provider-confirmed payments
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole size={14} className="text-[#22d3ee]" /> Protected digital delivery
            </span>
            <Link
              href="/support"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
            >
              <LifeBuoy size={14} className="text-[#22d3ee]" /> Customer support
            </Link>
            <Link href="/refunds" className="transition-colors hover:text-white hover:underline">
              Refund policy
            </Link>
          </div>
        </div>

        <div className="relative min-h-[430px] self-stretch overflow-hidden sm:min-h-[500px] lg:min-h-[590px] lg:overflow-visible">
          <div className="pointer-events-none absolute inset-[7%] rounded-[38px] border border-white/[0.05] bg-white/[0.015] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_42px_100px_rgba(0,0,0,0.2)] backdrop-blur-[2px] lg:inset-[7%_4%_6%_0%]" />
          <div className="pointer-events-none absolute left-[50%] top-[48%] h-[48%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#08c5d1]/12 blur-[82px]" />
          <div className="absolute inset-0 z-10 min-h-[430px] touch-pan-y sm:min-h-[500px] lg:min-h-[590px]">
            <SplineNexbotScene className="h-full w-full" pointerScopeSelector=".summeca-home-hero" />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0d1116] to-transparent" />
    </section>
  );
}
