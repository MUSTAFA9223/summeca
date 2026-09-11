'use client';

import { useEffect, useRef } from 'react';

const SCENE_URL = 'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode';
const VIEWER_SCRIPT = 'https://unpkg.com/@splinetool/viewer/build/spline-viewer.js';

type SplineRobotSceneProps = {
  zoomScale?: number;
};

function ensureSplineViewerScript() {
  if (customElements.get('spline-viewer')) return;

  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-summeca-spline-viewer="true"]',
  );
  if (existing) return;

  const script = document.createElement('script');
  script.type = 'module';
  script.src = VIEWER_SCRIPT;
  script.async = true;
  script.dataset.summecaSplineViewer = 'true';
  document.head.appendChild(script);
}

export default function SplineRobotScene({ zoomScale = 1 }: SplineRobotSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    ensureSplineViewerScript();
    host.replaceChildren();
    host.dataset.splineStatus = 'scene-mounting';

    const viewer = document.createElement('spline-viewer');
    viewer.setAttribute('url', SCENE_URL);
    viewer.setAttribute('events-target', 'global');
    viewer.setAttribute('loading', 'eager');
    viewer.setAttribute('loading-anim-type', 'spinner-small-light');
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
      transform: `scale(${zoomScale})`,
      transformOrigin: 'center center',
    });

    const onLoadStart = () => {
      host.dataset.splineStatus = 'scene-loading-remote';
    };
    const onLoadComplete = () => {
      host.dataset.splineStatus = 'ready-remote';
    };
    const onError = () => {
      host.dataset.splineStatus = 'scene-error';
    };
    const onContextLoss = () => {
      host.dataset.splineStatus = 'context-loss';
    };

    viewer.addEventListener('load-start', onLoadStart);
    viewer.addEventListener('load-complete', onLoadComplete);
    viewer.addEventListener('error', onError);
    viewer.addEventListener('context-loss', onContextLoss);

    // Keep the viewer visible from the moment it is mounted. The previous
    // implementation hid it until a lifecycle event fired, which could leave
    // the robot permanently invisible if that event was missed or delayed.
    host.appendChild(viewer);

    return () => {
      viewer.removeEventListener('load-start', onLoadStart);
      viewer.removeEventListener('load-complete', onLoadComplete);
      viewer.removeEventListener('error', onError);
      viewer.removeEventListener('context-loss', onContextLoss);
      viewer.remove();
    };
  }, [zoomScale]);

  return (
    <div
      ref={hostRef}
      className="relative h-full w-full overflow-hidden bg-transparent"
      data-spline-status="idle"
    />
  );
}
