'use client';

import { Float, RoundedBox } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type NavigatorWithDeviceMemory = Navigator & { deviceMemory?: number };

function DarkMetal({ compact = false }: { compact?: boolean }) {
  return (
    <meshPhysicalMaterial
      color="#101820"
      metalness={0.9}
      roughness={compact ? 0.3 : 0.22}
      clearcoat={compact ? 0.45 : 0.72}
      clearcoatRoughness={0.16}
    />
  );
}

function LightMetal({ compact = false }: { compact?: boolean }) {
  return (
    <meshPhysicalMaterial
      color="#46565e"
      metalness={0.88}
      roughness={compact ? 0.34 : 0.24}
      clearcoat={compact ? 0.3 : 0.55}
      clearcoatRoughness={0.2}
    />
  );
}

function CyanGlow({ intensity = 2.6 }: { intensity?: number }) {
  return (
    <meshStandardMaterial
      color="#5ff7ff"
      emissive="#08c5d1"
      emissiveIntensity={intensity}
      metalness={0.28}
      roughness={0.2}
    />
  );
}

function Joint({ position, scale = 1, compact = false }: { position: [number, number, number]; scale?: number; compact?: boolean }) {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.23, compact ? 20 : 32, compact ? 14 : 24]} />
        <DarkMetal compact={compact} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.18, 0.025, compact ? 8 : 12, compact ? 24 : 48]} />
        <CyanGlow intensity={1.9} />
      </mesh>
    </group>
  );
}

function Arm({ side, compact = false, armRef }: { side: -1 | 1; compact?: boolean; armRef: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={armRef} position={[side * 1.06, 1.32, 0]} rotation={[0, 0, side * -0.06]}>
      <mesh scale={[1.15, 0.92, 1.05]}>
        <sphereGeometry args={[0.34, compact ? 20 : 36, compact ? 14 : 24]} />
        <DarkMetal compact={compact} />
      </mesh>
      <mesh position={[side * 0.02, -0.05, 0.29]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.25, 0.025, compact ? 8 : 12, compact ? 24 : 48]} />
        <CyanGlow intensity={2.1} />
      </mesh>

      <mesh position={[0, -0.64, 0]} rotation={[0, 0, side * 0.035]}>
        <capsuleGeometry args={[0.23, 0.72, compact ? 6 : 12, compact ? 16 : 28]} />
        <LightMetal compact={compact} />
      </mesh>
      <Joint position={[0, -1.15, 0]} compact={compact} />
      <mesh position={[0, -1.67, 0.02]} rotation={[0, 0, side * -0.045]}>
        <capsuleGeometry args={[0.2, 0.67, compact ? 6 : 12, compact ? 16 : 28]} />
        <DarkMetal compact={compact} />
      </mesh>
      <mesh position={[0, -2.15, 0.05]} scale={[0.72, 0.95, 0.72]}>
        <sphereGeometry args={[0.26, compact ? 18 : 30, compact ? 12 : 20]} />
        <LightMetal compact={compact} />
      </mesh>
      <mesh position={[side * 0.13, -2.2, 0.15]}>
        <boxGeometry args={[0.16, 0.32, 0.1]} />
        <CyanGlow intensity={1.5} />
      </mesh>
    </group>
  );
}

