'use client';

import { Float, useGLTF } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const MODEL_URL = '/assets/models/summeca-robot.glb';

type NavigatorWithDeviceMemory = Navigator & { deviceMemory?: number };

function RobotModel({ compact }: { compact: boolean }) {
  const root = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL_URL);

  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = !compact;
      object.receiveShadow = !compact;
      const source = object.material;
      const material = Array.isArray(source) ? source[0] : source;
      const color = material && 'color' in material && material.color instanceof THREE.Color
        ? material.color.clone()
        : new THREE.Color('#5d676c');
      object.material = new THREE.MeshPhysicalMaterial({
        color: color.lerp(new THREE.Color('#1b252a'), 0.52),
        metalness: 0.72,
        roughness: compact ? 0.34 : 0.28,
        clearcoat: compact ? 0.18 : 0.32,
        clearcoatRoughness: compact ? 0.3 : 0.24,
      });
    });
    return clone;
  }, [compact, scene]);

  useFrame(({ pointer, clock }, delta) => {
    if (!root.current) return;

    // Pointer values are updated by mouse and touch pointer events. On mobile,
    // the autonomous sway keeps the robot visibly alive even before interaction.
    const autoYaw = Math.sin(clock.elapsedTime * 0.42) * (compact ? 0.075 : 0.045);
    const autoPitch = Math.sin(clock.elapsedTime * 0.31) * 0.018;
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
    root.current.position.y = (compact ? -0.74 : -0.66) + Math.sin(clock.elapsedTime * 0.8) * 0.04;
  });

  return (
    <Float
      speed={compact ? 0.9 : 1.05}
      rotationIntensity={compact ? 0.045 : 0.08}
      floatIntensity={compact ? 0.08 : 0.12}
    >
      <group ref={root} position={[0, compact ? -0.74 : -0.66, 0]} scale={compact ? 0.78 : 0.85}>
        <primitive object={model} />
      </group>
    </Float>
  );
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

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ||
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true }),
    );
  } catch {
    return false;
  }
}

export default function SplineRobotScene() {
  const [enabled, setEnabled] = useState(false);
  const [compact, setCompact] = useState(false);
  const [visible, setVisible] = useState(true);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const deviceMemory = (navigator as NavigatorWithDeviceMemory).deviceMemory;
    const veryLowMemory = typeof deviceMemory === 'number' && deviceMemory <= 2;

    const syncCompact = () => setCompact(mobileQuery.matches);
    syncCompact();
    mobileQuery.addEventListener?.('change', syncCompact);

    // Mobile and touch devices now render the real GLB scene. The static image
    // is reserved for reduced-motion, very-low-memory, or unavailable WebGL.
    setEnabled(!reducedMotion && !veryLowMemory && supportsWebGL());

    return () => mobileQuery.removeEventListener?.('change', syncCompact);
  }, []);

  useEffect(() => {
    if (!hostRef.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: '160px',
      threshold: 0.01,
    });
    observer.observe(hostRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="relative h-full w-full overflow-hidden bg-transparent">
      {!enabled ? (
        <StaticFallback />
      ) : (
        <Canvas
          camera={{ position: [0, compact ? 0.08 : 0.12, compact ? 9.1 : 8.6], fov: compact ? 37 : 35 }}
          dpr={compact ? [1, 1.15] : [1, 1.5]}
          frameloop={visible ? 'always' : 'demand'}
          gl={{ antialias: !compact, alpha: true, powerPreference: 'high-performance' }}
          shadows={!compact}
          style={{ touchAction: 'pan-y' }}
        >
          <ambientLight intensity={compact ? 1.3 : 1.15} />
          <directionalLight position={[4, 7, 6]} intensity={compact ? 3.1 : 4.2} color="#d8fbff" />
          <directionalLight position={[-5, 2, 4]} intensity={compact ? 1.7 : 2.2} color="#08c5d1" />
          <pointLight position={[0, 1.5, 4]} intensity={compact ? 4.5 : 7} distance={10} color="#ffffff" />
          <pointLight position={[0, -1.8, 1.5]} intensity={compact ? 2.8 : 4} distance={8} color="#08c5d1" />
          <Suspense fallback={null}>
            <RobotModel compact={compact} />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}

useGLTF.preload(MODEL_URL);
