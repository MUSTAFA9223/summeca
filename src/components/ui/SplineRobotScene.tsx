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
      if (customElements.get('spline-viewer')) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Spline viewer failed to load')), { once: true });
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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const deviceMemory = (navigator as NavigatorWithDeviceMemory).deviceMemory;
    const veryLowMemory = typeof deviceMemory === 'number' && deviceMemory <= 1;
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
          viewer.setAttribute('loading', 'eager');
          viewer.setAttribute('loading-anim-type', 'spinner-small-light');
          viewer.setAttribute('background', 'transparent');
          viewer.setAttribute('aria-hidden', 'true');
          viewer.style.display = 'block';
          viewer.style.width = '100%';
          viewer.style.height = '100%';
          viewer.style.minHeight = '100%';
          viewer.style.background = 'transparent';
          viewer.style.pointerEvents = 'auto';
          viewer.style.touchAction = 'pan-y';
          // Brand-grade the live Spline render so the robot's cyan/teal accents
          // harmonize with SUMMECA's #08c5d1 -> #0aaebd headline gradient.
          // This preserves the scene geometry, motion and pointer interactions.
          viewer.style.filter = 'saturate(1.5) contrast(1.09) brightness(1.02)';
          host.appendChild(viewer);

          // Match the original working implementation: reveal the live viewer
          // shortly after mounting instead of waiting for a lifecycle event.
          revealTimer = window.setTimeout(() => {
            if (!cancelled) {
              setSceneVisible(true);
              setFailed(false);
            }
          }, 700);
        })
        .catch(() => {
          if (!cancelled) {
            setFailed(true);
            setSceneVisible(false);
          }
        });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        mountScene();
      },
      { rootMargin: '240px', threshold: 0.01 },
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
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <img
        src={FALLBACK_IMAGE}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-contain object-center transition-opacity duration-500 ${
          enabled && sceneVisible && !failed ? 'opacity-0' : 'opacity-100'
        }`}
      />

      <div
        className={`pointer-events-none absolute inset-0 z-[1] transition-opacity duration-500 ${
          enabled && sceneVisible && !failed ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-[46%] h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#08c5d1]/12 blur-[64px]" />
        <div className="absolute left-1/2 top-[52%] h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0aaebd]/10 blur-[46px]" />
      </div>

      <div
        ref={hostRef}
        className={`absolute inset-0 z-[2] bg-transparent transition-opacity duration-500 ${
          enabled && sceneVisible && !failed ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
