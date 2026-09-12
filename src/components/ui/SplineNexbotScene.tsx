'use client';

import { useEffect, useRef, useState } from 'react';

const NEXBOT_SCENE_URL = 'https://prod.spline.design/BAodEVjHSYLR1KKy/scene.splinecode';
const VIEWER_SCRIPTS = [
  'https://cdn.spline.design/@splinetool/viewer@2.0.44/build/spline-viewer.js',
  'https://unpkg.com/@splinetool/viewer@2.0.44/build/spline-viewer.js',
] as const;

const VIEWER_TAG = 'spline-viewer';
const SCRIPT_ID = 'summeca-spline-viewer-runtime';

type SplineNexbotSceneProps = {
  className?: string;
  interactive?: boolean;
};

export default function SplineNexbotScene({
  className = '',
  interactive = true,
}: SplineNexbotSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    let viewer: HTMLElement | null = null;
    let script: HTMLScriptElement | null = null;
    let scriptIndex = 0;

    const mountViewer = () => {
      if (disposed || !hostRef.current || !customElements.get(VIEWER_TAG)) return;

      hostRef.current.replaceChildren();
      viewer = document.createElement(VIEWER_TAG);
      viewer.setAttribute('url', NEXBOT_SCENE_URL);
      viewer.setAttribute('loading', 'eager');
      viewer.setAttribute('renderer', 'webgl');
      viewer.setAttribute('events-target', 'global');
      viewer.style.display = 'block';
      viewer.style.width = '100%';
      viewer.style.height = '100%';
      viewer.style.touchAction = 'pan-y';
      viewer.style.pointerEvents = interactive ? 'auto' : 'none';

      const markReady = () => setReady(true);
      viewer.addEventListener('load-complete', markReady, { once: true });
      hostRef.current.appendChild(viewer);
    };

    const loadRuntime = () => {
      if (customElements.get(VIEWER_TAG)) {
        mountViewer();
        return;
      }

      const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', mountViewer, { once: true });
        return;
      }

      const tryNextScript = () => {
        if (scriptIndex >= VIEWER_SCRIPTS.length || disposed) return;
        script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.type = 'module';
        script.src = VIEWER_SCRIPTS[scriptIndex++];
        script.async = true;
        script.addEventListener('load', mountViewer, { once: true });
        script.addEventListener(
          'error',
          () => {
            script?.remove();
            script = null;
            tryNextScript();
          },
          { once: true },
        );
        document.head.appendChild(script);
      };

      tryNextScript();
    };

    loadRuntime();

    return () => {
      disposed = true;
      viewer?.remove();
    };
  }, [interactive]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className}`}
      data-spline-scene="nexbot"
      data-spline-ready={ready ? 'true' : 'false'}
    >
      <div
        ref={hostRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300" />
        </div>
      )}
    </div>
  );
}
