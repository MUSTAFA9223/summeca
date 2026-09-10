'use client';

import { useEffect, useRef, useState } from 'react';

const SCENE_URL = 'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode';
const RUNTIME_URL = 'https://unpkg.com/@splinetool/runtime@1.12.97/build/runtime.js';

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

type WindowWithSplineRuntime = Window & {
  __summecaSplineRuntimePromise?: Promise<SplineApplicationConstructor>;
  __summecaSplineApplication?: SplineApplicationConstructor;
};

function loadSplineRuntime() {
  const win = window as WindowWithSplineRuntime;
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
      if (win.__summecaSplineApplication) {
        resolve(win.__summecaSplineApplication);
      } else {
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

function safelyDisposeSpline(app: SplineApplication | undefined) {
  if (!app) return;
  try { app.stop?.(); } catch { /* third-party runtime cleanup */ }
  try { app.dispose?.(); } catch { /* third-party runtime cleanup */ }
}

export default function SplineRobotScene({ zoomScale = 1 }: SplineRobotSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;

    const host = hostRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cancelled = false;
    let app: SplineApplication | undefined;
    let retryTimer: number | undefined;

    const clearHost = () => {
      safelyDisposeSpline(app);
      app = undefined;
      try { host.replaceChildren(); } catch { /* host may already be detached */ }
    };

    const mount = async (attempt = 0) => {
      if (cancelled) return;
      host.dataset.splineStatus = attempt === 0 ? 'loading' : 'retrying';

      try {
        const Application = await loadSplineRuntime();
        if (cancelled) return;

        clearHost();
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
          transition: reducedMotion ? 'none' : 'opacity 320ms ease',
          filter: 'saturate(1.5) contrast(1.09) brightness(1.02)',
          transform: `scale(${zoomScale})`,
          transformOrigin: 'center center',
        });
        host.replaceChildren(canvas);

        const nextApp = new Application(canvas);
        app = nextApp;
        const width = window.innerWidth;
        const runtimeZoom = width < 480 ? 0.24 : width < 768 ? 0.28 : width < 1024 ? 0.3 : width < 1440 ? 0.32 : 0.34;

        nextApp.setZoom(runtimeZoom);
        await nextApp.load(SCENE_URL);
        if (cancelled) {
          safelyDisposeSpline(nextApp);
          return;
        }

        nextApp.setBackgroundColor?.('rgba(0, 0, 0, 0)');
        nextApp.setGlobalEvents?.(true);
        nextApp.setZoom(runtimeZoom);
        canvas.style.opacity = '1';
        host.dataset.splineStatus = 'ready';
        setReady(true);

        canvas.addEventListener('webglcontextlost', (event) => {
          event.preventDefault();
          if (cancelled) return;
          host.dataset.splineStatus = 'context-lost';
          setReady(false);
          clearHost();
          retryTimer = window.setTimeout(() => void mount(1), 800);
        }, { once: true });
      } catch {
        if (cancelled) return;
        setReady(false);
        host.dataset.splineStatus = 'error';
        clearHost();
        if (attempt < 3) {
          retryTimer = window.setTimeout(() => void mount(attempt + 1), 900 * (attempt + 1));
        }
      }
    };

    void mount();

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      clearHost();
    };
  }, [zoomScale]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <div
        className={`pointer-events-none absolute inset-0 z-[1] transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-70'}`}
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-[45%] h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#08c5d1]/12 blur-[68px]" />
        <div className="absolute left-1/2 top-[58%] h-[36%] w-[36%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0aaebd]/10 blur-[48px]" />
        <div className="absolute bottom-[2%] left-1/2 h-12 w-[44%] -translate-x-1/2 rounded-[50%] bg-black/20 blur-2xl" />
      </div>
      <div ref={hostRef} className="absolute inset-0 z-[2] bg-transparent" />
    </div>
  );
}
