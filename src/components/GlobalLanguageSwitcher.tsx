'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function GlobalLanguageSwitcher() {
  const pathname = usePathname();
  const [hasHostedSwitcher, setHasHostedSwitcher] = useState<boolean | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setHasHostedSwitcher(Boolean(
        document.querySelector('[data-public-nav="true"], [data-language-switcher-host="true"]'),
      ));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  if (hasHostedSwitcher !== false) return null;

  return (
    <div className="fixed left-1/2 top-4 z-[120] -translate-x-1/2" data-i18n-skip>
      <LanguageSwitcher />
    </div>
  );
}
