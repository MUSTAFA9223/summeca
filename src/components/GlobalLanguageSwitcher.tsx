'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

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

    // Dashboard/admin navigation hosts can mount after auth finishes. Watching the
    // DOM keeps the fallback switcher from remaining visible beside the hosted one.
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
        ? 'fixed z-[120] print:hidden'
        : 'fixed left-1/2 z-[120] -translate-x-1/2 px-2 transition-[top] duration-300'}
      style={isInvoiceRoute
        ? {
            right: 'max(1rem, env(safe-area-inset-right))',
            bottom: 'max(1rem, env(safe-area-inset-bottom))',
          }
        : {
            top: 'calc(var(--launch-offer-height, 0px) + max(1rem, env(safe-area-inset-top)))',
          }}
      data-i18n-skip
    >
      <LanguageSwitcher className="max-w-[calc(100vw-1rem)]" />
    </div>
  );
}
