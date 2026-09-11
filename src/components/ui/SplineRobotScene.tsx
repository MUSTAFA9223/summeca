'use client';

import { Float, useGLTF } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const SCENE_URLS = [
  '/assets/spline/summeca-robot.splinecode',
  'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode',
] as const;

const VIEWER_SCRIPTS = [
  'https://cdn.spline.design/@splinetool/viewer@2.0.44/build/spline-viewer.js',
  'https://unpkg.com/@splinetool/viewer@2.0.44/build/spline-viewer.js',
] as const;

const MODEL_URL = '/assets/models/summeca-robot.glb';

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

function RobotModel({ compact, zoomScale }: { compact: boolean; zoomScale: number }) {
  const root = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL_URL);

  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = !compact;
      object.receiveShadow = !compact;
      if (Array.isArray(object.material)) {
        object.material = object.material.map((material) => material.clone());
      } else if (object.material) {
        object.material = object.material.clone();
      }
    });
    return clone;
  }, [compact, scene]);

  useFrame(({ pointer, clock }, delta) => {
    if (!root.current) return;

    const t = clock.elapsedTime;
    const idleYaw = Math.sin(t * 0.42) * (compact ? 0.075 : 0.045);
    const idlePitch = Math.sin(t * 0.31) * 0.018;
    const targetYaw = pointer.x * (compact ? 0.24 : 0.34) + idleYaw;
    const targetPitch = -pointer.y * (compact ? 0.065 : 0.1) + idlePitch;

    root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, targetYaw, 4.2, delta);
    root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, targetPitch, 4.2, delta);
    root.current.position.x = THREE.MathUtils.damp(
      root.current.position.x,
      pointer.x * (compact ? 0.1 : 0.18),
      4,
      delta,
    );
    root.current.position.y = (compact ? -0.72 : -0.64) + Math.sin(t * 0.8) * 0.04;
  });

  const scale = (compact ? 0.8 : 0.88) * Math.max(0.8, Math.min(1.1, zoomScale));

  return (
    <Float
      speed={compact ? 0.9 : 1.05}
      rotationIntensity={compact ? 0.045 : 0.08}
      floatIntensity={compact ? 0.08 : 0.12}
    >
      <group ref={root} position={[0, compact ? -0.72 : -0.64, 0]} scale={scale}>
        <primitive object={model} />
      </group>
    </Float>
  );
}

function LocalRobot3D({ zoomScale }: { zoomScale: number }) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, compact ? 0.08 : 0.12, compact ? 9.1 : 8.6], fov: compact ? 37 : 35 }}
      dpr={compact ? [1, 1.15] : [1, 1.5]}
      gl={{ antialias: !compact, alpha: true, powerPreference: 'high-performance' }}
      shadows={!compact}
      style={{ width: '100%', height: '100%', background: 'transparent', touchAction: 'pan-y' }}
    >
      <ambientLight intensity={compact ? 1.35 : 1.2} />
      <directionalLight position={[4, 7, 6]} intensity={compact ? 3.1 : 4.2} color="#d8fbff" />
      <directionalLight position={[-5, 2, 4]} intensity={compact ? 1.7 : 2.2} color="#08c5d1" />
      <pointLight position={[0, 1.5, 4]} intensity={compact ? 4.5 : 7} distance={10} color="#ffffff" />
      <pointLight position={[0, -1.8, 1.5]} intensity={compact ? 2.8 : 4} distance={8} color="#08c5d1" />
      <Suspense fallback={null}>
        <RobotModel compact={compact} zoomScale={zoomScale} />
      </Suspense>
    </Canvas>
  );
}

function waitForScene(viewer: HTMLElement, timeoutMs = 9000) {
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

export default function SplineRobotScene({ zoomScale = 1 }: SplineRobotSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [splineReady, setSplineReady] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;

    const host = hostRef.current;
    let cancelled = false;
    let activeViewer: HTMLElement | undefined;

    const mountSpline = async () => {
      host.dataset.splineStatus = 'viewer-script-loading';

      try {
        await loadSplineViewer();
        if (cancelled) return;
      } catch {
        if (!cancelled) host.dataset.splineStatus = 'viewer-script-error-local-3d-active';
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
          pointerEvents: 'none',
          touchAction: 'pan-y',
          opacity: '0',
          transition: 'opacity 350ms ease',
          filter: 'saturate(1.5) contrast(1.09) brightness(1.02)',
        });

        const sceneReady = waitForScene(viewer);
        host.appendChild(viewer);

        try {
          await sceneReady;
          if (cancelled) return;
          viewer.style.pointerEvents = 'auto';
          viewer.style.opacity = '1';
          host.dataset.splineStatus = sceneUrl.startsWith('/') ? 'ready-local' : 'ready-remote';
          setSplineReady(true);
          return;
        } catch {
          if (cancelled) return;
          viewer.remove();
          activeViewer = undefined;
        }
      }

      if (!cancelled) {
        host.replaceChildren();
        host.dataset.splineStatus = 'scene-error-local-3d-active';
        setSplineReady(false);
      }
    };

    void mountSpline();

    return () => {
      cancelled = true;
      activeViewer?.remove();
      try { host.replaceChildren(); } catch { /* host may already be detached */ }
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <div className={`absolute inset-0 z-[1] transition-opacity duration-300 ${splineReady ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
        <LocalRobot3D zoomScale={zoomScale} />
      </div>

      <div
        className={`pointer-events-none absolute inset-0 z-[2] transition-opacity duration-500 ${splineReady ? 'opacity-100' : 'opacity-75'}`}
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-[45%] h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#08c5d1]/12 blur-[68px]" />
        <div className="absolute left-1/2 top-[58%] h-[36%] w-[36%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0aaebd]/10 blur-[48px]" />
        <div className="absolute bottom-[2%] left-1/2 h-12 w-[44%] -translate-x-1/2 rounded-[50%] bg-black/20 blur-2xl" />
      </div>

      <div ref={hostRef} className="absolute inset-0 z-[3] bg-transparent" />
    </div>
  );
}

useGLTF.preload(MODEL_URL);
