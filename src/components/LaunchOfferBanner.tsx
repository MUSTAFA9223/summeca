'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const PRODUCT_PATH = '/products/ecommerce-product-page-conversion-kit';
const STORAGE_KEY = 'summeca:launch-offer-dismissed:2026-09-22';
const HEIGHT_VAR = '--launch-offer-height';

function setReservedHeight(height: number) {
  const value = `${Math.max(0, height)}px`;
  document.documentElement.style.setProperty(HEIGHT_VAR, value);
  document.body.style.paddingTop = value;
}

export default function LaunchOfferBanner() {
  const { isArabic } = useLanguage();
  const bannerRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === '1') {
        setVisible(false);
        setReservedHeight(0);
        return;
      }
    } catch {
      // Keep the offer visible when storage is unavailable.
    }

    if (!visible) {
      setReservedHeight(0);
      return;
    }

    const element = bannerRef.current;
    if (!element) return;

    const syncHeight = () => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      setReservedHeight(height);
    };

    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(element);
    window.addEventListener('resize', syncHeight, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  }, [visible]);

  useEffect(() => () => setReservedHeight(0), []);

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Dismiss for this render even if storage is unavailable.
    }
    setReservedHeight(0);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside
      ref={bannerRef}
      className="fixed inset-x-0 top-0 z-[80] border-b border-[#45f2dc]/20 bg-[linear-gradient(100deg,#04242c_0%,#073743_45%,#075264_100%)] px-12 py-2.5 text-center text-xs font-bold text-[#e9fffb] shadow-[0_8px_30px_rgba(2,19,27,.22)] sm:px-14 sm:text-sm"
      aria-label={isArabic ? 'عرض الإطلاق' : 'Launch offer'}
    >
      <span>
        {isArabic
          ? 'عرض الإطلاق: حزمة تحسين صفحات المنتجات بسعر 15.20$ بعد استخدام الكود '
          : 'Launch offer: get the Ecommerce Product Page Conversion Kit for $15.20 with code '}
      </span>
      <strong className="mx-1 rounded-md border border-[#72ffe9]/35 bg-[#3ef0d0]/10 px-1.5 py-0.5 font-extrabold tracking-wide text-[#8fffea]">
        LAUNCH20
      </strong>
      <span>{isArabic ? ' — حتى 22 سبتمبر.' : ' — through September 22.'}</span>{' '}
      <Link
        href={PRODUCT_PATH}
        className="inline-flex min-h-7 items-center font-extrabold text-[#7ee8ff] underline decoration-[#7ee8ff]/55 underline-offset-4 transition hover:text-white"
      >
        {isArabic ? 'شاهد الحزمة' : 'View the kit'}
      </Link>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/15 text-[#d8fffa] transition hover:border-[#72ffe9]/35 hover:bg-[#72ffe9]/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72ffe9]"
        aria-label={isArabic ? 'إغلاق عرض الإطلاق' : 'Dismiss launch offer'}
        title={isArabic ? 'إغلاق' : 'Close'}
      >
        <X size={15} />
      </button>
    </aside>
  );
}
