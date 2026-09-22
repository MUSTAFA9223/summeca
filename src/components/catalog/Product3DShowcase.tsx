import type { ReactNode } from 'react';
import { Eye, Layers3 } from 'lucide-react';
import ProductProofPreview from '@/components/catalog/ProductProofPreview';

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

function isRealProductScreenshot(thumbnailUrl?: string | null) {
  if (!thumbnailUrl) return false;
  return /\.(?:png|webp|jpe?g)(?:\?.*)?$/i.test(thumbnailUrl);
}

function CardThreeDFrame({
  children,
  productName,
}: {
  children: ReactNode;
  productName: string;
}) {
  return (
    <div className="relative h-[180px] [perspective:900px]" data-product-proof-preview="true">
      <div
        aria-hidden="true"
        className="absolute inset-x-[12%] bottom-[-2px] h-8 rounded-[50%] bg-cyan-300/15 blur-xl transition duration-300 group-hover:bg-cyan-300/20 group-hover:blur-2xl motion-reduce:transition-none"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-[9%] top-[16%] h-[70%] rounded-[22px] bg-cyan-300/[0.07] blur-2xl"
      />

      <div
        className="absolute inset-[4px_12px_13px_3px]"
        style={{
          transform: 'rotateX(3deg) rotateY(-6deg) rotateZ(-0.65deg)',
          transformStyle: 'preserve-3d',
          transformOrigin: 'center center',
        }}
      >
        <div className="relative h-full w-full transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.012] motion-reduce:transform-none motion-reduce:transition-none">
          <div
            aria-hidden="true"
            className="absolute -right-[9px] bottom-[3px] top-[8px] w-[10px] border-r border-cyan-300/20 bg-gradient-to-b from-cyan-300/25 via-slate-700/80 to-slate-950"
            style={{
              clipPath: 'polygon(0 0, 100% 7%, 100% 100%, 0 95%)',
              transform: 'translateZ(-7px)',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-[9px] left-[8px] right-[-9px] h-[10px] border-b border-cyan-300/15 bg-gradient-to-r from-slate-800 via-cyan-950/80 to-slate-950"
            style={{
              clipPath: 'polygon(0 0, 95% 0, 100% 100%, 5% 100%)',
              transform: 'translateZ(-7px)',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-[6px_-4px_-4px_7px] rounded-[14px] border border-slate-600/40 bg-[#071018] shadow-[0_22px_35px_rgba(0,0,0,.48)]"
            style={{ transform: 'translateZ(-8px)' }}
          />

          <div
            className="relative h-full overflow-hidden rounded-[14px] border border-cyan-200/20 bg-[#0d151d] shadow-[0_18px_34px_rgba(0,0,0,.45),0_0_0_1px_rgba(103,232,249,.04)]"
            style={{ transform: 'translateZ(14px)' }}
          >
            {children}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,.08),transparent_26%,transparent_70%,rgba(34,211,238,.05))]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/45 to-transparent"
            />
          </div>
        </div>
      </div>

      <span className="sr-only">{productName} interactive 3D product preview</span>
    </div>
  );
}

function HeroThreeDFrame({
  name,
  eyebrow,
  badge,
  children,
}: {
  name: string;
  eyebrow: string;
  badge: string;
  children: ReactNode;
}) {
  return (
    <div
      className="summeca-product-hero-3d group relative min-h-[430px] sm:min-h-[505px]"
      data-product-proof-preview="true"
    >
      <style>{`
        .summeca-product-hero-3d {
          perspective: 1400px;
          transform-style: preserve-3d;
          isolation: isolate;
        }

        .summeca-product-hero-3d .summeca-hero-glow {
          transition: transform 360ms ease, opacity 360ms ease, filter 360ms ease;
        }

        .summeca-product-hero-3d .summeca-hero-back {
          transition: transform 360ms cubic-bezier(.2,.8,.2,1), opacity 360ms ease, box-shadow 360ms ease;
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }

        .summeca-product-hero-3d .summeca-hero-back-far {
          transform: translate3d(64px,-28px,-92px) rotateX(1deg) rotateY(-10deg) rotateZ(1.2deg);
        }

        .summeca-product-hero-3d .summeca-hero-back-mid {
          transform: translate3d(34px,-14px,-44px) rotateX(1.5deg) rotateY(-8deg) rotateZ(.6deg);
        }

        .summeca-product-hero-3d .summeca-hero-front {
          transform: translate3d(0,0,20px) rotateX(2deg) rotateY(-7deg) rotateZ(-.45deg);
          transform-style: preserve-3d;
          transform-origin: center center;
          backface-visibility: hidden;
          transition: transform 360ms cubic-bezier(.2,.8,.2,1), box-shadow 360ms ease;
        }

        .summeca-product-hero-3d:hover .summeca-hero-front {
          transform: translate3d(-4px,-10px,30px) rotateX(1deg) rotateY(-4deg) rotateZ(-.15deg) scale(1.012);
          box-shadow: 0 34px 80px rgba(2,8,23,.5), 0 0 0 1px rgba(103,232,249,.16), 0 0 46px rgba(34,211,238,.14);
        }

        .summeca-product-hero-3d:hover .summeca-hero-back-mid {
          transform: translate3d(42px,-18px,-38px) rotateX(1deg) rotateY(-6deg) rotateZ(.8deg);
        }

        .summeca-product-hero-3d:hover .summeca-hero-back-far {
          transform: translate3d(78px,-34px,-84px) rotateX(.5deg) rotateY(-8deg) rotateZ(1.5deg);
        }

        .summeca-product-hero-3d:hover .summeca-hero-glow {
          transform: translateY(8px) scale(1.06);
          opacity: .95;
          filter: blur(27px);
        }

        @media (max-width: 639px) {
          .summeca-product-hero-3d {
            min-height: 430px;
            perspective: 1050px;
          }

          .summeca-product-hero-3d .summeca-hero-front {
            transform: translate3d(0,0,12px) rotateX(1deg) rotateY(-3deg);
          }

          .summeca-product-hero-3d .summeca-hero-back-mid {
            transform: translate3d(17px,-8px,-25px) rotateY(-3deg) rotateZ(.4deg);
          }

          .summeca-product-hero-3d .summeca-hero-back-far {
            transform: translate3d(30px,-15px,-48px) rotateY(-4deg) rotateZ(.8deg);
          }

          .summeca-product-hero-3d:hover .summeca-hero-front {
            transform: translate3d(0,-4px,14px) rotateX(.5deg) rotateY(-2deg);
          }

          .summeca-product-hero-3d:hover .summeca-hero-back-mid {
            transform: translate3d(20px,-9px,-22px) rotateY(-2deg) rotateZ(.4deg);
          }

          .summeca-product-hero-3d:hover .summeca-hero-back-far {
            transform: translate3d(34px,-16px,-44px) rotateY(-3deg) rotateZ(.8deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .summeca-product-hero-3d .summeca-hero-front,
          .summeca-product-hero-3d .summeca-hero-back,
          .summeca-product-hero-3d .summeca-hero-glow {
            transition: none !important;
          }

          .summeca-product-hero-3d:hover .summeca-hero-front {
            transform: translate3d(0,0,20px) rotateX(2deg) rotateY(-7deg) rotateZ(-.45deg);
          }

          .summeca-product-hero-3d:hover .summeca-hero-back-mid {
            transform: translate3d(34px,-14px,-44px) rotateX(1.5deg) rotateY(-8deg) rotateZ(.6deg);
          }

          .summeca-product-hero-3d:hover .summeca-hero-back-far {
            transform: translate3d(64px,-28px,-92px) rotateX(1deg) rotateY(-10deg) rotateZ(1.2deg);
          }
        }
      `}</style>

      <div
        aria-hidden="true"
        className="summeca-hero-glow absolute inset-x-[9%] bottom-[2%] h-24 rounded-[50%] bg-cyan-300/25 opacity-80 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="summeca-hero-back summeca-hero-back-far absolute inset-[6%_1%_8%_12%] rounded-[28px] border border-cyan-300/25 bg-[linear-gradient(145deg,#0d1a22,#082a31_58%,#0b1118)] shadow-[0_24px_70px_rgba(0,0,0,.38),0_0_34px_rgba(34,211,238,.14)]"
      >
        <div className="absolute inset-y-8 right-7 w-px bg-gradient-to-b from-transparent via-cyan-300/40 to-transparent" />
        <div className="absolute bottom-8 right-7 text-right">
          <div className="ml-auto h-9 w-9 rounded-xl border border-cyan-300/20 bg-cyan-300/10" />
          <p className="mt-3 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/70">SUMMECA</p>
          <p className="mt-1 text-[7px] uppercase tracking-[0.16em] text-slate-500">AI · SaaS · Digital</p>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="summeca-hero-back summeca-hero-back-mid absolute inset-[4%_4%_6%_7%] rounded-[26px] border border-cyan-200/20 bg-[linear-gradient(145deg,#111b24,#0a151d_62%,#071117)] shadow-[0_28px_65px_rgba(0,0,0,.42),0_0_28px_rgba(34,211,238,.1)]"
      >
        <div className="absolute inset-x-7 top-5 h-px bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />
        <div className="absolute right-6 top-6 h-2 w-16 rounded-full bg-cyan-300/10" />
      </div>

      <div
        className="summeca-hero-front absolute inset-[5%_7%_7%_1%] overflow-hidden rounded-[26px] border border-cyan-200/20 bg-[#0c1218] p-3 shadow-[0_30px_72px_rgba(0,0,0,.48),0_0_0_1px_rgba(103,232,249,.05)] sm:p-4"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,.07),transparent_24%,transparent_68%,rgba(34,211,238,.06))]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/60 to-transparent"
        />

        <div className="relative mb-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">
            <Layers3 size={11} aria-hidden="true" /> {eyebrow}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
            <Eye size={10} className="text-cyan-300" aria-hidden="true" /> {badge}
          </span>
        </div>

        <div className="relative h-[340px] sm:h-[430px]">
          {children}
        </div>

        <span className="sr-only">{name} layered 3D product preview</span>
      </div>
    </div>
  );
}

function ScreenshotPreview({
  name,
  thumbnailUrl,
  hero,
}: {
  name: string;
  thumbnailUrl: string;
  hero: boolean;
}) {
  if (hero) {
    return (
      <div
        className="h-full overflow-hidden rounded-xl border border-slate-700/80 bg-white shadow-[0_18px_48px_rgba(0,0,0,.35)]"
        data-product-proof-preview="true"
      >
        <img
          src={thumbnailUrl}
          alt={`${name} product screenshot`}
          width={1200}
          height={675}
          loading={hero ? 'eager' : 'lazy'}
          decoding="async"
          className="h-full w-full object-contain object-top"
        />
      </div>
    );
  }

  return (
    <CardThreeDFrame productName={name}>
      <div className="flex h-full flex-col bg-white">
        <div className="flex h-5 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100 px-2">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400/80" />
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400/80" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
          </div>
          <span className="max-w-[58%] truncate text-[6px] font-bold uppercase tracking-[0.12em] text-slate-500">
            {name}
          </span>
          <span className="h-1.5 w-5 rounded-full bg-cyan-400/20" />
        </div>
        <img
          src={thumbnailUrl}
          alt={`${name} product screenshot`}
          width={1200}
          height={675}
          loading={hero ? 'eager' : 'lazy'}
          decoding="async"
          className="min-h-0 flex-1 object-contain object-top"
        />
      </div>
    </CardThreeDFrame>
  );
}

export default function Product3DShowcase({
  name,
  thumbnailUrl,
  category,
  eyebrow,
  variant = 'hero',
  className = '',
  badge = 'Actual product preview',
  children,
}: Product3DShowcaseProps) {
  const hero = variant === 'hero';
  const useScreenshot = isRealProductScreenshot(thumbnailUrl);
  const resolvedEyebrow = eyebrow || categoryLabel(category);

  const preview = children ? (
    <div className="h-full">{children}</div>
  ) : useScreenshot ? (
    <ScreenshotPreview name={name} thumbnailUrl={thumbnailUrl ?? ''} hero={hero} />
  ) : (
    <ProductProofPreview name={name} variant={variant} className={hero ? '!h-full' : ''} />
  );

  if (hero) {
    return (
      <div className={`relative isolate ${className}`} data-product-preview="true">
        <HeroThreeDFrame name={name} eyebrow={resolvedEyebrow} badge={badge}>
          {preview}
        </HeroThreeDFrame>
      </div>
    );
  }

  return (
    <div
      className={`relative isolate h-[225px] ${className}`}
      data-product-preview="true"
    >
      <div className="absolute inset-0 rounded-[22px] border border-slate-700/80 bg-[#0c1218] p-3 shadow-[0_26px_70px_rgba(0,0,0,.38)] sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">
            <Layers3 size={11} aria-hidden="true" /> {resolvedEyebrow}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
            <Eye size={10} className="text-cyan-300" aria-hidden="true" /> {badge}
          </span>
        </div>

        {children ? (
          <CardThreeDFrame productName={name}>
            <div className="h-full">{children}</div>
          </CardThreeDFrame>
        ) : useScreenshot ? (
          <ScreenshotPreview name={name} thumbnailUrl={thumbnailUrl ?? ''} hero={hero} />
        ) : (
          <CardThreeDFrame productName={name}>
            <ProductProofPreview name={name} variant={variant} className="!h-full" />
          </CardThreeDFrame>
        )}
      </div>
    </div>
  );
}
