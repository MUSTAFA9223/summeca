'use client';

import { useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { Box, Layers3, Sparkles } from 'lucide-react';

type Product3DShowcaseProps = {
  name: string;
  thumbnailUrl?: string | null;
  category?: string;
  eyebrow?: string;
  variant?: 'card' | 'hero';
  className?: string;
  badge?: string;
  children?: ReactNode;
};

function categoryLabel(category?: string) {
  if (!category) return 'Digital Product';
  return category.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Product3DShowcase({
  name,
  thumbnailUrl,
  category,
  eyebrow,
  variant = 'hero',
  className = '',
  badge = 'Interactive 3D',
  children,
}: Product3DShowcaseProps) {
  const [tilt, setTilt] = useState({ x: variant === 'hero' ? -2.5 : -1.5, y: variant === 'hero' ? -5 : -3 });
  const [pointer, setPointer] = useState({ x: 50, y: 42 });
  const [active, setActive] = useState(false);
  const hero = variant === 'hero';

  function handleMove(event: ReactMouseEvent<HTMLDivElement>) {
    if (typeof window !== 'undefined') {
      if (
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        window.matchMedia('(hover: none)').matches
      ) {
        return;
      }
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    const xStrength = hero ? 13 : 9;
    const yStrength = hero ? 18 : 12;
    setTilt({ x: (0.5 - py) * xStrength, y: (px - 0.5) * yStrength });
    setPointer({ x: px * 100, y: py * 100 });
    setActive(true);
  }

  function reset() {
    setTilt({ x: hero ? -2.5 : -1.5, y: hero ? -5 : -3 });
    setPointer({ x: 50, y: 42 });
    setActive(false);
  }

  const depth = hero ? 118 : 82;

  return (
    <div
      className={`relative isolate ${hero ? 'min-h-[430px] sm:min-h-[520px]' : 'h-[245px]'} ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onBlur={reset}
      data-product-3d="true"
      style={{ perspective: hero ? '1800px' : '1300px' }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[8%] rounded-full bg-cyan-400/20 blur-[70px] transition-opacity duration-300"
        style={{ opacity: active ? 0.9 : 0.55 }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[36px]"
        style={{
          background: `radial-gradient(circle at ${pointer.x}% ${pointer.y}%, rgba(34,211,238,.20), transparent 27%), radial-gradient(circle at 78% 18%, rgba(20,184,166,.12), transparent 28%)`,
        }}
      />

      <div
        className="absolute inset-[7%_5%_8%] transition-transform duration-200 ease-out"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${active ? 'translateZ(18px) scale(1.018)' : 'translateZ(0) scale(1)'}`,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-[8%_4%_2%_9%] rounded-[30px] border border-cyan-300/10 bg-[#07151a]/80 shadow-[0_34px_90px_rgba(0,0,0,.55)]"
          style={{ transform: `translateZ(-${hero ? 105 : 72}px) rotateZ(-4deg)` }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-[5%_7%_5%_5%] rounded-[30px] border border-cyan-300/15 bg-[#0a1b20]/90"
          style={{ transform: `translateZ(-${hero ? 64 : 44}px) rotateZ(2.2deg)` }}
        />

        <div
          className="absolute inset-[3%] overflow-visible rounded-[30px] border border-cyan-200/25 bg-[#0b1117]/95 shadow-[0_40px_110px_rgba(0,0,0,.58),0_0_55px_rgba(34,211,238,.10)]"
          style={{ transform: `translateZ(${hero ? 18 : 12}px)`, transformStyle: 'preserve-3d' }}
        >
          <div
            aria-hidden="true"
            className="absolute -right-[14px] bottom-6 top-6 w-[15px] origin-left rounded-r-lg border-y border-r border-cyan-200/15 bg-gradient-to-r from-[#10252b] to-[#061014]"
            style={{ transform: 'rotateY(90deg)' }}
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-[14px] left-6 right-6 h-[15px] origin-top rounded-b-lg border-x border-b border-cyan-200/10 bg-gradient-to-b from-[#0d1b20] to-[#050b0e]"
            style={{ transform: 'rotateX(-90deg)' }}
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 overflow-hidden rounded-[30px]"
            style={{
              background: `radial-gradient(circle at ${pointer.x}% ${pointer.y}%, rgba(34,211,238,.20), transparent 29%), linear-gradient(135deg, rgba(255,255,255,.06), transparent 32%, rgba(34,211,238,.04) 72%, transparent)`,
            }}
          >
            <div
              className="absolute inset-0 opacity-[0.16]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(34,211,238,.24) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.24) 1px, transparent 1px)',
                backgroundSize: hero ? '38px 38px' : '28px 28px',
              }}
            />
          </div>

          <div
            aria-hidden="true"
            className="absolute bottom-[-10%] left-[8%] right-[8%] h-[48%] opacity-60"
            style={{
              transform: `translateZ(-18px) rotateX(72deg)`,
              transformOrigin: 'center bottom',
              backgroundImage:
                'linear-gradient(rgba(34,211,238,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.16) 1px, transparent 1px)',
              backgroundSize: '30px 30px',
              maskImage: 'linear-gradient(to top, black, transparent 88%)',
            }}
          />

          <div
            className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-[#071014]/80 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200 backdrop-blur-xl sm:left-5 sm:top-5"
            style={{ transform: `translateZ(${depth + 16}px)` }}
          >
            <Layers3 size={12} />
            {eyebrow || categoryLabel(category)}
          </div>
          <div
            className="absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-300 backdrop-blur-xl sm:right-5 sm:top-5"
            style={{ transform: `translateZ(${depth}px)` }}
          >
            <Sparkles size={11} className="text-cyan-300" />
            {badge}
          </div>

          <div
            className={`absolute ${hero ? 'inset-[16%_8%_16%]' : 'inset-[19%_8%_12%]'} flex items-center justify-center`}
            style={{
              transform: `translateZ(${depth}px) translateY(${active ? '-7px' : '0'})`,
              transition: 'transform 220ms ease',
            }}
          >
            {children ? (
              <div className="h-full w-full">{children}</div>
            ) : thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={name}
                className={`max-h-full w-full object-contain ${hero ? 'drop-shadow-[0_32px_28px_rgba(0,0,0,.50)]' : 'drop-shadow-[0_22px_20px_rgba(0,0,0,.42)]'} transition-transform duration-300`}
                style={{ transform: active ? 'scale(1.035)' : 'scale(1)' }}
              />
            ) : (
              <div className={`grid ${hero ? 'h-36 w-36' : 'h-24 w-24'} place-items-center rounded-[30px] border border-cyan-200/20 bg-cyan-300/10 shadow-2xl backdrop-blur-xl`}>
                <Box className="text-cyan-300" size={hero ? 54 : 38} />
              </div>
            )}
          </div>

          {hero && (
            <>
              <div
                className="absolute bottom-7 left-7 z-20 max-w-[68%] rounded-2xl border border-white/10 bg-[#071014]/74 px-4 py-3 backdrop-blur-xl"
                style={{ transform: `translateZ(${depth + 8}px)` }}
              >
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">SUMMECA PRODUCT</p>
                <p className="mt-1 line-clamp-1 text-sm font-black text-white">{name}</p>
              </div>
              <div
                aria-hidden="true"
                className="absolute bottom-[9%] left-1/2 h-7 w-[58%] -translate-x-1/2 rounded-full bg-black/55 blur-2xl"
                style={{ transform: 'translateX(-50%) translateZ(20px)' }}
              />
            </>
          )}

          <div
            aria-hidden="true"
            className="absolute left-[12%] right-[12%] top-[8%] h-px bg-gradient-to-r from-transparent via-cyan-200/55 to-transparent"
            style={{ transform: `translateZ(${depth + 24}px)` }}
          />
        </div>
      </div>
    </div>
  );
}
