'use client';

import { type PointerEvent as ReactPointerEvent } from 'react';
import {
  ArrowRight,
  Bot,
  FileText,
  Layers3,
  MessageSquareText,
  ReceiptText,
  Sparkles,
} from 'lucide-react';

const FLOW = [
  { label: 'SiteAgent AI', meta: 'Visitor capture', icon: Bot, depth: 76, x: -160, y: -108 },
  { label: 'LeadFollow AI', meta: 'Lead follow-up', icon: MessageSquareText, depth: 54, x: 160, y: -92 },
  { label: 'ProposalFlow AI', meta: 'Client proposal', icon: FileText, depth: 42, x: -150, y: 98 },
  { label: 'InvoiceFlow', meta: 'Invoice & billing', icon: ReceiptText, depth: 66, x: 155, y: 102 },
];

export default function SummecaHero3DScene() {
  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));

    event.currentTarget.style.setProperty('--summeca-hero-rx', `${((0.5 - y) * 7).toFixed(2)}deg`);
    event.currentTarget.style.setProperty('--summeca-hero-ry', `${((x - 0.5) * 9).toFixed(2)}deg`);
    event.currentTarget.style.setProperty('--summeca-hero-gx', `${(x * 100).toFixed(1)}%`);
    event.currentTarget.style.setProperty('--summeca-hero-gy', `${(y * 100).toFixed(1)}%`);
  };

  const reset = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty('--summeca-hero-rx', '0deg');
    event.currentTarget.style.setProperty('--summeca-hero-ry', '0deg');
    event.currentTarget.style.setProperty('--summeca-hero-gx', '50%');
    event.currentTarget.style.setProperty('--summeca-hero-gy', '38%');
  };

  return (
    <div
      className="summeca-ecosystem-3d relative mx-auto h-[420px] w-full max-w-[760px] sm:h-[470px] lg:h-[520px]"
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
      style={{
        ['--summeca-hero-rx' as string]: '0deg',
        ['--summeca-hero-ry' as string]: '0deg',
        ['--summeca-hero-gx' as string]: '50%',
        ['--summeca-hero-gy' as string]: '38%',
      }}
      aria-label="SUMMECA AI and SaaS workflow in 3D"
    >
      <style>{`
        .summeca-ecosystem-3d {
          perspective: 1450px;
          transform-style: preserve-3d;
          isolation: isolate;
        }

        .summeca-ecosystem-3d .summeca-ecosystem-stage {
          transform:
            rotateX(var(--summeca-hero-rx))
            rotateY(var(--summeca-hero-ry));
          transform-style: preserve-3d;
          transition: transform 180ms ease-out;
          will-change: transform;
        }

        .summeca-ecosystem-3d .summeca-ecosystem-card,
        .summeca-ecosystem-3d .summeca-ecosystem-back,
        .summeca-ecosystem-3d .summeca-ecosystem-core {
          transform-style: preserve-3d;
          backface-visibility: hidden;
          transition: transform 280ms cubic-bezier(.2,.8,.2,1), box-shadow 280ms ease, opacity 280ms ease;
        }

        .summeca-ecosystem-3d .summeca-ecosystem-back-one {
          transform: translate3d(42px,-18px,-76px) rotateY(-7deg) rotateZ(.7deg);
        }

        .summeca-ecosystem-3d .summeca-ecosystem-back-two {
          transform: translate3d(70px,-32px,-128px) rotateY(-11deg) rotateZ(1.2deg);
        }

        .summeca-ecosystem-3d .summeca-ecosystem-core {
          transform: translateZ(18px) rotateX(1.5deg) rotateY(-5deg);
        }

        .summeca-ecosystem-3d:hover .summeca-ecosystem-core {
          transform: translate3d(-4px,-8px,32px) rotateX(1deg) rotateY(-3deg) scale(1.01);
        }

        .summeca-ecosystem-3d:hover .summeca-ecosystem-back-one {
          transform: translate3d(50px,-22px,-64px) rotateY(-6deg) rotateZ(.8deg);
        }

        .summeca-ecosystem-3d:hover .summeca-ecosystem-back-two {
          transform: translate3d(82px,-38px,-112px) rotateY(-9deg) rotateZ(1.4deg);
        }

        .summeca-ecosystem-3d .summeca-ecosystem-glare {
          background: radial-gradient(
            circle at var(--summeca-hero-gx) var(--summeca-hero-gy),
            rgba(103,232,249,.18),
            rgba(45,212,191,.07) 24%,
            transparent 50%
          );
          transition: background 120ms linear;
        }

        .summeca-ecosystem-3d .summeca-flow-card {
          transform:
            translate(-50%, -50%)
            translate3d(var(--flow-x), var(--flow-y), var(--flow-z));
          transition: transform 300ms cubic-bezier(.2,.8,.2,1), box-shadow 300ms ease;
          transform-style: preserve-3d;
        }

        .summeca-ecosystem-3d:hover .summeca-flow-card {
          box-shadow: 0 18px 36px rgba(2,8,23,.22), 0 0 0 1px rgba(103,232,249,.08);
        }

        @media (max-width: 639px) {
          .summeca-ecosystem-3d {
            perspective: 1050px;
          }

          .summeca-ecosystem-3d .summeca-ecosystem-back-one {
            transform: translate3d(20px,-10px,-42px) rotateY(-4deg) rotateZ(.4deg);
          }

          .summeca-ecosystem-3d .summeca-ecosystem-back-two {
            transform: translate3d(34px,-18px,-70px) rotateY(-6deg) rotateZ(.7deg);
          }

          .summeca-ecosystem-3d .summeca-ecosystem-core {
            transform: translateZ(10px) rotateX(.8deg) rotateY(-2.5deg);
          }

          .summeca-ecosystem-3d:hover .summeca-ecosystem-core {
            transform: translate3d(0,-3px,12px) rotateX(.5deg) rotateY(-2deg);
          }

          .summeca-ecosystem-3d .summeca-flow-card {
            transform:
              translate(-50%, -50%)
              translate3d(var(--flow-x-mobile), var(--flow-y-mobile), var(--flow-z-mobile));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .summeca-ecosystem-3d .summeca-ecosystem-stage,
          .summeca-ecosystem-3d .summeca-ecosystem-card,
          .summeca-ecosystem-3d .summeca-ecosystem-back,
          .summeca-ecosystem-3d .summeca-ecosystem-core,
          .summeca-ecosystem-3d .summeca-flow-card {
            transition: none !important;
          }

          .summeca-ecosystem-3d .summeca-ecosystem-stage {
            transform: none !important;
          }
        }
      `}</style>

      <div
        aria-hidden="true"
        className="absolute inset-x-[13%] bottom-[3%] h-20 rounded-[50%] bg-cyan-300/20 blur-3xl"
      />

      <div className="summeca-ecosystem-stage absolute inset-[7%_3%_5%_2%]">
        <div
          aria-hidden="true"
          className="summeca-ecosystem-back summeca-ecosystem-back-two absolute inset-[8%_1%_4%_13%] rounded-[30px] border border-cyan-300/18 bg-[linear-gradient(145deg,rgba(6,25,31,.96),rgba(9,38,43,.9)_58%,rgba(7,15,22,.96))] shadow-[0_34px_80px_rgba(0,0,0,.22),0_0_50px_rgba(34,211,238,.10)]"
        >
          <div className="absolute bottom-7 right-7 text-right">
            <Layers3 size={24} className="ml-auto text-cyan-300/70" />
            <p className="mt-2 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/60">SUMMECA</p>
            <p className="mt-1 text-[7px] uppercase tracking-[0.17em] text-slate-500">Business workflow</p>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="summeca-ecosystem-back summeca-ecosystem-back-one absolute inset-[5%_4%_3%_8%] rounded-[28px] border border-cyan-200/20 bg-[linear-gradient(145deg,rgba(10,25,34,.98),rgba(8,19,27,.96))] shadow-[0_28px_65px_rgba(0,0,0,.25),0_0_36px_rgba(34,211,238,.08)]"
        >
          <div className="absolute inset-x-7 top-6 h-px bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent" />
          <div className="absolute right-7 top-7 h-2 w-20 rounded-full bg-cyan-300/10" />
        </div>

        <div className="summeca-ecosystem-core absolute inset-[3%_7%_4%_1%] overflow-hidden rounded-[28px] border border-cyan-200/25 bg-[#0b131b] shadow-[0_34px_82px_rgba(0,0,0,.34),0_0_0_1px_rgba(103,232,249,.05)]">
          <div className="summeca-ecosystem-glare pointer-events-none absolute inset-0 z-30" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,.05),transparent_24%,transparent_70%,rgba(34,211,238,.04))]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/55 to-transparent" />

          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                  <Sparkles size={15} />
                </div>
                <div>
                  <p className="text-[11px] font-black tracking-tight text-white sm:text-xs">SUMMECA Business OS</p>
                  <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:text-[8px]">AI + SaaS workflow</p>
                </div>
              </div>
              <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.14em] text-emerald-200 sm:text-[8px]">
                Live system
              </span>
            </div>

            <div className="relative flex-1 p-3 sm:p-4">
              <div className="absolute left-1/2 top-1/2 h-[70%] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-300/18 to-transparent" />
              <div className="absolute left-[12%] right-[12%] top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-300/18 to-transparent" />

              <div className="absolute left-1/2 top-1/2 z-20 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[26px] border border-cyan-200/25 bg-[radial-gradient(circle_at_35%_25%,rgba(103,232,249,.14),transparent_32%),#0d1821] shadow-[0_18px_50px_rgba(0,0,0,.35),0_0_34px_rgba(34,211,238,.10)] sm:h-28 sm:w-28">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                  <Layers3 size={22} />
                </div>
                <p className="mt-2 text-[10px] font-black text-white">SUMMECA</p>
                <p className="mt-0.5 text-[6px] font-bold uppercase tracking-[0.18em] text-cyan-200/65">workflow core</p>
              </div>

              {FLOW.map(({ label, meta, icon: Icon, depth, x, y }, index) => {
                const mobileX = Math.round(x * 0.58);
                const mobileY = Math.round(y * 0.72);
                return (
                  <div
                    key={label}
                    className="summeca-flow-card absolute left-1/2 top-1/2 z-10 w-[126px] rounded-2xl border border-white/[0.09] bg-[#111c25]/95 p-3 shadow-[0_15px_34px_rgba(0,0,0,.26)] sm:w-[155px] sm:p-3.5"
                    style={{
                      ['--flow-x' as string]: `${x}px`,
                      ['--flow-y' as string]: `${y}px`,
                      ['--flow-z' as string]: `${depth}px`,
                      ['--flow-x-mobile' as string]: `${mobileX}px`,
                      ['--flow-y-mobile' as string]: `${mobileY}px`,
                      ['--flow-z-mobile' as string]: `${Math.round(depth * 0.55)}px`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200">
                        <Icon size={14} />
                      </span>
                      <span className="text-[7px] font-black text-cyan-300/55">0{index + 1}</span>
                    </div>
                    <p className="mt-2 truncate text-[9px] font-black text-white sm:text-[10px]">{label}</p>
                    <p className="mt-1 truncate text-[7px] font-semibold text-slate-500 sm:text-[8px]">{meta}</p>
                  </div>
                );
              })}

              <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-center gap-2 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.035] px-3 py-2 text-[7px] font-bold uppercase tracking-[0.13em] text-cyan-100/60 sm:bottom-4 sm:left-4 sm:right-4 sm:text-[8px]">
                Visitor <ArrowRight size={9} /> Lead <ArrowRight size={9} /> Proposal <ArrowRight size={9} /> Invoice
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