function Leg({ side, compact = false }: { side: -1 | 1; compact?: boolean }) {
  return (
    <group position={[side * 0.42, -0.72, 0]}>
      <Joint position={[0, 0, 0]} compact={compact} scale={0.95} />
      <mesh position={[0, -0.68, 0]}>
        <capsuleGeometry args={[0.29, 0.88, compact ? 6 : 12, compact ? 16 : 30]} />
        <LightMetal compact={compact} />
      </mesh>
      <mesh position={[0, -0.72, 0.26]} scale={[0.14, 0.55, 0.08]}>
        <boxGeometry args={[1, 1, 1]} />
        <CyanGlow intensity={1.65} />
      </mesh>
      <Joint position={[0, -1.38, 0]} compact={compact} scale={0.9} />
      <mesh position={[0, -2.02, 0.03]}>
        <capsuleGeometry args={[0.25, 0.82, compact ? 6 : 12, compact ? 16 : 28]} />
        <DarkMetal compact={compact} />
      </mesh>
      <mesh position={[0, -2.55, 0.18]} scale={[0.8, 0.42, 1.3]}>
        <RoundedBox args={[0.56, 0.34, 0.75]} radius={0.12} smoothness={compact ? 2 : 5}>
          <LightMetal compact={compact} />
        </RoundedBox>
      </mesh>
      <mesh position={[0, -2.49, 0.55]} scale={[0.5, 0.1, 0.6]}>
        <boxGeometry args={[0.5, 0.2, 0.45]} />
        <CyanGlow intensity={1.5} />
      </mesh>
    </group>
  );
}

