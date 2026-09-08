'use client';

import { useEffect, useRef, useState } from 'react';

const SCENE_URL = 'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode';
const RUNTIME_URL = 'https://unpkg.com/@splinetool/runtime@1.9.82/build/runtime.js';

type SplineApplication = {
  load: (url: string) => Promise<void>;
  setZoom: (zoom: number) => void;
  setBackgroundColor: (color: string) => void;
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
      if (win.__summecaSplineApplication) resolve(win.__summecaSplineApplication);
      else reject(new Error('Spline runtime loaded without Application'));
    };
    const handleError = () => {
      cleanup();
      reject(new Error('Spline runtime failed to load'));
    };

    window.addEventListener(readyEvent, handleReady, { once: true });
    window.addEventListener(errorEvent, handleError, { once: true });

    const source = `import { Application } from '${RUNTIME_URL}'; window.__summecaSplineApplication = Application; window.dispatchEvent(new Event('${readyEvent}'));`;
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

export default function SplineRobotScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;

    const host = hostRef.current;
    let cancelled = false;
    let app: SplineApplication | undefined;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      display: 'block',
      width: '100%',
      height: '100%',
      background: 'transparent',
      pointerEvents: 'auto',
      touchAction: 'pan-y',
      filter: 'saturate(1.5) contrast(1.09) brightness(1.02)',
      opacity: '0',
      transition: 'opacity 420ms ease',
    });
    host.replaceChildren(canvas);

    const mount = async () => {
      try {
        const Application = await loadSplineRuntime();
        if (cancelled) return;

        app = new Application(canvas);

        // IMPORTANT: Spline's setZoom is an initial camera framing control.
        // Apply it before load so production actually starts zoomed out enough
        // to include the complete legs and feet. Calling only after load can be ignored.
        const width = window.innerWidth;
        const zoom = width < 640 ? 0.24 : width < 1024 ? 0.28 : width < 1440 ? 0.3 : 0.32;
        app.setZoom(zoom);

        await app.load(SCENE_URL);
        if (cancelled) {
          app.stop?.();
          app.dispose?.();
          return;
        }

        app.setBackgroundColor('rgba(0, 0, 0, 0)');
        app.setGlobalEvents?.(true);

        // Re-apply once loaded for runtime versions that support live zoom changes.
        app.setZoom(zoom);

        canvas.style.opacity = '1';
        setReady(true);
      } catch {
        if (!cancelled) setReady(false);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        void mount();
      },
      { rootMargin: '260px', threshold: 0.01 },
    );

    observer.observe(host);

    return () => {
      cancelled = true;
      observer.disconnect();
      app?.stop?.();
      app?.dispose?.();
      host.replaceChildren();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
          ready ? 'opacity-100' : 'opacity-70'
        }`}
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
