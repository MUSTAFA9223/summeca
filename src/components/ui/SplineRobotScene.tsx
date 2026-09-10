'use client';

import { Float, useGLTF } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const SCENE_URL = 'https://prod.spline.design/H69K35LVSzZ9WcEG/scene.splinecode';
const VIEWER_SCRIPT = 'https://unpkg.com/@splinetool/viewer@1.9.82/build/spline-viewer.js';
const MODEL_URL = '/assets/models/summeca-robot.glb';

type SplineRobotSceneProps = {
  zoomScale?: number;
};

type WindowWithSplineViewer = Window & {
  __summecaSplineViewerPromise?: Promise<void>;
};

function loadSplineViewer() {
  const win = window as WindowWithSplineViewer;
  if (customElements.get('spline-viewer')) return Promise.resolve();
  if (win.__summecaSplineViewerPromise) return win.__summecaSplineViewerPromise;

  win.__summecaSplineViewerPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-summeca-spline-viewer]');
    if (existing) {
      if (customElements.get('spline-viewer')) {
        resolve();
        return;
      }
      const onLoad = () => resolve();
      const onError = () => {
        win.__summecaSplineViewerPromise = undefined;
        reject(new Error('Spline viewer failed to load'));
      };
      existing.addEventListener('load', onLoad, { once: true });
      existing.addEventListener('error', onError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = VIEWER_SCRIPT;
    script.dataset.summecaSplineViewer = 'true';
    script.onload = () => resolve();
    script.onerror = () => {
      win.__summecaSplineViewerPromise = undefined;
      reject(new Error('Spline viewer failed to load'));
    };
    document.head.appendChild(script);
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
    const autoYaw = Math.sin(t * 0.42) * (compact ? 0.075 : 0.045);
    const autoPitch = Math.sin(t * 0.31) * 0.018;
    const targetYaw = pointer.x * (compact ? 0.24 : 0.34) + autoYaw;
    const targetPitch = -pointer.y * (compact ? 0.065 : 0.1) + autoPitch;

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

export default function SplineRobotScene({ zoomScale = 1 }: SplineRobotSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [splineReady, setSplineReady] = useState(false);
  const [splineUnavailable, setSplineUnavailable] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;

    const host = hostRef.current;
    let cancelled = false;
    let timeout: number | undefined;
    let viewer: HTMLElement | undefined;

    const mountSpline = async () => {
      try {
        await loadSplineViewer();
        if (cancelled) return;

        viewer = document.createElement('spline-viewer');
        viewer.setAttribute('url', SCENE_URL);
        viewer.setAttribute('loading', 'eager');
        viewer.setAttribute('events-target', 'global');
        viewer.setAttribute('background', 'transparent');
        viewer.setAttribute('renderer', 'webgl');
        viewer.setAttribute('aria-hidden', 'true');
        Object.assign(viewer.style, {
          display: 'block',
          width: '100%',
          height: '100%',
          minHeight: '100%',
          background: 'transparent',
          pointerEvents: 'auto',
          touchAction: 'pan-y',
          opacity: '0',
          transition: 'opacity 420ms ease',
          filter: 'saturate(1.5) contrast(1.09) brightness(1.02)',
        });

        const onComplete = () => {
          if (cancelled || !viewer) return;
          if (timeout !== undefined) window.clearTimeout(timeout);
          viewer.style.opacity = '1';
          setSplineReady(true);
          setSplineUnavailable(false);
        };

        const onContextLoss = () => {
          if (cancelled) return;
          setSplineReady(false);
          setSplineUnavailable(true);
        };

        viewer.addEventListener('load-complete', onComplete, { once: true });
        viewer.addEventListener('context-loss', onContextLoss, { once: true });
        host.replaceChildren(viewer);

        timeout = window.setTimeout(() => {
          if (cancelled || splineReady) return;
          setSplineUnavailable(true);
        }, 7000);
      } catch {
        if (!cancelled) setSplineUnavailable(true);
      }
    };

    void mountSpline();

    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
      try { host.replaceChildren(); } catch { /* host may already be detached */ }
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <div className="absolute inset-0 z-[1]">
        {!splineReady && <LocalRobot3D zoomScale={zoomScale} />}
      </div>

      <div
        className={`pointer-events-none absolute inset-0 z-[2] transition-opacity duration-500 ${splineReady ? 'opacity-100' : 'opacity-75'}`}
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-[45%] h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#08c5d1]/12 blur-[68px]" />
        <div className="absolute left-1/2 top-[58%] h-[36%] w-[36%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0aaebd]/10 blur-[48px]" />
        <div className="absolute bottom-[2%] left-1/2 h-12 w-[44%] -translate-x-1/2 rounded-[50%] bg-black/20 blur-2xl" />
      </div>

      <div
        ref={hostRef}
        className={`absolute inset-0 z-[3] bg-transparent ${splineUnavailable ? 'pointer-events-none' : ''}`}
      />
    </div>
  );
}

useGLTF.preload(MODEL_URL);
