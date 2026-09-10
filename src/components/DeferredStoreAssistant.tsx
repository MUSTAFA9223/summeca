'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const StoreAssistant = dynamic(() => import('@/components/StoreAssistant'), {
  ssr: false,
  loading: () => null,
});

type IdleDeadlineLike = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: (deadline: IdleDeadlineLike) => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export default function DeferredStoreAssistant() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const win = window as IdleWindow;
    const show = () => setReady(true);

    if (typeof win.requestIdleCallback === 'function') {
      const handle = win.requestIdleCallback(show, { timeout: 2500 });
      return () => win.cancelIdleCallback?.(handle);
    }

    const timer = window.setTimeout(show, 1400);
    return () => window.clearTimeout(timer);
  }, []);

  return ready ? <StoreAssistant /> : null;
}
