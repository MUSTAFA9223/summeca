'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useRef } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Boxes,
  Cloud,
  Headphones,
  ShieldCheck,
  Workflow,
  Zap,
} from 'lucide-react';

const SummecaAiCore = dynamic(() => import('@/components/ui/SummecaAiCore'), {
  ssr: false,
  loading: () => null,
});

const categoryCards = [
  { label: 'AI Tools', icon: Bot, className: 'left-[2%] top-[18%] sm:left-[5%]' },
  { label: 'Cloud', icon: Cloud, className: 'right-[2%] top-[24%] sm:right-[4%]' },
  { label: 'Analytics', icon: BarChart3, className: 'left-[1%] bottom-[24%] sm:left-[4%]' },
  { label: 'Automation', icon: Workflow, className: 'right-[1%] bottom-[19%] sm:right-[3%]' },
];

const heroMotionStyle = {
  '--hero-x': '0px',
  '--hero-y': '0px',
  '--hero-rx': '0deg',
  '--hero-ry': '0deg',
} as CSSProperties;

const servicePoints = [
  { icon: Zap, title: 'Instant Access', text: 'Get started in minutes' },
  { icon: ShieldCheck, title: 'Secure Payments', text: 'Payoneer or Crypto' },
  { icon: Headphones, title: 'Customer Support', text: 'Help when you need it' },
];

export default function HeroSection() {
  const visualRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const visual = visualRef.current;
    if (
      !visual ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.matchMedia('(pointer: coarse)').matches
    )
      return;

    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);

    const { clientX, clientY } = event;
    animationFrameRef.current = requestAnimationFrame(() => {
      const bounds = visual.getBoundingClientRect();
      const x = ((clientX - bounds.left) / bounds.width - 0.5) * 12;
      const y = ((clientY - bounds.top) / bounds.height - 0.5) * 10;
      visual.style.setProperty('--hero-x', `${x}px`);
      visual.style.setProperty('--hero-y', `${y}px`);
      visual.style.setProperty('--hero-rx', `${y * -0.28}deg`);
      visual.style.setProperty('--hero-ry', `${x * 0.32}deg`);
      animationFrameRef.current = null;
    });
  };

  const resetPointer = () => {
    const visual = visualRef.current;
    if (!visual) return;
    visual.style.setProperty('--hero-x', '0px');
    visual.style.setProperty('--hero-y', '0px');
    visual.style.setProperty('--hero-rx', '0deg');
    visual.style.setProperty('--hero-ry', '0deg');
  };

  return (
    <section className="relative isolate min-h-[760px] overflow-hidden bg-[#f7f9fa] pt-[68px] lg:min-h-screen">
      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(108deg,#ffffff_0%,#f7f9fa_53%,#dce8ea_100%)] lg:block" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[49%] bg-[radial-gradient(circle_at_20%_43%,#25474e_0%,#183139_42%,#10232a_100%)] [clip-path:polygon(30%_0,100%_0,100%_100%,0_100%)] lg:block" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-white via-white/90 to-transparent" />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_center,rgba(8,197,209,0.18)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_right,black,transparent_48%)]" />

      <div className="relative z-10 mx-auto grid min-h-[692px] max-w-[1440px] grid-cols-1 items-center lg:grid-cols-[45%_55%]">
        <div className="px-6 pb-10 pt-14 sm:px-10 lg:px-12 lg:pb-20 lg:pt-20 xl:px-20">
          <div className="mb-7 flex items-center gap-3 text-[11px] font-bold tracking-[0.24em] text-[#667783] sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-[#08c5d1] shadow-[0_0_16px_rgba(8,197,209,0.75)]" />
            AI <span className="text-[#08c5d1]">•</span> SAAS{' '}
            <span className="text-[#08c5d1]">•</span> DIGITAL TOOLS
          </div>

          <h1 className="max-w-[720px] text-[clamp(3.1rem,5vw,5.8rem)] font-extrabold uppercase leading-[0.91] tracking-[-0.065em] text-[#101820]">
            <span className="block sm:whitespace-nowrap">The Platform</span>
            <span className="block sm:whitespace-nowrap">For Smarter</span>
            <span className="block bg-gradient-to-r from-[#08c5d1] to-[#0aaebd] bg-clip-text pb-2 text-transparent sm:whitespace-nowrap">
              Digital Work
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-7 text-[#667783] sm:text-lg sm:leading-8">
            Discover AI tools, SaaS products and digital solutions built to help you work smarter
            and grow faster.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/products"
              className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#101820] px-7 py-3.5 text-sm font-bold text-white shadow-[0_16px_40px_rgba(16,24,32,0.2)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#08aeba] hover:shadow-[0_18px_45px_rgba(8,197,209,0.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#08c5d1]"
            >
              Explore Products
              <ArrowRight
                size={17}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
            <Link
              href="/ai"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#cad5d8] bg-white/75 px-7 py-3.5 text-sm font-bold text-[#152129] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-[#08c5d1] hover:text-[#0799a5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#08c5d1]"
            >
              <Boxes size={16} />
              Browse AI Tools
            </Link>
          </div>

          <div className="mt-11 grid max-w-[650px] grid-cols-1 gap-4 border-t border-[#dfe7e9] pt-7 sm:grid-cols-3">
            {servicePoints.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8fbfc] text-[#08aebb]">
                  <Icon size={17} />
                </span>
                <span>
                  <span className="block text-xs font-bold text-[#152129]">{title}</span>
                  <span className="mt-1 block text-[11px] leading-4 text-[#71818b]">{text}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[520px] self-stretch overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#23434a_0%,#152b31_48%,#10232a_100%)] lg:min-h-[692px] lg:bg-transparent">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_48%_45%,rgba(8,197,209,0.21),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]" />
          <div
            ref={visualRef}
            onPointerMove={handlePointerMove}
            onPointerLeave={resetPointer}
            className="relative h-full min-h-[520px] w-full touch-pan-y lg:min-h-[692px]"
            style={heroMotionStyle}
            aria-hidden="true"
          >
            <div className="absolute inset-[4%] rounded-[50%] border border-[#8eeef3]/10 blur-[0.2px]" />
            <div className="absolute inset-0 z-10">
              <SummecaAiCore />
            </div>
            <div className="pointer-events-none absolute left-1/2 top-[48%] z-0 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#08c5d1]/25 blur-[70px]" />

            {categoryCards.map(({ label, icon: Icon, className }, index) => (
              <div
                key={label}
                className={`group absolute z-20 ${className} hidden items-center gap-2.5 rounded-2xl border border-white/65 bg-white/80 px-3.5 py-3 text-[#17262d] shadow-[0_18px_55px_rgba(0,0,0,0.2)] backdrop-blur-xl transition-[transform,border-color,background-color,box-shadow] duration-500 hover:border-[#66edf4] hover:bg-white/95 hover:shadow-[0_18px_55px_rgba(8,197,209,0.22)] sm:flex`}
                style={{
                  transform: `translate3d(calc(var(--hero-x) * ${index % 2 === 0 ? -0.55 : 0.7}), calc(var(--hero-y) * ${index < 2 ? -0.5 : 0.62}), 0)`,
                }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#6bdde4]/35 bg-[#dcf8fa] text-[#078e99] shadow-[inset_0_0_20px_rgba(8,197,209,0.08)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-3">
                  <Icon size={17} />
                </span>
                <span className="text-xs font-semibold tracking-wide">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
