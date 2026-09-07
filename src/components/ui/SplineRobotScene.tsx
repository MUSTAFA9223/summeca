'use client';

import { useEffect, useRef, useState } from 'react';

const SCENE_URL = 'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode';
const VIEWER_SCRIPT = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';

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

function StaticFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <img
        src="/assets/images/summeca-robot.webp"
        alt=""
        className="h-[82%] w-auto object-contain opacity-95 drop-shadow-[0_28px_48px_rgba(0,0,0,0.32)]"
        aria-hidden="true"
      />
    </div>
  );
}

export default function SplineRobotScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [sceneVisible, setSceneVisible] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const deviceMemory = (navigator as NavigatorWithDeviceMemory).deviceMemory;
    const veryLowMemory = typeof deviceMemory === 'number' && deviceMemory <= 2;
    const shouldEnable = !reducedMotion && !veryLowMemory;

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
          viewer.style.background = 'transparent';
          viewer.style.pointerEvents = 'auto';
          viewer.style.touchAction = 'pan-y';
          host.appendChild(viewer);

          revealTimer = window.setTimeout(() => setSceneVisible(true), 650);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        mountScene();
      },
      { rootMargin: '180px', threshold: 0.01 },
    );

    observer.observe(host);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (revealTimer !== undefined) window.clearTimeout(revealTimer);
      host.replaceChildren();
    };
  }, []);

  if (!enabled || failed) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-transparent">
        <StaticFallback />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <div
        ref={hostRef}
        className={`absolute inset-0 bg-transparent transition-opacity duration-500 ${
          sceneVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
