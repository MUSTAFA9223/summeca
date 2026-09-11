'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, Boxes, Sparkles } from 'lucide-react';

const SplineRobotScene = dynamic(() => import('@/components/ui/SplineRobotScene'), {
  ssr: false,
  loading: () => null,
});

export default function HeroSection() {
  useEffect(() => {
    document.body.classList.add('summeca-home-theme');
    return () => document.body.classList.remove('summeca-home-theme');
  }, []);

  return (
    <section className="summeca-home-hero relative isolate min-h-[780px] overflow-hidden bg-[#0d1116] pt-[76px] text-white lg:min-h-screen">
      <div className="summeca-hero-grid pointer-events-none absolute inset-0" />
      <div className="summeca-hero-noise pointer-events-none absolute inset-0" />
      <div className="summeca-hero-orb summeca-hero-orb-a pointer-events-none absolute" />
      <div className="summeca-hero-orb summeca-hero-orb-b pointer-events-none absolute" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0d1116] via-[#0d1116]/85 to-transparent" />
      <div className="summeca-hero-word pointer-events-none absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap text-[clamp(7rem,19vw,22rem)] font-black uppercase leading-none tracking-[-0.08em] text-white/[0.018]">
        SUMMECA
      </div>

      <div className="relative z-10 mx-auto grid min-h-[704px] max-w-[1480px] grid-cols-1 items-center lg:grid-cols-[46%_54%]">
        <div className="relative px-6 pb-14 pt-16 sm:px-10 lg:px-12 lg:pb-24 lg:pt-24 xl:px-20">
          <div className="summeca-reveal summeca-reveal-1 mb-7 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-300 backdrop-blur-xl sm:text-[11px]">
            <span className="h-2 w-2 rounded-full bg-[#22d3ee] shadow-[0_0_18px_rgba(34,211,238,0.9)]" />
            AI <span className="text-[#22d3ee]">•</span> SaaS <span className="text-[#22d3ee]">•</span> Digital Products
          </div>

          <h1 className="summeca-reveal summeca-reveal-2 max-w-[760px] uppercase font-black leading-[0.84] tracking-[-0.065em]">
            <span className="block text-[clamp(3.55rem,5.8vw,6.75rem)] text-white">DIGITAL</span>
            <span className="mt-1 block text-[clamp(3.25rem,5.2vw,6.05rem)] text-white">TOOLS BUILT</span>
            <span className="mt-2 block text-[clamp(2.7rem,4.25vw,4.95rem)] text-slate-200">FOR FASTER</span>
            <span className="summeca-outline-text mt-2 block pb-3 text-[clamp(2.85rem,4.55vw,5.3rem)]">BUSINESS<span className="text-[#22d3ee]">.</span></span>
          </h1>

          <p className="summeca-reveal summeca-reveal-3 mt-7 max-w-xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
            Practical SaaS apps, AI tools, and ready-to-use digital products designed to help modern businesses move faster through everyday workflows.
          </p>

          <div className="summeca-reveal summeca-reveal-4 mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/products"
              className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-[#0d9488] via-[#08aeba] to-[#22d3ee] px-7 py-3.5 text-sm font-bold text-white shadow-[0_16px_50px_rgba(8,197,209,0.2)] transition duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_22px_65px_rgba(8,197,209,0.32)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#22d3ee] motion-reduce:transform-none motion-reduce:transition-none"
            >
              Explore Products
              <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" />
            </Link>
            <Link
              href="/saas"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.055] px-7 py-3.5 text-sm font-bold text-slate-100 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#22d3ee]/45 hover:bg-[#22d3ee]/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#22d3ee] motion-reduce:transform-none motion-reduce:transition-none"
            >
              <Boxes size={16} className="text-[#22d3ee]" /> View SaaS Apps
            </Link>
          </div>

          <div className="summeca-reveal summeca-reveal-5 mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:text-[11px]">
            <span className="inline-flex items-center gap-2"><Sparkles size={13} className="text-[#22d3ee]" /> SaaS apps</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>AI tools</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>Digital kits</span>
          </div>
        </div>

        <div className="relative min-h-[570px] self-stretch overflow-hidden sm:min-h-[630px] lg:min-h-[704px] lg:overflow-visible">
          <div className="pointer-events-none absolute inset-[6%] rounded-[44px] border border-white/[0.065] bg-white/[0.025] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_50px_120px_rgba(0,0,0,0.24)] backdrop-blur-[2px] lg:inset-[7%_5%_5%_1%]" />
          <div className="summeca-robot-ring summeca-robot-ring-a pointer-events-none absolute left-[48%] top-[48%] h-[68%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#22d3ee]/10" />
          <div className="summeca-robot-ring summeca-robot-ring-b pointer-events-none absolute left-[48%] top-[48%] h-[52%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]" />
          <div className="pointer-events-none absolute left-[48%] top-[50%] h-[46%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#08c5d1]/15 blur-[80px]" />

          <div className="relative h-full min-h-[570px] w-full touch-pan-y sm:min-h-[630px] lg:min-h-[704px]" aria-hidden="true">
            <div className="absolute inset-0 z-10 origin-center transform-gpu lg:bottom-[-8%] lg:left-[-8%] lg:right-[-8%] lg:top-[-6%] lg:scale-[0.78] xl:scale-[0.74]">
              <SplineRobotScene />
            </div>
          </div>

          <div className="summeca-float-chip pointer-events-none absolute bottom-[11%] left-[8%] hidden rounded-2xl border border-white/10 bg-[#111820]/75 px-4 py-3 shadow-2xl backdrop-blur-xl sm:block lg:left-[2%]">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Interactive 3D</p>
            <p className="mt-1 text-xs font-semibold text-slate-200">Move your pointer</p>
          </div>
          <div className="summeca-float-chip summeca-float-chip-delayed pointer-events-none absolute right-[7%] top-[18%] hidden rounded-full border border-[#22d3ee]/20 bg-[#0d1116]/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#67e8f9] shadow-[0_0_30px_rgba(34,211,238,0.08)] backdrop-blur-xl sm:block lg:right-[4%]">
            Built for modern work
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0d1116] to-transparent" />
    </section>
  );
}
