'use client';

import { useEffect, useRef, useState } from 'react';

const SCENE_URLS = [
  '/assets/spline/summeca-robot.splinecode',
  'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode',
] as const;

const VIEWER_SCRIPTS = [
  'https://cdn.spline.design/@splinetool/viewer@2.0.44/build/spline-viewer.js',
  'https://unpkg.com/@splinetool/viewer@2.0.44/build/spline-viewer.js',
] as const;

type WindowWithSpline = Window & {
  __summecaSplineViewerPromise?: Promise<void>;
};

function waitForViewerDefinition(timeoutMs = 10000) {
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

function loadModuleScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-summeca-spline-src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = src;
    script.dataset.summecaSplineSrc = src;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(script);
  });
}

function loadSplineViewer() {
  const win = window as WindowWithSpline;
  if (customElements.get('spline-viewer')) return Promise.resolve();
  if (win.__summecaSplineViewerPromise) return win.__summecaSplineViewerPromise;

  win.__summecaSplineViewerPromise = (async () => {
    let lastError: unknown;

    for (const src of VIEWER_SCRIPTS) {
      try {
        await loadModuleScript(src);
        await waitForViewerDefinition();
        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Spline viewer failed to load');
  })().catch((error) => {
    win.__summecaSplineViewerPromise = undefined;
    throw error;
  });

  return win.__summecaSplineViewerPromise;
}

function waitForScene(viewer: HTMLElement, timeoutMs = 15000) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('Spline scene timed out'));
    }, timeoutMs);

    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Spline scene failed to load'));
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      viewer.removeEventListener('load-complete', onReady);
      viewer.removeEventListener('error', onError);
      viewer.removeEventListener('context-loss', onError);
    };

    viewer.addEventListener('load-complete', onReady, { once: true });
    viewer.addEventListener('error', onError, { once: true });
    viewer.addEventListener('context-loss', onError, { once: true });
  });
}

export default function SplineRobotScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;

    const host = hostRef.current;
    let cancelled = false;
    let activeViewer: HTMLElement | undefined;

    const mount = async () => {
      host.dataset.splineStatus = 'viewer-script-loading';
      setReady(false);

      try {
        await loadSplineViewer();
        if (cancelled) return;
      } catch {
        if (!cancelled) host.dataset.splineStatus = 'viewer-script-error';
        return;
      }

      for (const sceneUrl of SCENE_URLS) {
        if (cancelled) return;

        host.replaceChildren();
        host.dataset.splineStatus = sceneUrl.startsWith('/') ? 'scene-loading-local' : 'scene-loading-remote';

        const viewer = document.createElement('spline-viewer');
        activeViewer = viewer;
        viewer.setAttribute('url', new URL(sceneUrl, window.location.origin).toString());
        viewer.setAttribute('events-target', 'global');
        viewer.setAttribute('loading', 'eager');
        viewer.setAttribute('loading-anim-type', 'spinner-small-light');
        viewer.setAttribute('background', 'transparent');
        viewer.setAttribute('renderer', 'webgl');
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
          opacity: '0',
          transition: 'opacity 350ms ease',
        });

        const sceneReady = waitForScene(viewer);
        host.appendChild(viewer);

        try {
          await sceneReady;
          if (cancelled) return;
          viewer.style.opacity = '1';
          host.dataset.splineStatus = sceneUrl.startsWith('/') ? 'ready-local' : 'ready-remote';
          setReady(true);
          return;
        } catch {
          if (cancelled) return;
          viewer.remove();
          activeViewer = undefined;
        }
      }

      if (!cancelled) host.dataset.splineStatus = 'scene-error';
    };

    void mount();

    return () => {
      cancelled = true;
      activeViewer?.remove();
      host.replaceChildren();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none ${
          ready ? 'opacity-0' : 'opacity-100'
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
