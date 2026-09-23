'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { trackFunnelEvent } from '@/lib/funnelAnalytics';

export default function GuideProductCta({
  href,
  guideSlug,
  productSlug,
  productName,
}: {
  href: string;
  guideSlug: string;
  productSlug: string;
  productName: string;
}) {
  return (
    <Link
      href={href}
      onClick={() => {
        trackFunnelEvent('content_cta_click', {
          productSlug,
          source: guideSlug,
        });
      }}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
    >
      Explore {productName}
      <ArrowRight size={16} />
    </Link>
  );
}
