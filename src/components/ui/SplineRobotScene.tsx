'use client';

import { useEffect, useRef } from 'react';

const SCENE_URL = 'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode';
const VIEWER_SCRIPT = 'https://cdn.spline.design/@splinetool/viewer@2.0.46/build/spline-viewer.js';

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

function loadSplineViewer() {
  const win = window as WindowWithSpline;
  if (customElements.get('spline-viewer')) return Promise.resolve();
  if (win.__summecaSplineViewerPromise) return win.__summecaSplineViewerPromise;

  win.__summecaSplineViewerPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-summeca-spline-src="${VIEWER_SCRIPT}"]`);

    if (existing) {
      void waitForViewerDefinition().then(resolve).catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = VIEWER_SCRIPT;
    script.dataset.summecaSplineSrc = VIEWER_SCRIPT;
    script.onload = () => {
      void waitForViewerDefinition().then(resolve).catch(reject);
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('Failed to load Spline viewer'));
    };
    document.head.appendChild(script);
  }).catch((error) => {
    win.__summecaSplineViewerPromise = undefined;
    throw error;
  });

  return win.__summecaSplineViewerPromise;
}

function waitForScene(viewer: HTMLElement, timeoutMs = 12000) {
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

export default function SplineRobotScene({ zoomScale: _zoomScale = 1 }: SplineRobotSceneProps) {
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
      } catch {
        if (!cancelled) host.dataset.splineStatus = 'viewer-script-error';
        return;
      }

      host.replaceChildren();
      host.dataset.splineStatus = 'scene-loading-remote';

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
        pointerEvents: 'none',
        touchAction: 'pan-y',
        opacity: '0',
        transition: 'opacity 350ms ease',
      });

      const sceneReady = waitForScene(viewer);
      host.appendChild(viewer);

      try {
        await sceneReady;
        if (cancelled) return;
        viewer.style.pointerEvents = 'auto';
        viewer.style.opacity = '1';
        host.dataset.splineStatus = 'ready-remote';
      } catch {
        if (cancelled) return;
        viewer.remove();
        viewer = undefined;
        host.dataset.splineStatus = 'scene-error';
      }
    };

    void mountSpline();

    return () => {
      cancelled = true;
      viewer?.remove();
      try { host.replaceChildren(); } catch { /* host may already be detached */ }
    };
  }, []);

  return <div ref={hostRef} className="relative h-full w-full overflow-hidden bg-transparent" />;
}
