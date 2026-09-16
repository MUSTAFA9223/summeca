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
    <div
      className="fixed left-1/2 z-[120] -translate-x-1/2 px-2 transition-[top] duration-300 print:hidden"
      style={{
        top: 'calc(var(--launch-offer-height, 0px) + max(1rem, env(safe-area-inset-top)))',
      }}
      data-i18n-skip
    >
      <LanguageSwitcher className="max-w-[calc(100vw-1rem)]" />
    </div>
  );
}
