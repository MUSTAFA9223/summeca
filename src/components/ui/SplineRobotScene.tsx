'use client';

import { useEffect, useRef, useState } from 'react';

const SCENE_URL = 'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode';
const VIEWER_SCRIPT = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';
const FALLBACK_IMAGE = '/assets/images/summeca-robot.webp';

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
    const shouldEnable = !reducedMotion && !mobile && !coarsePointer && !lowMemory;

    setEnabled(shouldEnable);
    if (!shouldEnable || !hostRef.current) return;

    const host = hostRef.current;
    let cancelled = false;
    let revealTimer: number | undefined;

    const mountScene = () => {
      loadSplineViewer()
        .then(() => {
          if (cancelled) return;

          host.replaceChildren();
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
          host.appendChild(viewer);

          revealTimer = window.setTimeout(() => setSceneVisible(true), 900);
        })
        .catch(() => setSceneVisible(false));
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        mountScene();
      },
      { rootMargin: '180px', threshold: 0.01 }
    );

    observer.observe(host);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (revealTimer !== undefined) window.clearTimeout(revealTimer);
      host.replaceChildren();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <img
        src={FALLBACK_IMAGE}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ${
          enabled && sceneVisible ? 'opacity-0' : 'opacity-100'
        }`}
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
