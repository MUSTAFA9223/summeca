'use client';

import { useEffect, useRef } from 'react';

const SCENE_URL = 'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode';
const VIEWER_SCRIPT = 'https://unpkg.com/@splinetool/viewer@2.0.42/build/spline-viewer.js';
const RUNTIME_URL = 'https://unpkg.com/@splinetool/runtime@2.0.42/build/runtime.js';

type SplineRobotSceneProps = {
  zoomScale?: number;
};

type SplineApplication = {
  load: (url: string) => Promise<void>;
  setZoom: (zoom: number) => void;
  setBackgroundColor?: (color: string) => void;
  setGlobalEvents?: (global: boolean) => void;
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
    const timer = window.setTimeout(() => reject(new Error('Spline viewer definition timed out')), timeoutMs);
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

    script.onload = () => { void waitForViewerDefinition().then(resolve).catch(fail); };
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
      else {
        win.__summecaSplineRuntimePromise = undefined;
        reject(new Error('Spline runtime loaded without Application'));
      }
    };
    const handleError = () => {
      cleanup();
      win.__summecaSplineRuntimePromise = undefined;
      reject(new Error('Spline runtime failed to load'));
    };

    window.addEventListener(readyEvent, handleReady, { once: true });
    window.addEventListener(errorEvent, handleError, { once: true });

    const source = `
      import { Application } from '${RUNTIME_URL}';
      window.__summecaSplineApplication = Application;
      window.dispatchEvent(new Event('${readyEvent}'));
    `;
    const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    const script = document.createElement('script');
    script.type = 'module';
    script.dataset.summecaSplineRuntime = 'true';
    script.src = blobUrl;
    script.onload = () => URL.revokeObjectURL(blobUrl);
    script.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      window.dispatchEvent(new Event(errorEvent));
    };
    document.head.appendChild(script);
  });

  return win.__summecaSplineRuntimePromise;
}

export default function SplineRobotScene({ zoomScale = 1 }: SplineRobotSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const host = hostRef.current;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const compactViewport = window.matchMedia('(max-width: 900px)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const preferRuntimeCanvas = coarsePointer || compactViewport;

    let cancelled = false;
    let retryTimer: number | undefined;
    let app: SplineApplication | undefined;

    const clearHost = () => {
      try { app?.stop?.(); } catch { /* third-party runtime cleanup */ }
      try { app?.dispose?.(); } catch { /* third-party runtime cleanup */ }
      app = undefined;
      try { host.replaceChildren(); } catch { /* host may already be detached */ }
    };

    const scheduleRetry = (attempt: number, mount: (nextAttempt: number) => Promise<void>) => {
      if (cancelled || attempt >= 3) return;
      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        void mount(attempt + 1);
      }, 900 * (attempt + 1));
    };

    const mountRuntime = async (attempt = 0) => {
      try {
        const Application = await loadSplineRuntime();
        if (cancelled) return;

        clearHost();
        const canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        Object.assign(canvas.style, {
          position: 'absolute', inset: '0', display: 'block', width: '100%', height: '100%',
          background: 'transparent', pointerEvents: 'auto', touchAction: 'pan-y', opacity: '0',
          transition: reducedMotion ? 'none' : 'opacity 320ms ease',
          filter: 'saturate(1.5) contrast(1.09) brightness(1.02)',
        });
        host.replaceChildren(canvas);

        const nextApp = new Application(canvas);
        app = nextApp;
        const width = window.innerWidth;
        const runtimeZoom = width < 640 ? 0.24 : width < 1024 ? 0.28 : width < 1440 ? 0.3 : 0.32;

        nextApp.setZoom(runtimeZoom);
        await nextApp.load(SCENE_URL);
        if (cancelled) {
          try { nextApp.stop?.(); } catch { /* cleanup */ }
          try { nextApp.dispose?.(); } catch { /* cleanup */ }
          return;
        }

        nextApp.setBackgroundColor?.('rgba(0, 0, 0, 0)');
        nextApp.setGlobalEvents?.(true);
        nextApp.setZoom(runtimeZoom);
        canvas.style.opacity = '1';

        canvas.addEventListener('webglcontextlost', (event) => {
          event.preventDefault();
          if (cancelled) return;
          clearHost();
          scheduleRetry(0, mountRuntime);
        }, { once: true });
      } catch {
        if (cancelled) return;
        clearHost();
        scheduleRetry(attempt, mountRuntime);
      }
    };

    const mountViewer = async (attempt = 0) => {
      try {
        await loadSplineViewer();
        if (cancelled) return;

        clearHost();
        const viewer = document.createElement('spline-viewer');
        viewer.setAttribute('url', SCENE_URL);
        viewer.setAttribute('loading', 'eager');
        viewer.setAttribute('background', 'transparent');
        viewer.setAttribute('aria-hidden', 'true');
        viewer.setAttribute('events-target', 'global');

        Object.assign(viewer.style, {
          display: 'block', width: '100%', height: '100%', minHeight: '100%', background: 'transparent',
          pointerEvents: 'auto', touchAction: 'pan-y', transform: `scale(${zoomScale})`, transformOrigin: 'center center',
          filter: 'saturate(1.5) contrast(1.09) brightness(1.02)', willChange: 'transform',
        });

        viewer.addEventListener('context-loss', () => {
          if (cancelled) return;
          clearHost();
          void mountRuntime();
        }, { once: true });

        host.replaceChildren(viewer);
      } catch {
        if (cancelled) return;
        clearHost();
        if (attempt < 1) scheduleRetry(attempt, mountViewer);
        else void mountRuntime();
      }
    };

    const mountPreferredScene = async () => {
      if (preferRuntimeCanvas) await mountRuntime();
      else await mountViewer();
    };

    void mountPreferredScene();

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      clearHost();
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
