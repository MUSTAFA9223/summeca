'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play } from 'lucide-react';
import BaseSaasProductSalesExperience from './SaasProductSalesExperienceBase';
import type {
  SaasSalesPlan,
  SaasSalesProduct,
} from './SaasProductSalesExperienceBase';

export * from './SaasProductSalesExperienceBase';

type DemoSlug = 'summeca-invoiceflow' | 'summeca-leadfollow-ai';

// Publish only recordings captured from the real customer-facing workspaces.
// Keep a slug absent until its final demo file is hosted and verified.
// Public SaaS access is not delivered as a downloadable ZIP; the visible sales copy explains account access after verified payment.
const DEMO_VIDEO_BY_SLUG: Partial<Record<DemoSlug, string>> = {
  'summeca-invoiceflow': '/assets/product-videos/summeca-invoiceflow-6s.mp4',
  'summeca-leadfollow-ai': '/assets/product-videos/summeca-leadfollow-ai-6s.mp4',
};

function demoVideoFor(slug: string) {
  if (slug !== 'summeca-invoiceflow' && slug !== 'summeca-leadfollow-ai') return null;
  const url = DEMO_VIDEO_BY_SLUG[slug];
  if (!url) return null;
  return url.startsWith('/') || url.startsWith('https://') ? url : null;
}

function RealProductPreview({ product }: { product: SaasSalesProduct }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const demoVideoUrl = demoVideoFor(product.slug);

  useEffect(() => {
    setImageFailed(false);
    setVideoFailed(false);
    setPlaying(false);
    if (!product.thumbnail_url && !demoVideoUrl) {
      setTarget(null);
      return;
    }

    setTarget(document.getElementById('product-preview'));
  }, [product.slug, product.thumbnail_url, demoVideoUrl]);

  if (!target) return null;

  const showVideo = Boolean(demoVideoUrl && !videoFailed);
  const showImage = Boolean(product.thumbnail_url && !imageFailed);
  if (!showVideo && !showImage) return null;

  const playVideo = () => {
    const node = videoRef.current;
    if (!node) return;
    void node.play();
  };

  return createPortal(
    <>
      <style>{`#product-preview > div:not([data-real-product-preview="true"]) { display: none !important; }`}</style>
      <div
        data-real-product-preview="true"
        className="overflow-hidden rounded-[24px] border border-border/80 bg-card shadow-2xl shadow-primary/10 transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-primary/15 motion-reduce:transform-none"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/30 px-4 py-3 sm:px-5">
          <span className="text-xs font-bold text-foreground">{product.name}</span>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {showVideo && (
              <span className="text-[10px] font-semibold text-muted-foreground sm:text-[11px]">
                15-second real product walkthrough
              </span>
            )}
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary sm:text-[11px]">
              {showVideo ? 'REAL PRODUCT DEMO' : 'ACTUAL PRODUCT'}
            </span>
          </div>
        </div>
        {showVideo ? (
          <div className="relative aspect-video overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={demoVideoUrl ?? undefined}
              poster={product.thumbnail_url ?? undefined}
              controls={playing}
              muted
              loop
              playsInline
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => setVideoFailed(true)}
              className="h-full w-full object-contain"
              aria-label={`${product.name} real product demo, 15 seconds`}
            />
            {!playing && (
              <button
                type="button"
                onClick={playVideo}
                aria-label={`Play ${product.name} 15-second demo`}
                className="group absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary"
              >
                <span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/25 bg-white/95 text-slate-950 shadow-2xl transition duration-200 group-hover:scale-105 motion-reduce:transform-none">
                  <Play size={32} className="ml-1 fill-current" />
                </span>
              </button>
            )}
            {!playing && (
              <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/70 px-2 py-1 text-[11px] font-bold text-white">
                0:15
              </span>
            )}
          </div>
        ) : (
          <img
            src={product.thumbnail_url ?? undefined}
            alt={`${product.name} actual product screenshot`}
            loading="eager"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="block h-auto w-full bg-white object-contain object-top"
          />
        )}
      </div>
    </>,
    target,
  );
}

export default function SaasProductSalesExperience({
  product,
  plans,
}: {
  product: SaasSalesProduct;
  plans: SaasSalesPlan[];
}) {
  return (
    <div className="summeca-saas-sales-shell">
      <style>{`
        .summeca-saas-sales-shell main {
          padding-top: 70px !important;
        }

        @media (max-width: 639px) {
          .summeca-saas-sales-shell main > section:first-of-type > div.relative {
            padding-top: 1rem;
            padding-bottom: 1.75rem;
          }

          .summeca-saas-sales-shell #product-preview {
            margin-top: 0.25rem;
          }
        }

        @media (min-width: 1024px) {
          .summeca-saas-sales-shell main > section:first-of-type > div.relative {
            align-items: start;
            gap: 2rem;
            padding-top: 1.5rem;
            padding-bottom: 2.25rem;
          }

          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(2) {
            margin-top: 0.7rem;
          }

          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(3) {
            margin-top: 0.55rem;
            font-size: clamp(2.55rem, 4vw, 3.55rem);
            line-height: 1.02;
          }

          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(4),
          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(5),
          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(6),
          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(8),
          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(9) {
            margin-top: 0.8rem;
          }

          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(5) {
            padding: 0.8rem 0.9rem;
          }

          .summeca-saas-sales-shell main > section:first-of-type > div.relative > div:first-child > :nth-child(5) ul {
            margin-top: 0.55rem;
          }

          .summeca-saas-sales-shell #product-preview {
            align-self: start;
            margin-top: 0.25rem;
          }
        }
      `}</style>
      <BaseSaasProductSalesExperience product={product} plans={plans} />
      <RealProductPreview product={product} />
    </div>
  );
}
