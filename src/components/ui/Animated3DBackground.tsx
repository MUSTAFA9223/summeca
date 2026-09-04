'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Reduced motion detection ─────────────────────────────────────────────────
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

// ─── Weak device detection ────────────────────────────────────────────────────
function useIsWeakDevice() {
  const [weak, setWeak] = useState(false);
  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
    const lowMemory = nav.deviceMemory !== undefined && nav.deviceMemory < 4;
    const lowCores = nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency < 4;
    setWeak(lowMemory || lowCores);
  }, []);
  return weak;
}

// ─── Floating Particles ───────────────────────────────────────────────────────
function Particles({ count, intensity }: { count: number; intensity: number }) {
  const meshRef = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      vel[i * 3] = (Math.random() - 0.5) * 0.0018;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.0018;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.0009;
    }
    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame(() => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry;
    const pos = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3] += velocities[i * 3] * intensity;
      pos[i * 3 + 1] += velocities[i * 3 + 1] * intensity;
      pos[i * 3 + 2] += velocities[i * 3 + 2] * intensity;
      if (Math.abs(pos[i * 3]) > 11) velocities[i * 3] *= -1;
      if (Math.abs(pos[i * 3 + 1]) > 7) velocities[i * 3 + 1] *= -1;
      if (Math.abs(pos[i * 3 + 2]) > 5) velocities[i * 3 + 2] *= -1;
    }
    geo.attributes.position.needsUpdate = true;
    meshRef.current.rotation.y += 0.00025 * intensity;
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  return (
    <points ref={meshRef} geometry={geometry}>
      <pointsMaterial
        size={0.045}
        color="#0D9488"
        transparent
        opacity={0.65}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ─── Secondary Particles (white/light) ───────────────────────────────────────
function SecondaryParticles({ count, intensity }: { count: number; intensity: number }) {
  const meshRef = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8;
      vel[i * 3] = (Math.random() - 0.5) * 0.001;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.001;
      vel[i * 3 + 2] = 0;
    }
    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame(() => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry;
    const pos = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3] += velocities[i * 3] * intensity;
      pos[i * 3 + 1] += velocities[i * 3 + 1] * intensity;
      if (Math.abs(pos[i * 3]) > 10) velocities[i * 3] *= -1;
      if (Math.abs(pos[i * 3 + 1]) > 6) velocities[i * 3 + 1] *= -1;
    }
    geo.attributes.position.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  return (
    <points ref={meshRef} geometry={geometry}>
      <pointsMaterial
        size={0.025}
        color="#14b8a6"
        transparent
        opacity={0.35}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ─── AI Network Lines ─────────────────────────────────────────────────────────
function NetworkLines({ nodeCount, intensity }: { nodeCount: number; intensity: number }) {
  const linesRef = useRef<THREE.LineSegments>(null);
  const nodesRef = useRef<THREE.Points>(null);

  const { lineGeo, nodeGeo } = useMemo(() => {
    const nodes: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: (Math.random() - 0.5) * 18,
        y: (Math.random() - 0.5) * 11,
        z: (Math.random() - 0.5) * 7,
      });
    }

    const linePositions: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dz = nodes[i].z - nodes[j].z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 5) {
          linePositions.push(nodes[i].x, nodes[i].y, nodes[i].z);
          linePositions.push(nodes[j].x, nodes[j].y, nodes[j].z);
        }
      }
    }

    const nodePositions = new Float32Array(nodes.flatMap((n) => [n.x, n.y, n.z]));

    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

    const nGeo = new THREE.BufferGeometry();
    nGeo.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));

    return { lineGeo: lGeo, nodeGeo: nGeo };
  }, [nodeCount]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (linesRef.current) {
      linesRef.current.rotation.y += 0.0003 * intensity;
      linesRef.current.rotation.x += 0.00008 * intensity;
      const mat = linesRef.current.material as THREE.LineBasicMaterial;
      mat.opacity = (0.12 + Math.sin(t * 0.4) * 0.04) * intensity;
    }
    if (nodesRef.current) {
      nodesRef.current.rotation.y += 0.0003 * intensity;
      nodesRef.current.rotation.x += 0.00008 * intensity;
    }
  });

  return (
    <group>
      <lineSegments ref={linesRef} geometry={lineGeo}>
        <lineBasicMaterial color="#0D9488" transparent opacity={0.14} depthWrite={false} />
      </lineSegments>
      <points ref={nodesRef} geometry={nodeGeo}>
        <pointsMaterial size={0.08} color="#0D9488" transparent opacity={0.5} sizeAttenuation depthWrite={false} />
      </points>
    </group>
  );
}

