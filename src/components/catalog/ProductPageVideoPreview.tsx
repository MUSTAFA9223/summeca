'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';

type ProductVideo = {
  label: string;
  src: string;
};

const PRODUCT_VIDEOS: Record<string, ProductVideo> = {
  'summeca-invoiceflow': {
    label: 'SUMMECA InvoiceFlow real product preview',
    src: '/assets/product-videos/summeca-invoiceflow-6s.mp4',
  },
  'summeca-leadfollow-ai': {
    label: 'SUMMECA LeadFollow AI real product preview',
    src: '/assets/product-videos/summeca-leadfollow-ai-6s.mp4',
  },
  'ai-social-media-content-kit': {
    label: 'AI Social Media Content Kit real product preview',
    src: '/assets/product-videos/ai-social-media-content-kit-6s.mp4',
  },
  'ecommerce-product-page-conversion-kit': {
    label: 'Ecommerce Product Page Conversion Kit real product preview',
    src: '/assets/product-videos/ecommerce-product-page-conversion-kit-6s.mp4',
  },
  'freelancer-client-management-kit': {
    label: 'Freelancer Client Management Kit real product preview',
    src: '/assets/product-videos/freelancer-client-management-kit-6s.mp4',
  },
  'conversion-rescue-kit-starter': {
    label: 'SUMMECA Conversion Rescue Starter real product preview',
    src: '/assets/product-videos/conversion-rescue-kit-starter-6s.mp4',
  },
  'conversion-rescue-kit-pro': {
    label: 'SUMMECA Conversion Rescue Pro real product preview',
    src: '/assets/product-videos/conversion-rescue-kit-pro-6s.mp4',
  },
  'conversion-rescue-kit-ultimate': {
    label: 'SUMMECA Conversion Rescue Ultimate real product preview',
    src: '/assets/product-videos/conversion-rescue-kit-ultimate-6s.mp4',
  },
};

function getProductSlug(pathname: string | null) {
  if (!pathname?.startsWith('/products/')) return null;
  const slug = pathname.slice('/products/'.length).split('/')[0];
  return slug || null;
}

export default function ProductPageVideoPreview() {
  const pathname = usePathname();
  const slug = getProductSlug(pathname);
  const video = slug ? PRODUCT_VIDEOS[slug] : undefined;
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(null);
    if (!video) return;

    const oldSlot = document.getElementById('summeca-real-product-video-slot');
    oldSlot?.remove();

    const slot = document.createElement('div');
    slot.id = 'summeca-real-product-video-slot';
    slot.setAttribute('data-real-product-preview', slug ?? '');

    const namedPreview = document.getElementById('product-preview');
    const main = document.querySelector('main');
    const firstSection = main?.querySelector('section');

    if (namedPreview?.parentElement) {
      namedPreview.insertAdjacentElement('afterend', slot);
    } else if (firstSection?.parentElement) {
      firstSection.insertAdjacentElement('afterend', slot);
    } else if (main) {
      main.prepend(slot);
    } else {
      document.body.append(slot);
    }

    setTarget(slot);

    return () => {
      slot.remove();
    };
  }, [slug, video]);

  if (!video || !target) return null;

  return createPortal(
    <section
      aria-label={video.label}
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
    >
      <div className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-slate-950 shadow-2xl shadow-cyan-950/30 ring-1 ring-white/5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_36%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-extrabold tracking-[0.2em] text-cyan-100 sm:text-xs">
            REAL PRODUCT PREVIEW
          </span>
          <span className="text-xs font-semibold text-slate-400">6-second walkthrough</span>
        </div>
        <video
          aria-label={video.label}
          className="relative aspect-[3/2] w-full bg-slate-950 object-cover"
          src={video.src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div className="relative flex flex-col gap-1 border-t border-white/10 px-4 py-4 sm:px-6">
          <p className="text-sm font-bold text-white">See what the product actually contains</p>
          <p className="text-xs leading-5 text-slate-400">
            Preview built from the actual product workspace or deliverable content. Sample data may be shown.
          </p>
        </div>
      </div>
    </section>,
    target,
  );
}
