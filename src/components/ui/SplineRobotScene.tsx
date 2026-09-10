'use client';

import { useEffect, useRef } from 'react';

const SCENE_URL = 'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode';
const VIEWER_SCRIPT = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';

type SplineRobotSceneProps = {
  zoomScale?: number;
};

type IdleDeadlineLike = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type WindowWithSplineViewer = Window & {
  __summecaSplineViewerPromise?: Promise<void>;
  requestIdleCallback?: (
    callback: (deadline: IdleDeadlineLike) => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
    effectiveType?: string;
  };
};

function waitForViewerDefinition(timeoutMs = 8000) {
  if (customElements.get('spline-viewer')) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('Spline viewer definition timed out'));
    }, timeoutMs);

    customElements.whenDefined('spline-viewer').then(() => {
      window.clearTimeout(timer);
      resolve();
    }).catch((error) => {
      window.clearTimeout(timer);
      reject(error);
    });
  });
}

function loadSplineViewer() {
  const win = window as WindowWithSplineViewer;
  if (customElements.get('spline-viewer')) return Promise.resolve();
  if (win.__summecaSplineViewerPromise) return win.__summecaSplineViewerPromise;

  win.__summecaSplineViewerPromise = new Promise<void>((resolve, reject) => {
    const finish = () => {
      void waitForViewerDefinition()
        .then(resolve)
        .catch((error) => {
          win.__summecaSplineViewerPromise = undefined;
          reject(error);
        });
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-summeca-spline-viewer]');
    if (existing) {
      existing.addEventListener('error', () => {
        win.__summecaSplineViewerPromise = undefined;
        reject(new Error('Spline viewer failed to load'));
      }, { once: true });
      finish();
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = VIEWER_SCRIPT;
    script.dataset.summecaSplineViewer = 'true';
    script.onload = finish;
    script.onerror = () => {
      win.__summecaSplineViewerPromise = undefined;
      reject(new Error('Spline viewer failed to load'));
    };
    document.head.appendChild(script);
  });

  return win.__summecaSplineViewerPromise;
}

export default function SplineRobotScene({ zoomScale = 1 }: SplineRobotSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const host = hostRef.current;
    const win = window as WindowWithSplineViewer;
    const nav = navigator as NavigatorWithConnection;
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const connection = nav.connection;
    const constrainedConnection = Boolean(
      connection?.saveData ||
      connection?.effectiveType === 'slow-2g' ||
      connection?.effectiveType === '2g',
    );

    let cancelled = false;
    let viewer: HTMLElement | undefined;
    let retryTimer: number | undefined;
    let fallbackTimer: number | undefined;
    let idleHandle: number | undefined;
    let observer: IntersectionObserver | undefined;
    let scheduled = false;
    let loading = false;

    const clearScheduledWork = () => {
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      if (idleHandle !== undefined) win.cancelIdleCallback?.(idleHandle);
      retryTimer = undefined;
      fallbackTimer = undefined;
      idleHandle = undefined;
      scheduled = false;
    };

    const shouldSkipHeavyScene = () => reducedMotionQuery.matches || constrainedConnection;

    const mountSpline = async (attempt = 0) => {
      if (cancelled || shouldSkipHeavyScene() || viewer || loading) return;
      loading = true;

      try {
        await loadSplineViewer();
        if (cancelled || shouldSkipHeavyScene()) return;

        const nextViewer = document.createElement('spline-viewer');
        nextViewer.setAttribute('url', SCENE_URL);
        nextViewer.setAttribute('loading', 'lazy');
        nextViewer.setAttribute('background', 'transparent');
        nextViewer.setAttribute('renderer', 'webgl');
        nextViewer.setAttribute('aria-hidden', 'true');

        if (!mobileQuery.matches) nextViewer.setAttribute('events-target', 'global');

        Object.assign(nextViewer.style, {
          display: 'block',
          width: '100%',
          height: '100%',
          minHeight: '100%',
          background: 'transparent',
          pointerEvents: mobileQuery.matches ? 'none' : 'auto',
          touchAction: 'pan-y',
          transform: `scale(${zoomScale})`,
          transformOrigin: 'center center',
          filter: mobileQuery.matches ? 'none' : 'saturate(1.5) contrast(1.09) brightness(1.02)',
        });

        viewer = nextViewer;
        host.replaceChildren(nextViewer);
      } catch {
        if (cancelled || shouldSkipHeavyScene()) return;
        viewer = undefined;
        try { host.replaceChildren(); } catch { /* host may already be detached */ }

        if (attempt < 1) {
          retryTimer = window.setTimeout(() => {
            retryTimer = undefined;
            void mountSpline(attempt + 1);
          }, 1200);
        }
      } finally {
        loading = false;
      }
    };

    const scheduleMount = () => {
      if (cancelled || shouldSkipHeavyScene() || viewer || loading || scheduled) return;
      scheduled = true;

      const start = () => {
        scheduled = false;
        idleHandle = undefined;
        fallbackTimer = undefined;
        void mountSpline();
      };

      if (typeof win.requestIdleCallback === 'function') {
        idleHandle = win.requestIdleCallback(() => start(), {
          timeout: mobileQuery.matches ? 1800 : 900,
        });
      } else {
        fallbackTimer = window.setTimeout(start, mobileQuery.matches ? 450 : 120);
      }
    };

    const handleMotionPreference = () => {
      if (reducedMotionQuery.matches) {
        clearScheduledWork();
        viewer = undefined;
        try { host.replaceChildren(); } catch { /* host may already be detached */ }
        return;
      }
      scheduleMount();
    };

    reducedMotionQuery.addEventListener?.('change', handleMotionPreference);

    if (!shouldSkipHeavyScene()) {
      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver((entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer?.disconnect();
          observer = undefined;
          scheduleMount();
        }, {
          rootMargin: mobileQuery.matches ? '240px 0px' : '420px 0px',
          threshold: 0.01,
        });
        observer.observe(host);
      } else {
        scheduleMount();
      }
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      reducedMotionQuery.removeEventListener?.('change', handleMotionPreference);
      clearScheduledWork();
      try { host.replaceChildren(); } catch { /* host may already be detached */ }
    };
  }, [zoomScale]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
        <div className="absolute left-1/2 top-[45%] h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#08c5d1]/12 blur-[68px]" />
        <div className="absolute left-1/2 top-[58%] h-[36%] w-[36%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0aaebd]/10 blur-[48px]" />
        <div className="absolute bottom-[2%] left-1/2 h-12 w-[44%] -translate-x-1/2 rounded-[50%] bg-black/20 blur-2xl" />
      </div>
      <div ref={hostRef} className="absolute inset-0 z-[2] bg-transparent [contain:layout_paint_size]" />
    </div>
  );
}
