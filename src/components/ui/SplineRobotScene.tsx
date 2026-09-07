'use client';

import { useEffect, useRef, useState } from 'react';

const SCENE_URL = 'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode';
const VIEWER_SCRIPT = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';
const ROBOT_FALLBACK =
  'data:image/webp;base64,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';

type NavigatorWithDeviceMemory = Navigator & { deviceMemory?: number };
type WindowWithSplinePromise = Window & { __summecaSplineViewerPromise?: Promise<void> };

function loadSplineViewer() {
  const win = window as WindowWithSplinePromise;
  if (customElements.get('spline-viewer')) return Promise.resolve();
  if (win.__summecaSplineViewerPromise) return win.__summecaSplineViewerPromise;

  win.__summecaSplineViewerPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-summeca-spline-viewer]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Spline viewer failed to load')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = VIEWER_SCRIPT;
    script.dataset.summecaSplineViewer = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Spline viewer failed to load'));
    document.head.appendChild(script);
  });

  return win.__summecaSplineViewerPromise;
}

export default function SplineRobotScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [sceneVisible, setSceneVisible] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const deviceMemory = (navigator as NavigatorWithDeviceMemory).deviceMemory;
    const lowMemory = typeof deviceMemory === 'number' && deviceMemory <= 4;

    // Keep phones/tablets and lower-memory devices on the lightweight still image.
    // Desktop-capable devices receive the full interactive Spline scene.
    const shouldEnable = !reducedMotion && !mobile && !coarsePointer && !lowMemory;
    setEnabled(shouldEnable);
    if (!shouldEnable || !hostRef.current) return;

    let cancelled = false;
    let revealTimer: number | undefined;
    let idleHandle: number | undefined;

    const mountScene = () => {
      const start = () => {
        loadSplineViewer()
          .then(() => {
            if (cancelled || !hostRef.current) return;

            hostRef.current.replaceChildren();
            const viewer = document.createElement('spline-viewer');
            viewer.setAttribute('url', SCENE_URL);
            viewer.setAttribute('events-target', 'global');
            viewer.setAttribute('loading', 'lazy');
            viewer.setAttribute('background', 'transparent');
            viewer.setAttribute('aria-hidden', 'true');
            viewer.style.display = 'block';
            viewer.style.width = '100%';
            viewer.style.height = '100%';
            viewer.style.minHeight = '100%';
            viewer.style.pointerEvents = 'auto';
            hostRef.current.appendChild(viewer);

            // Fade from the supplied robot still into the real-time scene once
            // the viewer has had enough time to initialize its renderer.
            revealTimer = window.setTimeout(() => setSceneVisible(true), 900);
          })
          .catch(() => {
            setSceneVisible(false);
          });
      };

      if ('requestIdleCallback' in window) {
        idleHandle = window.requestIdleCallback(start, { timeout: 900 });
      } else {
        revealTimer = window.setTimeout(start, 120);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        mountScene();
      },
      { rootMargin: '180px', threshold: 0.01 }
    );

    observer.observe(hostRef.current);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (revealTimer) window.clearTimeout(revealTimer);
      if (idleHandle !== undefined && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleHandle);
      }
      hostRef.current?.replaceChildren();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${
          enabled && sceneVisible ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ backgroundImage: `url(${ROBOT_FALLBACK})` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(8,197,209,0.08),transparent_44%)]" />
      <div
        ref={hostRef}
        className={`absolute inset-0 transition-opacity duration-700 ${
          enabled && sceneVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
