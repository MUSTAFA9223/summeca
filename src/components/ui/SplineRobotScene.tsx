'use client';

import { useEffect, useRef, useState } from 'react';

const SCENE_URL = '/assets/spline/summeca-robot.splinecode';
const VIEWER_SCRIPT = 'https://unpkg.com/@splinetool/viewer@2.0.44/build/spline-viewer.js';
const RUNTIME_SCRIPT = 'https://unpkg.com/@splinetool/runtime@2.0.44/build/runtime.js';
const FALLBACK_IMAGE = '/assets/images/summeca-robot.webp';

type SplineApplication = {
  load: (url: string) => Promise<void>;
  setZoom: (zoom: number) => void;
  setGlobalEvents?: (enabled: boolean) => void;
  stop?: () => void;
  dispose?: () => void;
};

type SplineApplicationConstructor = new (canvas: HTMLCanvasElement) => SplineApplication;

type WindowWithSpline = Window & {
  __summecaSplineViewerPromise?: Promise<void>;
  __summecaSplineRuntimePromise?: Promise<SplineApplicationConstructor>;
  __summecaSplineApplication?: SplineApplicationConstructor;
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
  const win = window as WindowWithSpline;
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

function loadSplineRuntime() {
  const win = window as WindowWithSpline;
  if (win.__summecaSplineApplication) return Promise.resolve(win.__summecaSplineApplication);
  if (win.__summecaSplineRuntimePromise) return win.__summecaSplineRuntimePromise;

  win.__summecaSplineRuntimePromise = new Promise<SplineApplicationConstructor>((resolve, reject) => {
    const readyEvent = 'summeca-spline-runtime-ready';
    const errorEvent = 'summeca-spline-runtime-error';

    const cleanup = () => {
      window.removeEventListener(readyEvent, handleReady);
      window.removeEventListener(errorEvent, handleError);
    };

    const handleReady = () => {
      cleanup();
      if (win.__summecaSplineApplication) resolve(win.__summecaSplineApplication);
      else reject(new Error('Spline runtime loaded without Application'));
    };

    const handleError = () => {
      cleanup();
      win.__summecaSplineRuntimePromise = undefined;
      reject(new Error('Spline runtime failed to load'));
    };

    window.addEventListener(readyEvent, handleReady, { once: true });
    window.addEventListener(errorEvent, handleError, { once: true });

    const source = `
      import { Application } from '${RUNTIME_SCRIPT}';
      window.__summecaSplineApplication = Application;
      window.dispatchEvent(new Event('${readyEvent}'));
    `;
    const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    const script = document.createElement('script');
    script.type = 'module';
    script.dataset.summecaSplineRuntime = 'true';
    script.src = blobUrl;
    script.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      window.dispatchEvent(new Event(errorEvent));
    };
    script.onload = () => URL.revokeObjectURL(blobUrl);
    document.head.appendChild(script);
  });

  return win.__summecaSplineRuntimePromise;
}

function disposeSpline(app: SplineApplication | undefined) {
  if (!app) return;
  try { app.stop?.(); } catch { /* third-party runtime cleanup */ }
  try { app.dispose?.(); } catch { /* third-party runtime cleanup */ }
}

export default function SplineRobotScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;

    const host = hostRef.current;
    const sceneUrl = new URL(SCENE_URL, window.location.origin).toString();
    let cancelled = false;
    let retryTimer: number | undefined;
    let fallbackTimer: number | undefined;
    let app: SplineApplication | undefined;

    const clearTimers = () => {
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      retryTimer = undefined;
      fallbackTimer = undefined;
    };

    const mountRuntime = async (attempt = 0) => {
      clearTimers();
      disposeSpline(app);
      app = undefined;
      host.replaceChildren();
      setReady(false);
      host.dataset.splineStatus = attempt === 0 ? 'runtime-loading' : 'runtime-retrying';

      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      Object.assign(canvas.style, {
        position: 'absolute',
        inset: '0',
        display: 'block',
        width: '100%',
        height: '100%',
        background: 'transparent',
        pointerEvents: 'auto',
        touchAction: 'pan-y',
        opacity: '0',
        transition: 'opacity 300ms ease',
      });
      host.appendChild(canvas);

      try {
        const Application = await loadSplineRuntime();
        if (cancelled) return;

        const nextApp = new Application(canvas);
        app = nextApp;
        await nextApp.load(sceneUrl);
        if (cancelled) {
          disposeSpline(nextApp);
          return;
        }

        nextApp.setGlobalEvents?.(true);
        nextApp.setZoom(window.innerWidth < 768 ? 0.7 : 0.76);
        canvas.style.opacity = '1';
        setReady(true);
        host.dataset.splineStatus = 'ready-runtime';
      } catch {
        disposeSpline(app);
        app = undefined;
        if (cancelled) return;
        host.replaceChildren();
        host.dataset.splineStatus = 'runtime-error';
        if (attempt < 1) {
          retryTimer = window.setTimeout(() => void mountRuntime(attempt + 1), 1000);
        }
      }
    };

    const mountViewer = async () => {
      try {
        await loadSplineViewer();
        if (cancelled) return;

        host.replaceChildren();
        host.dataset.splineStatus = 'viewer-loading';

        const viewer = document.createElement('spline-viewer');
        viewer.setAttribute('url', sceneUrl);
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

        let viewerFinished = false;
        const useRuntime = () => {
          if (cancelled || viewerFinished) return;
          viewerFinished = true;
          void mountRuntime();
        };

        viewer.addEventListener('load-complete', () => {
          if (cancelled || viewerFinished) return;
          viewerFinished = true;
          if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
          fallbackTimer = undefined;
          setReady(true);
          host.dataset.splineStatus = 'ready-viewer';
        }, { once: true });

        viewer.addEventListener('context-loss', useRuntime, { once: true });
        viewer.addEventListener('error', useRuntime, { once: true });
        host.appendChild(viewer);

        fallbackTimer = window.setTimeout(useRuntime, 10000);
      } catch {
        if (!cancelled) void mountRuntime();
      }
    };

    void mountViewer();

    return () => {
      cancelled = true;
      clearTimers();
      disposeSpline(app);
      app = undefined;
      host.replaceChildren();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-[1] bg-contain bg-center bg-no-repeat transition-opacity duration-300 motion-reduce:transition-none ${ready ? 'opacity-0' : 'opacity-100'}`}
        style={{ backgroundImage: `url(${FALLBACK_IMAGE})` }}
      />
      <div ref={hostRef} className="absolute inset-0 z-[2] bg-transparent" />
    </div>
  );
}