// ─── Light Wave Planes ────────────────────────────────────────────────────────
function LightWaves({ intensity }: { intensity: number }) {
  const wave1Ref = useRef<THREE.Mesh>(null);
  const wave2Ref = useRef<THREE.Mesh>(null);
  const mat1Ref = useRef<THREE.MeshBasicMaterial>(null);
  const mat2Ref = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (wave1Ref.current && mat1Ref.current) {
      wave1Ref.current.rotation.x = Math.sin(t * 0.25) * 0.07 * intensity;
      wave1Ref.current.rotation.z = Math.cos(t * 0.18) * 0.035 * intensity;
      mat1Ref.current.opacity = (0.035 + Math.sin(t * 0.45) * 0.015) * intensity;
    }
    if (wave2Ref.current && mat2Ref.current) {
      wave2Ref.current.rotation.x = Math.cos(t * 0.2) * 0.05 * intensity;
      wave2Ref.current.rotation.z = Math.sin(t * 0.15) * 0.025 * intensity;
      mat2Ref.current.opacity = (0.025 + Math.cos(t * 0.35) * 0.01) * intensity;
    }
  });

  return (
    <>
      <mesh ref={wave1Ref} position={[0, -1, -4]} rotation={[-Math.PI / 7, 0, 0]}>
        <planeGeometry args={[28, 16, 1, 1]} />
        <meshBasicMaterial ref={mat1Ref} color="#0D9488" transparent opacity={0.04} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={wave2Ref} position={[2, 1, -6]} rotation={[-Math.PI / 5, 0.2, 0]}>
        <planeGeometry args={[22, 12, 1, 1]} />
        <meshBasicMaterial ref={mat2Ref} color="#0891B2" transparent opacity={0.025} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </>
  );
}

