'use client';

import { Float, useGLTF } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const MODEL_URL = '/assets/models/summeca-robot.glb';

type NavigatorWithDeviceMemory = Navigator & { deviceMemory?: number };

function RobotModel() {
  const root = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL_URL);

  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const source = object.material;
      const material = Array.isArray(source) ? source[0] : source;
      const color = material && 'color' in material && material.color instanceof THREE.Color
        ? material.color.clone()
        : new THREE.Color('#5d676c');
      object.material = new THREE.MeshPhysicalMaterial({
        color: color.lerp(new THREE.Color('#1b252a'), 0.52),
        metalness: 0.72,
        roughness: 0.28,
        clearcoat: 0.32,
        clearcoatRoughness: 0.24,
      });
    });
    return clone;
  }, [scene]);

  useFrame(({ pointer, clock }, delta) => {
    if (!root.current) return;
    root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, pointer.x * 0.34, 4.2, delta);
    root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, -pointer.y * 0.1, 4.2, delta);
    root.current.position.x = THREE.MathUtils.damp(root.current.position.x, pointer.x * 0.18, 4, delta);
    root.current.position.y = -0.66 + Math.sin(clock.elapsedTime * 0.8) * 0.035;
  });

  return (
    <Float speed={1.05} rotationIntensity={0.08} floatIntensity={0.12}>
      <group ref={root} position={[0, -0.66, 0]} scale={0.85}>
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

export default function SplineRobotScene() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(true);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const deviceMemory = (navigator as NavigatorWithDeviceMemory).deviceMemory;
    const lowMemory = typeof deviceMemory === 'number' && deviceMemory <= 4;
    setEnabled(!reducedMotion && !mobile && !coarsePointer && !lowMemory);
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
          camera={{ position: [0, 0.12, 8.6], fov: 35 }}
          dpr={[1, 1.5]}
          frameloop={visible ? 'always' : 'demand'}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          shadows
        >
          <ambientLight intensity={1.15} />
          <directionalLight position={[4, 7, 6]} intensity={4.2} color="#d8fbff" />
          <directionalLight position={[-5, 2, 4]} intensity={2.2} color="#08c5d1" />
          <pointLight position={[0, 1.5, 4]} intensity={7} distance={10} color="#ffffff" />
          <pointLight position={[0, -1.8, 1.5]} intensity={4} distance={8} color="#08c5d1" />
          <Suspense fallback={null}>
            <RobotModel />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}

useGLTF.preload(MODEL_URL);