function RobotModel({ compact }: { compact: boolean }) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);

  useFrame(({ pointer, clock }, delta) => {
    const robot = root.current;
    if (!robot) return;

    const t = clock.elapsedTime;
    const autoYaw = Math.sin(t * 0.42) * (compact ? 0.09 : 0.06);
    const targetYaw = pointer.x * (compact ? 0.22 : 0.32) + autoYaw;
    const targetPitch = -pointer.y * (compact ? 0.05 : 0.075) + Math.sin(t * 0.3) * 0.012;

    robot.rotation.y = THREE.MathUtils.damp(robot.rotation.y, targetYaw, 3.8, delta);
    robot.rotation.x = THREE.MathUtils.damp(robot.rotation.x, targetPitch, 4.2, delta);
    robot.position.x = THREE.MathUtils.damp(robot.position.x, pointer.x * (compact ? 0.08 : 0.14), 4, delta);
    robot.position.y = -0.08 + Math.sin(t * 0.75) * 0.035;

    if (head.current) {
      head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, pointer.x * 0.26 + Math.sin(t * 0.5) * 0.04, 5, delta);
      head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, -pointer.y * 0.08, 5, delta);
    }

    const armSwing = Math.sin(t * 0.72) * 0.035;
    if (leftArm.current) leftArm.current.rotation.x = THREE.MathUtils.damp(leftArm.current.rotation.x, armSwing, 3, delta);
    if (rightArm.current) rightArm.current.rotation.x = THREE.MathUtils.damp(rightArm.current.rotation.x, -armSwing, 3, delta);
  });

  const segments = compact ? 24 : 40;

  return (
    <Float speed={compact ? 0.75 : 0.95} rotationIntensity={0.025} floatIntensity={compact ? 0.045 : 0.07}>
      <group ref={root} position={[0, -0.08, 0]} scale={compact ? 0.82 : 0.9}>
        {/* Head */}
        <group ref={head} position={[0, 2.5, 0]}>
          <mesh scale={[0.78, 0.9, 0.75]}>
            <sphereGeometry args={[0.62, segments, compact ? 18 : 28]} />
            <DarkMetal compact={compact} />
          </mesh>
          <RoundedBox position={[0, 0.05, 0.51]} args={[0.78, 0.34, 0.13]} radius={0.12} smoothness={compact ? 3 : 6}>
            <meshPhysicalMaterial color="#071115" metalness={0.55} roughness={0.12} transmission={0.06} clearcoat={0.8} />
          </RoundedBox>
          <RoundedBox position={[0, 0.04, 0.59]} args={[0.62, 0.07, 0.025]} radius={0.03} smoothness={compact ? 2 : 4}>
            <CyanGlow intensity={3.4} />
          </RoundedBox>
          <mesh position={[-0.58, 0.02, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.22, 0.035, 10, compact ? 28 : 56]} />
            <CyanGlow intensity={2.2} />
          </mesh>
          <mesh position={[0.58, 0.02, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.22, 0.035, 10, compact ? 28 : 56]} />
            <CyanGlow intensity={2.2} />
          </mesh>
        </group>

        {/* Neck */}
        <mesh position={[0, 1.82, 0]}>
          <cylinderGeometry args={[0.2, 0.24, 0.42, compact ? 18 : 32]} />
          <LightMetal compact={compact} />
        </mesh>
        <mesh position={[0, 1.86, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.23, 0.028, 10, compact ? 24 : 48]} />
          <CyanGlow intensity={1.8} />
        </mesh>

        {/* Torso */}
        <RoundedBox position={[0, 0.82, 0]} args={[1.55, 1.68, 0.82]} radius={0.28} smoothness={compact ? 3 : 7}>
          <DarkMetal compact={compact} />
        </RoundedBox>
        <RoundedBox position={[0, 0.92, 0.43]} args={[1.08, 0.9, 0.12]} radius={0.18} smoothness={compact ? 3 : 6}>
          <LightMetal compact={compact} />
        </RoundedBox>
        <mesh position={[0, 1.02, 0.52]}>
          <torusGeometry args={[0.34, 0.032, 12, compact ? 32 : 64]} />
          <CyanGlow intensity={2.8} />
        </mesh>
        <mesh position={[0, 1.02, 0.54]}>
          <sphereGeometry args={[0.16, compact ? 20 : 36, compact ? 14 : 24]} />
          <CyanGlow intensity={3.6} />
        </mesh>
        <RoundedBox position={[0, 0.23, 0.38]} args={[0.68, 0.16, 0.08]} radius={0.05} smoothness={3}>
          <CyanGlow intensity={1.9} />
        </RoundedBox>

        {/* Arms */}
        <Arm side={-1} compact={compact} armRef={leftArm} />
        <Arm side={1} compact={compact} armRef={rightArm} />

        {/* Pelvis */}
        <RoundedBox position={[0, -0.35, 0]} args={[1.22, 0.6, 0.7]} radius={0.2} smoothness={compact ? 3 : 6}>
          <LightMetal compact={compact} />
        </RoundedBox>
        <RoundedBox position={[0, -0.37, 0.38]} args={[0.72, 0.14, 0.08]} radius={0.04} smoothness={3}>
          <CyanGlow intensity={1.7} />
        </RoundedBox>

        {/* Legs */}
        <Leg side={-1} compact={compact} />
        <Leg side={1} compact={compact} />
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
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
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
          camera={{ position: [0, compact ? 0.05 : 0.1, compact ? 9.5 : 9.1], fov: compact ? 36 : 34 }}
          dpr={compact ? [1, 1.2] : [1, 1.6]}
          frameloop={visible ? 'always' : 'demand'}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          shadows={!compact}
          style={{ touchAction: 'pan-y' }}
        >
          <ambientLight intensity={compact ? 0.8 : 0.68} />
          <hemisphereLight args={['#dffcff', '#071418', compact ? 1.15 : 1.3]} />
          <directionalLight position={[4, 7, 6]} intensity={compact ? 2.7 : 3.6} color="#efffff" />
          <directionalLight position={[-5, 2, 4]} intensity={compact ? 1.8 : 2.5} color="#08c5d1" />
          <pointLight position={[0, 1.4, 4]} intensity={compact ? 4.2 : 6.2} distance={10} color="#ffffff" />
          <pointLight position={[0, -1.6, 2]} intensity={compact ? 2.6 : 4.2} distance={8} color="#08c5d1" />
          <RobotModel compact={compact} />
          <mesh position={[0, -3.48, 0.05]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.9, 1, 1]}>
            <circleGeometry args={[1.25, compact ? 36 : 64]} />
            <meshBasicMaterial color="#08c5d1" transparent opacity={0.09} depthWrite={false} />
          </mesh>
        </Canvas>
      )}
    </div>
  );
}
