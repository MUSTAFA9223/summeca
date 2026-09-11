'use client';

import { useEffect, useRef } from 'react';

const SCENE_URL = 'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode';
const VIEWER_SCRIPTS = [
  'https://cdn.spline.design/@splinetool/viewer@2.0.46/build/spline-viewer.js',
  'https://unpkg.com/@splinetool/viewer@2.0.46/build/spline-viewer.js',
] as const;

type SplineRobotSceneProps = {
  zoomScale?: number;
};

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
      if (customElements.get('spline-viewer')) {
        resolve();
        return;
      }
      void waitForViewerDefinition().then(resolve).catch(reject);
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

export default function SplineRobotScene({ zoomScale = 1 }: SplineRobotSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    const host = hostRef.current;
    let cancelled = false;
    let viewer: HTMLElement | undefined;

    const mountSpline = async () => {
      host.dataset.splineStatus = 'viewer-script-loading';

      try {
        await loadSplineViewer();
        if (cancelled) return;

        viewer = document.createElement('spline-viewer');
        viewer.setAttribute('url', SCENE_URL);
        viewer.setAttribute('events-target', 'global');
        viewer.setAttribute('loading', 'eager');
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
          transform: `scale(${Math.max(0.8, Math.min(1.12, zoomScale))})`,
          transformOrigin: 'center center',
        });

        host.replaceChildren(viewer);
        host.dataset.splineStatus = 'ready-remote';
      } catch {
        if (!cancelled) {
          host.replaceChildren();
          host.dataset.splineStatus = 'remote-scene-error';
        }
      }
    };

    void mountSpline();

    return () => {
      cancelled = true;
      viewer?.remove();
      try { host.replaceChildren(); } catch { /* host may already be detached */ }
    };
  }, [zoomScale]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <div ref={hostRef} className="absolute inset-0 bg-transparent" />
    </div>
  );
}
