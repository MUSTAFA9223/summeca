'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import CompactLanguageSwitcher from '@/components/CompactLanguageSwitcher';

const HOST_SELECTOR = '[data-public-nav="true"], [data-language-switcher-host="true"]';

export default function GlobalLanguageSwitcher() {
  const pathname = usePathname();
  const [hasHostedSwitcher, setHasHostedSwitcher] = useState<boolean | null>(null);
  const isInvoiceRoute = pathname?.startsWith('/invoice/');

  useEffect(() => {
    let frame = 0;

    const syncHostedSwitcher = () => {
      setHasHostedSwitcher(Boolean(document.querySelector(HOST_SELECTOR)));
    };

    const scheduleSync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(syncHostedSwitcher);
    };

    scheduleSync();

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [pathname]);

  if (hasHostedSwitcher !== false) return null;

  return (
    <div
      className={isInvoiceRoute
        ? 'fixed z-[120] scale-90 print:hidden sm:scale-100'
        : 'fixed left-1/2 z-[120] -translate-x-1/2 px-2 transition-[top] duration-300'}
      style={isInvoiceRoute
        ? {
            right: 'max(.5rem, env(safe-area-inset-right))',
            bottom: 'max(.5rem, env(safe-area-inset-bottom))',
          }
        : {
            top: 'calc(var(--launch-offer-height, 0px) + max(.5rem, env(safe-area-inset-top)))',
          }}
      data-i18n-skip
    >
      <div className="sm:hidden">
        <CompactLanguageSwitcher />
      </div>
      <div className="hidden sm:block">
        <LanguageSwitcher className="max-w-[calc(100vw-1rem)]" />
      </div>
    </div>
  );
}
