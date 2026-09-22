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
        className="h-[360px] overflow-hidden rounded-xl border border-slate-700/80 bg-white shadow-[0_18px_48px_rgba(0,0,0,.35)] sm:h-[430px]"
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

  return (
    <div
      className={`relative isolate ${hero ? 'min-h-[430px]' : 'h-[225px]'} ${className}`}
      data-product-preview="true"
    >
      <div className="absolute inset-0 rounded-[22px] border border-slate-700/80 bg-[#0c1218] p-3 shadow-[0_26px_70px_rgba(0,0,0,.38)] sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">
            <Layers3 size={11} aria-hidden="true" /> {eyebrow || categoryLabel(category)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
            <Eye size={10} className="text-cyan-300" aria-hidden="true" /> {badge}
          </span>
        </div>

        {children ? (
          hero ? (
            <div className="h-[360px] sm:h-[430px]">{children}</div>
          ) : (
            <CardThreeDFrame productName={name}>
              <div className="h-full">{children}</div>
            </CardThreeDFrame>
          )
        ) : useScreenshot ? (
          <ScreenshotPreview name={name} thumbnailUrl={thumbnailUrl ?? ''} hero={hero} />
        ) : hero ? (
          <ProductProofPreview name={name} variant={variant} />
        ) : (
          <CardThreeDFrame productName={name}>
            <ProductProofPreview name={name} variant={variant} className="!h-full" />
          </CardThreeDFrame>
        )}
      </div>
    </div>
  );
}
