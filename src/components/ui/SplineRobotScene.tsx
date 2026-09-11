'use client';

import { useEffect, useRef, useState } from 'react';

const SCENE_URL = 'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode';
const RUNTIME_URL = 'https://unpkg.com/@splinetool/runtime@1.9.82/build/runtime.js';

type SplineApplication = {
  load: (url: string) => Promise<void>;
  setZoom: (zoom: number) => void;
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

    const handleReady = () => {
      cleanup();
      if (win.__summecaSplineApplication) resolve(win.__summecaSplineApplication);
      else reject(new Error('Spline runtime loaded without Application'));
    };
    const handleError = () => {
      cleanup();
      reject(new Error('Spline runtime failed to load'));
    };
    const cleanup = () => {
      window.removeEventListener(readyEvent, handleReady);
      window.removeEventListener(errorEvent, handleError);
    };

    window.addEventListener(readyEvent, handleReady, { once: true });
    window.addEventListener(errorEvent, handleError, { once: true });

    const source = `
      import { Application } from '${RUNTIME_URL}';
      window.__summecaSplineApplication = Application;
      window.dispatchEvent(new Event('${readyEvent}'));
    `;
    const blob = new Blob([source], { type: 'text/javascript' });
    const blobUrl = URL.createObjectURL(blob);
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
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.background = 'transparent';
    canvas.style.pointerEvents = 'auto';
    canvas.style.touchAction = 'pan-y';
    canvas.style.filter = 'saturate(1.5) contrast(1.09) brightness(1.02)';
    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 420ms ease';
    host.replaceChildren(canvas);

    const mount = async () => {
      try {
        const Application = await loadSplineRuntime();
        if (cancelled) return;

        app = new Application(canvas);
        await app.load(SCENE_URL);
        if (cancelled) {
          app.stop?.();
          app.dispose?.();
          return;
        }

        const compact = window.matchMedia('(max-width: 767px)').matches;
        app.setZoom(compact ? 0.7 : 0.76);

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
        <div className="absolute left-1/2 top-[48%] h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#08c5d1]/12 blur-[64px]" />
        <div className="absolute left-1/2 top-[54%] h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0aaebd]/10 blur-[46px]" />
      </div>

      <div ref={hostRef} className="absolute inset-0 z-[2] bg-transparent" />
    </div>
  );
}
