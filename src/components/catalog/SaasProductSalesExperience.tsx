'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import BaseSaasProductSalesExperience from './SaasProductSalesExperienceBase';
import type {
  SaasSalesPlan,
  SaasSalesProduct,
} from './SaasProductSalesExperienceBase';

export * from './SaasProductSalesExperienceBase';

function RealProductPreview({ product }: { product: SaasSalesProduct }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!product.thumbnail_url) {
      setTarget(null);
      return;
    }

    setTarget(document.getElementById('product-preview'));
  }, [product.slug, product.thumbnail_url]);

  if (!target || !product.thumbnail_url || failed) return null;

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
            ACTUAL PRODUCT
          </span>
        </div>
        <img
          src={product.thumbnail_url}
          alt={`${product.name} actual product screenshot`}
          loading="eager"
          decoding="async"
          onError={() => setFailed(true)}
          className="block h-auto w-full bg-white object-contain object-top"
        />
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
