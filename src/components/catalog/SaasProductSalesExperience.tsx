'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import BaseSaasProductSalesExperience from './SaasProductSalesExperienceBase';
import type {
  SaasSalesPlan,
  SaasSalesProduct,
} from './SaasProductSalesExperienceBase';

export * from './SaasProductSalesExperienceBase';

type DemoSlug = 'summeca-invoiceflow' | 'summeca-leadfollow-ai';

// Publish only recordings captured from the real customer-facing workspaces.
// Keep a slug absent until its final demo file is hosted and verified.
const DEMO_VIDEO_BY_SLUG: Partial<Record<DemoSlug, string>> = {};

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
  const demoVideoUrl = demoVideoFor(product.slug);

  useEffect(() => {
    setImageFailed(false);
    setVideoFailed(false);
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

  return createPortal(
    <>
      <style>{`#product-preview > div:not([data-real-product-preview="true"]) { display: none !important; }`}</style>
      <div
        data-real-product-preview="true"
        className="overflow-hidden rounded-[24px] border border-border/80 bg-card shadow-2xl shadow-primary/10"
      >
        <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-3 sm:px-5">
          <span className="text-xs font-bold text-foreground">{product.name}</span>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
            {showVideo ? 'REAL PRODUCT DEMO' : 'ACTUAL PRODUCT'}
          </span>
        </div>
        {showVideo ? (
          <video
            src={demoVideoUrl ?? undefined}
            poster={product.thumbnail_url ?? undefined}
            controls
            playsInline
            preload="metadata"
            onError={() => setVideoFailed(true)}
            className="block aspect-video w-full bg-black object-contain"
            aria-label={`${product.name} real product demo`}
          />
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
    <>
      <BaseSaasProductSalesExperience product={product} plans={plans} />
      <RealProductPreview product={product} />
    </>
  );
}
