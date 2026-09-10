'use client';

import { useEffect, useRef } from 'react';

const SCENE_URL = 'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode';
const VIEWER_SCRIPT = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';

type SplineRobotSceneProps = {
  zoomScale?: number;
};

type WindowWithSplineViewer = Window & {
  __summecaSplineViewerPromise?: Promise<void>;
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
    const staleScript = document.querySelector<HTMLScriptElement>('script[data-summeca-spline-viewer]');
    if (staleScript && !customElements.get('spline-viewer')) staleScript.remove();

    const script = document.createElement('script');
    script.type = 'module';
    script.src = VIEWER_SCRIPT;
    script.dataset.summecaSplineViewer = 'true';

    const fail = (error: unknown) => {
      script.remove();
      win.__summecaSplineViewerPromise = undefined;
      reject(error instanceof Error ? error : new Error('Spline viewer failed to load'));
    };

    script.onload = () => {
      void waitForViewerDefinition()
        .then(resolve)
        .catch(fail);
    };
    script.onerror = () => fail(new Error('Spline viewer failed to load'));

    document.head.appendChild(script);
  });

  return win.__summecaSplineViewerPromise;
}

export default function SplineRobotScene({ zoomScale = 1 }: SplineRobotSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const host = hostRef.current;
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let cancelled = false;
    let retryTimer: number | undefined;
    let viewer: HTMLElement | undefined;

    const syncMotionPreference = () => {
      if (!viewer) return;

      if (reducedMotionQuery.matches) {
        viewer.removeAttribute('events-target');
        viewer.style.pointerEvents = 'none';
      } else {
        viewer.setAttribute('events-target', 'global');
        viewer.style.pointerEvents = 'auto';
      }
    };

    const scheduleRetry = (attempt: number) => {
      if (cancelled || attempt >= 3) return;
      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        void mountSpline(attempt + 1);
      }, 900 * (attempt + 1));
    };

    const mountSpline = async (attempt = 0) => {
      try {
        await loadSplineViewer();
        if (cancelled) return;

        const nextViewer = document.createElement('spline-viewer');
        nextViewer.setAttribute('url', SCENE_URL);
        nextViewer.setAttribute('loading', 'eager');
        nextViewer.setAttribute('background', 'transparent');
        nextViewer.setAttribute('renderer', 'webgl');
        nextViewer.setAttribute('aria-hidden', 'true');
        nextViewer.setAttribute('events-target', 'global');

        Object.assign(nextViewer.style, {
          display: 'block',
          width: '100%',
          height: '100%',
          minHeight: '100%',
          background: 'transparent',
          pointerEvents: 'auto',
          touchAction: 'pan-y',
          transform: `scale(${zoomScale})`,
          transformOrigin: 'center center',
          filter: 'saturate(1.5) contrast(1.09) brightness(1.02)',
          willChange: 'transform',
        });

        viewer = nextViewer;
        syncMotionPreference();

        nextViewer.addEventListener('context-loss', () => {
          if (cancelled) return;
          viewer = undefined;
          try { host.replaceChildren(); } catch { /* host may already be detached */ }
          scheduleRetry(0);
        }, { once: true });

        host.replaceChildren(nextViewer);
      } catch {
        if (cancelled) return;
        viewer = undefined;
        try { host.replaceChildren(); } catch { /* host may already be detached */ }
        scheduleRetry(attempt);
      }
    };

    reducedMotionQuery.addEventListener?.('change', syncMotionPreference);
    void mountSpline();

    return () => {
      cancelled = true;
      reducedMotionQuery.removeEventListener?.('change', syncMotionPreference);
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
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
      <div ref={hostRef} className="absolute inset-0 z-[2] bg-transparent" />
    </div>
  );
}
