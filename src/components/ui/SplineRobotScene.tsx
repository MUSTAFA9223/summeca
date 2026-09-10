'use client';

import { useEffect, useRef } from 'react';

const SCENE_URL = '/api/spline-scene';
const VIEWER_SCRIPT = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';

type WindowWithSplineViewer = Window & {
  __summecaSplineViewerPromise?: Promise<void>;
};

function waitForViewerDefinition(timeoutMs = 8000) {
  if (customElements.get('spline-viewer')) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error('Spline viewer definition timed out')),
      timeoutMs,
    );

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
    const stale = document.querySelector<HTMLScriptElement>('script[data-summeca-spline-viewer]');
    if (stale && !customElements.get('spline-viewer')) stale.remove();

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
      void waitForViewerDefinition().then(resolve).catch(fail);
    };
    script.onerror = () => fail(new Error('Spline viewer failed to load'));
    document.head.appendChild(script);
  });

  return win.__summecaSplineViewerPromise;
}

export default function SplineRobotScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const host = hostRef.current;
    let cancelled = false;
    let retryTimer: number | undefined;

    const mountScene = async (attempt = 0) => {
      try {
        await loadSplineViewer();
        if (cancelled) return;

        host.replaceChildren();
        host.dataset.splineStatus = attempt === 0 ? 'loading' : 'retrying';

        const viewer = document.createElement('spline-viewer');
        viewer.setAttribute('url', new URL(SCENE_URL, window.location.origin).toString());
        viewer.setAttribute('events-target', 'global');
        viewer.setAttribute('loading', 'eager');
        viewer.setAttribute('loading-anim-type', 'spinner-small-light');
        viewer.setAttribute('background', 'transparent');
        viewer.setAttribute('aria-hidden', 'true');

        Object.assign(viewer.style, {
          position: 'absolute',
          inset: '0',
          display: 'block',
          width: '100%',
          height: '100%',
          minHeight: '100%',
          background: 'transparent',
          pointerEvents: 'auto',
          touchAction: 'pan-y',
        });

        viewer.addEventListener('load-complete', () => {
          host.dataset.splineStatus = 'ready';
        }, { once: true });

        viewer.addEventListener('context-loss', () => {
          if (cancelled) return;
          host.dataset.splineStatus = 'context-lost';
          host.replaceChildren();
          if (attempt < 2) {
            retryTimer = window.setTimeout(() => void mountScene(attempt + 1), 900);
          }
        }, { once: true });

        host.appendChild(viewer);
      } catch {
        if (cancelled) return;
        host.dataset.splineStatus = 'error';
        host.replaceChildren();
        if (attempt < 2) {
          retryTimer = window.setTimeout(() => void mountScene(attempt + 1), 900 * (attempt + 1));
        }
      }
    };

    void mountScene();

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      host.replaceChildren();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <div ref={hostRef} className="absolute inset-0 z-[2] bg-transparent" />
    </div>
  );
}
