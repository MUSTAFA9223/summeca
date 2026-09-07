'use client';

import { Float } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

type MotionSettings = { reduced: boolean; visible: boolean; interactive: boolean };

function CoreScene({ reduced, visible, interactive }: MotionSettings) {
  const core = useRef<THREE.Group>(null);
  const innerCore = useRef<THREE.Mesh>(null);
  const ringOne = useRef<THREE.Mesh>(null);
  const ringTwo = useRef<THREE.Mesh>(null);
  const ringThree = useRef<THREE.Mesh>(null);
  const satellites = useRef<THREE.Group>(null);
  const { pointer, camera } = useThree();

  const particles = useMemo(() => {
    const positions = new Float32Array(42 * 3);
    for (let index = 0; index < 42; index += 1) {
      const angle = index * 2.399963;
      const radius = 2.15 + (index % 7) * 0.15;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = ((index % 9) - 4) * 0.34;
      positions[index * 3 + 2] = Math.sin(angle) * radius * 0.58;
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    if (!visible) return;
    const elapsed = state.clock.elapsedTime;
    const targetX = reduced ? 0.06 : interactive ? pointer.y * 0.17 : 0.04;
    const targetY = reduced ? -0.2 : interactive ? pointer.x * 0.28 : 0;

    if (core.current) {
      core.current.rotation.x = THREE.MathUtils.damp(core.current.rotation.x, targetX, 3.2, delta);
      core.current.rotation.y = THREE.MathUtils.damp(
        core.current.rotation.y,
        targetY + (reduced ? 0 : elapsed * 0.075),
        2.8,
        delta
      );
      core.current.position.x = THREE.MathUtils.damp(
        core.current.position.x,
        reduced || !interactive ? 0 : pointer.x * 0.16,
        3,
        delta
      );
      core.current.position.y = THREE.MathUtils.damp(
        core.current.position.y,
        reduced || !interactive ? 0.18 : 0.18 + pointer.y * 0.1,
        3,
        delta
      );
    }

    if (!reduced) {
      if (innerCore.current) innerCore.current.rotation.y -= delta * 0.22;
      if (ringOne.current) ringOne.current.rotation.z += delta * 0.12;
      if (ringTwo.current) ringTwo.current.rotation.x -= delta * 0.09;
      if (ringThree.current) ringThree.current.rotation.y += delta * 0.08;
      if (satellites.current) satellites.current.rotation.y -= delta * 0.045;
      camera.position.x = THREE.MathUtils.damp(
        camera.position.x,
        interactive ? pointer.x * 0.2 : 0,
        2.5,
        delta
      );
      camera.position.y = THREE.MathUtils.damp(
        camera.position.y,
        interactive ? 0.12 + pointer.y * 0.13 : 0.12,
        2.5,
        delta
      );
      camera.lookAt(0, 0.15, 0);
    }
  });

  return (
    <>
      <ambientLight intensity={1.25} />
      <directionalLight position={[3.5, 5, 4]} intensity={2.4} color="#ffffff" />
      <pointLight position={[-2.5, 1.5, 3]} intensity={25} distance={7} color="#08c5d1" />
      <pointLight position={[2.4, -1, 2]} intensity={12} distance={6} color="#9df8fc" />

      <group ref={core} position={[0, 0.18, 0]}>
        <mesh ref={innerCore}>
          <icosahedronGeometry args={[1.05, 5]} />
          <meshStandardMaterial
            color="#0dd2dc"
            emissive="#08c5d1"
            emissiveIntensity={1.6}
            roughness={0.25}
            metalness={0.35}
          />
        </mesh>
        <mesh scale={1.16}>
          <icosahedronGeometry args={[1.05, 2]} />
          <meshPhysicalMaterial
            color="#eafcfd"
            transparent
            opacity={0.26}
            roughness={0.12}
            metalness={0.15}
            clearcoat={1}
            clearcoatRoughness={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh scale={1.22}>
          <icosahedronGeometry args={[1.05, 2]} />
          <meshBasicMaterial color="#bff9fb" wireframe transparent opacity={0.22} />
        </mesh>

        <mesh position={[0, 0, 1.29]}>
          <circleGeometry args={[0.43, 48]} />
          <meshStandardMaterial
            color="#f7ffff"
            emissive="#08c5d1"
            emissiveIntensity={0.34}
            metalness={0.75}
            roughness={0.2}
          />
        </mesh>
        <group position={[0, 0, 1.305]} scale={0.52}>
          <mesh position={[-0.13, 0.16, 0]} rotation={[0, 0, -0.64]}>
            <capsuleGeometry args={[0.09, 0.55, 8, 16]} />
            <meshBasicMaterial color="#10232a" />
          </mesh>
          <mesh position={[0.12, -0.16, 0]} rotation={[0, 0, -0.64]}>
            <capsuleGeometry args={[0.09, 0.55, 8, 16]} />
            <meshBasicMaterial color="#08c5d1" />
          </mesh>
        </group>

        <mesh ref={ringOne} rotation={[1.14, 0.25, 0.1]}>
          <torusGeometry args={[1.62, 0.035, 10, 112]} />
          <meshStandardMaterial color="#f4ffff" metalness={0.88} roughness={0.18} />
        </mesh>
        <mesh ref={ringTwo} rotation={[0.35, 1.08, 0.62]}>
          <torusGeometry args={[1.82, 0.022, 8, 112]} />
          <meshStandardMaterial
            color="#78eff4"
            emissive="#08c5d1"
            emissiveIntensity={0.8}
            metalness={0.6}
            roughness={0.2}
          />
        </mesh>
        <mesh ref={ringThree} rotation={[1.38, 0.2, 1.02]}>
          <torusGeometry args={[2.08, 0.012, 6, 112]} />
          <meshBasicMaterial color="#c9fafd" transparent opacity={0.48} />
        </mesh>

        <group ref={satellites}>
          {[
            [-2.05, 0.55, 0.35, 0.13],
            [1.85, 1.25, -0.35, 0.18],
            [2.15, -0.72, 0.22, 0.1],
            [-1.5, -1.42, -0.1, 0.16],
            [0.35, 2.1, -0.55, 0.09],
          ].map(([x, y, z, size], index) => (
            <Float
              key={index}
              speed={reduced ? 0 : 1 + index * 0.08}
              rotationIntensity={reduced ? 0 : 0.35}
              floatIntensity={reduced ? 0 : 0.32}
            >
              <mesh position={[x, y, z]}>
                <sphereGeometry args={[size, 20, 20]} />
                <meshStandardMaterial
                  color={index % 2 ? '#08c5d1' : '#f5ffff'}
                  emissive={index % 2 ? '#08c5d1' : '#000000'}
                  emissiveIntensity={index % 2 ? 1.2 : 0}
                  metalness={0.75}
                  roughness={0.18}
                />
              </mesh>
            </Float>
          ))}
        </group>
      </group>

      <points position={[0, 0.15, -0.25]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#75eef4" size={0.035} transparent opacity={0.62} sizeAttenuation />
      </points>

      <group position={[0, -2.03, 0]}>
        <mesh>
          <cylinderGeometry args={[1.72, 2.03, 0.35, 64]} />
          <meshStandardMaterial color="#dce8e9" metalness={0.72} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0.19, 0]}>
          <torusGeometry args={[1.55, 0.055, 12, 96]} />
          <meshStandardMaterial color="#08c5d1" emissive="#08c5d1" emissiveIntensity={2.1} />
        </mesh>
        <mesh position={[0, 0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.48, 64]} />
          <meshStandardMaterial color="#b8c7c9" metalness={0.8} roughness={0.25} />
        </mesh>
      </group>
    </>
  );
}

function StaticFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative h-60 w-60 rounded-full border border-white/35 bg-[radial-gradient(circle_at_35%_25%,#ffffff_0%,#c7fbfd_18%,#08c5d1_54%,#087683_100%)] shadow-[0_0_80px_rgba(8,197,209,0.42)] sm:h-72 sm:w-72">
        <div className="absolute -inset-9 rotate-12 rounded-full border border-[#9df7fb]/45" />
        <div className="absolute -inset-14 -rotate-[36deg] rounded-full border border-white/20" />
        <div className="absolute inset-[29%] flex items-center justify-center rounded-full border border-white/60 bg-white/90 text-5xl font-extrabold text-[#10232a] shadow-2xl">
          S
        </div>
      </div>
    </div>
  );
}

export default function SummecaAiCore() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState(true);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [interactive, setInteractive] = useState(true);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointerQuery = window.matchMedia('(pointer: coarse)');
    const updateMotion = () => setReduced(motionQuery.matches);
    const updatePointer = () => setInteractive(!pointerQuery.matches);
    updateMotion();
    updatePointer();
    motionQuery.addEventListener('change', updateMotion);
    pointerQuery.addEventListener('change', updatePointer);

    try {
      const canvas = document.createElement('canvas');
      setSupported(Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl')));
    } catch {
      setSupported(false);
    }

    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: '120px',
      threshold: 0.01,
    });
    if (wrapperRef.current) observer.observe(wrapperRef.current);

    return () => {
      motionQuery.removeEventListener('change', updateMotion);
      pointerQuery.removeEventListener('change', updatePointer);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative h-full w-full">
      <StaticFallback />
      {supported && (
        <Canvas
          className="relative z-10"
          camera={{ position: [0, 0.12, 6.8], fov: 44, near: 0.1, far: 30 }}
          dpr={[1, 1.5]}
          frameloop={visible && !reduced ? 'always' : 'demand'}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          fallback={<StaticFallback />}
        >
          <CoreScene reduced={reduced} visible={visible} interactive={interactive} />
        </Canvas>
      )}
    </div>
  );
}
