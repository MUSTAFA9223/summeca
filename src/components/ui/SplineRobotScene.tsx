'use client';

import { useEffect, useRef } from 'react';

const SCENE_URLS = [
  '/assets/spline/summeca-robot.splinecode',
  'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode',
] as const;

// This is the viewer generation used by the original interactive robot implementation.
const VIEWER_SCRIPT = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';

type WindowWithSpline = Window & {
  __summecaOriginalSplineViewerPromise?: Promise<void>;
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

function loadOriginalSplineViewer() {
  const win = window as WindowWithSpline;
  if (customElements.get('spline-viewer')) return Promise.resolve();
  if (win.__summecaOriginalSplineViewerPromise) return win.__summecaOriginalSplineViewerPromise;

  win.__summecaOriginalSplineViewerPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-summeca-original-spline-viewer]');

    if (existing) {
      void waitForViewerDefinition().then(resolve).catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = VIEWER_SCRIPT;
    script.dataset.summecaOriginalSplineViewer = 'true';
    script.onload = () => {
      void waitForViewerDefinition().then(resolve).catch(reject);
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('Original Spline viewer failed to load'));
    };
    document.head.appendChild(script);
  }).catch((error) => {
    win.__summecaOriginalSplineViewerPromise = undefined;
    throw error;
  });

  return win.__summecaOriginalSplineViewerPromise;
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

  useEffect(() => {
    if (!hostRef.current) return;

    const host = hostRef.current;
    let cancelled = false;
    let activeViewer: HTMLElement | undefined;

    const mount = async () => {
      host.dataset.splineStatus = 'original-viewer-loading';

      try {
        await loadOriginalSplineViewer();
        if (cancelled) return;
      } catch {
        if (!cancelled) host.dataset.splineStatus = 'original-viewer-error';
        return;
      }

      for (const sceneUrl of SCENE_URLS) {
        if (cancelled) return;

        host.replaceChildren();
        host.dataset.splineStatus = sceneUrl.startsWith('/')
          ? 'original-scene-loading-local'
          : 'original-scene-loading-remote';

        const viewer = document.createElement('spline-viewer');
        activeViewer = viewer;
        viewer.setAttribute('url', new URL(sceneUrl, window.location.origin).toString());
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
          opacity: '1',
        });

        const sceneReady = waitForScene(viewer);
        host.appendChild(viewer);

        try {
          await sceneReady;
          if (cancelled) return;
          host.dataset.splineStatus = sceneUrl.startsWith('/')
            ? 'original-ready-local'
            : 'original-ready-remote';
          return;
        } catch {
          if (cancelled) return;
          viewer.remove();
          activeViewer = undefined;
        }
      }

      if (!cancelled) host.dataset.splineStatus = 'original-scene-error';
    };

    void mount();

    return () => {
      cancelled = true;
      activeViewer?.remove();
      try {
        host.replaceChildren();
      } catch {
        // The host can already be detached during route changes.
      }
    };
  }, []);

  return <div ref={hostRef} className="absolute inset-0 h-full w-full bg-transparent" />;
}
