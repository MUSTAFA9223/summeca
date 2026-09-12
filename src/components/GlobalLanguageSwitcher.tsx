'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function GlobalLanguageSwitcher() {
  const pathname = usePathname();
  const [hasPublicNav, setHasPublicNav] = useState<boolean | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setHasPublicNav(Boolean(document.querySelector('[data-public-nav="true"]')));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  if (hasPublicNav !== false) return null;

  return (
    <div className="fixed left-1/2 top-4 z-[120] -translate-x-1/2" data-i18n-skip>
      <LanguageSwitcher />
    </div>
  );
}
