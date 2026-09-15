'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

const PRODUCT_PATH = '/products/ecommerce-product-page-conversion-kit';

export default function LaunchOfferBanner() {
  const { isArabic } = useLanguage();

  return (
    <aside
      className="relative z-[70] border-b border-teal-300/25 bg-teal-950 px-4 py-2.5 text-center text-xs font-700 text-teal-50 sm:text-sm"
      aria-label={isArabic ? 'عرض الإطلاق' : 'Launch offer'}
    >
      <span>
        {isArabic
          ? 'عرض الإطلاق: حزمة تحسين صفحات المنتجات بسعر 15.20$ بعد استخدام الكود '
          : 'Launch offer: get the Ecommerce Product Page Conversion Kit for $15.20 with code '}
      </span>
      <strong className="mx-1 rounded-md border border-teal-200/35 bg-white/10 px-1.5 py-0.5 font-800 tracking-wide">
        LAUNCH20
      </strong>
      <span>{isArabic ? ' — حتى 22 سبتمبر.' : ' — through September 22.'}</span>{' '}
      <Link
        href={PRODUCT_PATH}
        className="inline-flex min-h-7 items-center underline decoration-teal-200/60 underline-offset-4 hover:text-white"
      >
        {isArabic ? 'شاهد الحزمة' : 'View the kit'}
      </Link>
    </aside>
  );
}