// ─── Floating Geometric Objects ───────────────────────────────────────────────
function FloatingGeometry({ count, intensity }: { count: number; intensity: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const shapes = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 9,
        (Math.random() - 0.5) * 5 - 2,
      ] as [number, number, number],
      scale: 0.12 + Math.random() * 0.28,
      speed: 0.25 + Math.random() * 0.35,
      rotSpeed: (Math.random() - 0.5) * 0.008,
      offset: Math.random() * Math.PI * 2,
      type: i % 3, // 0=sphere, 1=box, 2=octahedron
      color: i % 4 === 0 ? '#0D9488' : i % 4 === 1 ? '#14b8a6' : i % 4 === 2 ? '#0891B2' : '#99f6e4',
      opacity: 0.08 + Math.random() * 0.1,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const s = shapes[i];
      if (!s) return;
      child.position.y = s.position[1] + Math.sin(t * s.speed + s.offset) * 0.35 * intensity;
      child.position.x = s.position[0] + Math.cos(t * s.speed * 0.65 + s.offset) * 0.18 * intensity;
      child.rotation.x += s.rotSpeed * intensity;
      child.rotation.y += s.rotSpeed * 0.7 * intensity;
    });
  });

  return (
    <group ref={groupRef}>
      {shapes.map((s, i) => (
        <mesh key={i} position={s.position} scale={s.scale}>
          {s.type === 0 ? (
            <sphereGeometry args={[1, 8, 8]} />
          ) : s.type === 1 ? (
            <boxGeometry args={[1.4, 1.4, 1.4]} />
          ) : (
            <octahedronGeometry args={[1]} />
          )}
          <meshBasicMaterial color={s.color} transparent opacity={s.opacity} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Glowing Ring ─────────────────────────────────────────────────────────────
function GlowingRings({ intensity }: { intensity: number }) {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = t * 0.12 * intensity;
      ring1Ref.current.rotation.z = t * 0.08 * intensity;
      const mat = ring1Ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (0.06 + Math.sin(t * 0.6) * 0.025) * intensity;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = -t * 0.09 * intensity;
      ring2Ref.current.rotation.y = t * 0.06 * intensity;
      const mat = ring2Ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (0.04 + Math.cos(t * 0.5) * 0.02) * intensity;
    }
  });

  return (
    <>
      <mesh ref={ring1Ref} position={[3, 1, -3]}>
        <torusGeometry args={[2.5, 0.02, 8, 60]} />
        <meshBasicMaterial color="#0D9488" transparent opacity={0.07} depthWrite={false} />
      </mesh>
      <mesh ref={ring2Ref} position={[-3, -1, -4]}>
        <torusGeometry args={[3.5, 0.015, 8, 60]} />
        <meshBasicMaterial color="#0891B2" transparent opacity={0.05} depthWrite={false} />
      </mesh>
    </>
  );
}

// ─── Camera Drift ─────────────────────────────────────────────────────────────
function CameraDrift({ intensity }: { intensity: number }) {
  const { camera } = useThree();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    camera.position.x = Math.sin(t * 0.07) * 0.5 * intensity;
    camera.position.y = Math.cos(t * 0.055) * 0.25 * intensity;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ─── Scene ────────────────────────────────────────────────────────────────────
export type AnimationVariant = 'full' | 'light' | 'subtle' | 'admin';

interface SceneProps {
  variant: AnimationVariant;
  isMobile: boolean;
}

function Scene({ variant, isMobile }: SceneProps) {
  const isAdmin = variant === 'admin';
  const isSubtle = variant === 'subtle';
  const isLight = variant === 'light';
  const isFull = variant === 'full';

  const particleCount = isMobile
    ? isFull ? 55 : isLight ? 28 : isSubtle ? 14 : 8
    : isFull ? 160 : isLight ? 85 : isSubtle ? 42 : 20;

  const secondaryCount = isMobile
    ? isFull ? 30 : isLight ? 15 : 0
    : isFull ? 80 : isLight ? 40 : 0;

  const nodeCount = isMobile
    ? isFull ? 14 : isLight ? 8 : isSubtle ? 5 : 3
    : isFull ? 28 : isLight ? 16 : isSubtle ? 9 : 5;

  const orbCount = isMobile
    ? isFull ? 5 : isLight ? 3 : isSubtle ? 1 : 1
    : isFull ? 10 : isLight ? 5 : isSubtle ? 3 : 2;

  const intensity = isFull ? 1 : isLight ? 0.65 : isSubtle ? 0.35 : 0.18;

  return (
    <>
      <CameraDrift intensity={intensity} />
      <Particles count={particleCount} intensity={intensity} />
      {secondaryCount > 0 && <SecondaryParticles count={secondaryCount} intensity={intensity} />}
      {!isAdmin && <NetworkLines nodeCount={nodeCount} intensity={intensity} />}
      <LightWaves intensity={intensity} />
      <FloatingGeometry count={orbCount} intensity={intensity} />
      {(isFull || isLight) && <GlowingRings intensity={intensity} />}
    </>
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────
interface Animated3DBackgroundProps {
  variant?: AnimationVariant;
  className?: string;
}

export default function Animated3DBackground({
  variant = 'full',
  className = '',
}: Animated3DBackgroundProps) {
  const reducedMotion = useReducedMotion();
  const isWeakDevice = useIsWeakDevice();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!mounted || reducedMotion || isWeakDevice) return null;

  const effectiveVariant: AnimationVariant =
    isMobile && variant === 'full' ? 'light' : variant;

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{
          antialias: false,
          powerPreference: 'low-power',
          alpha: true,
        }}
        dpr={isMobile ? 1 : Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5)}
        style={{ background: 'transparent' }}
        frameloop="always"
      >
        <Scene variant={effectiveVariant} isMobile={isMobile} />
      </Canvas>
    </div>
  );
}
