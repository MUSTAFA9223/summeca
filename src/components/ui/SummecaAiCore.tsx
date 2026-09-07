'use client';

import { Float, RoundedBox } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

type MotionSettings = {
  reduced: boolean;
  visible: boolean;
  interactive: boolean;
  compact: boolean;
};

const satellites = [
  [-2.18, 0.65, 0.15, 0.18],
  [1.92, 1.52, -0.2, 0.22],
  [2.27, -0.74, 0.35, 0.12],
  [-1.62, -1.45, 0.12, 0.15],
  [0.48, 2.14, -0.42, 0.1],
] as const;

function MetallicS() {
  const material = (
    <meshStandardMaterial
      color="#dce7e9"
      emissive="#08c5d1"
      emissiveIntensity={0.16}
      metalness={0.96}
      roughness={0.16}
    />
  );

  return (
    <group position={[0, 0, 1.39]} rotation={[0, 0, -0.06]} scale={0.72}>
      <RoundedBox args={[1.05, 0.25, 0.18]} radius={0.1} smoothness={3} position={[0.12, 0.62, 0]}>
        {material}
      </RoundedBox>
      <RoundedBox args={[0.25, 0.62, 0.18]} radius={0.1} smoothness={3} position={[-0.39, 0.38, 0]}>
        {material}
      </RoundedBox>
      <RoundedBox args={[0.94, 0.25, 0.18]} radius={0.1} smoothness={3} position={[-0.02, 0.02, 0]}>
        {material}
      </RoundedBox>
      <RoundedBox args={[0.25, 0.62, 0.18]} radius={0.1} smoothness={3} position={[0.39, -0.35, 0]}>
        {material}
      </RoundedBox>
      <RoundedBox
        args={[1.05, 0.25, 0.18]}
        radius={0.1}
        smoothness={3}
        position={[-0.12, -0.62, 0]}
      >
        {material}
      </RoundedBox>
    </group>
  );
}

function MechanicalFace({ compact }: { compact: boolean }) {
  const teeth = compact ? 14 : 26;
  const nodes = compact ? 8 : 16;

  return (
    <group>
      {Array.from({ length: teeth }, (_, index) => {
        const angle = (index / teeth) * Math.PI * 2;
        return (
          <mesh
            key={`tooth-${index}`}
            position={[Math.cos(angle) * 1.07, Math.sin(angle) * 1.07, 1.315]}
            rotation={[0, 0, angle]}
          >
            <boxGeometry args={[0.07, 0.2, 0.1]} />
            <meshStandardMaterial color="#b9c8cb" metalness={0.94} roughness={0.2} />
          </mesh>
        );
      })}

      {[0.12, 1.76, 3.38, 5].map((start, index) => (
        <mesh
          key={`face-segment-${start}`}
          position={[0, 0, 1.365]}
          rotation={[0, 0, index * 0.02]}
        >
          <ringGeometry args={[0.98, 1.16, 56, 1, start, 1.13]} />
          <meshStandardMaterial
            color={index % 2 ? '#eef5f6' : '#c2d0d2'}
            metalness={0.92}
            roughness={0.16}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {Array.from({ length: nodes }, (_, index) => {
        const angle = (index / nodes) * Math.PI * 2 + 0.16;
        return (
          <mesh
            key={`node-${index}`}
            position={[Math.cos(angle) * 1.27, Math.sin(angle) * 1.27, 1.08]}
          >
            <sphereGeometry args={[index % 4 === 0 ? 0.055 : 0.035, 12, 12]} />
            <meshStandardMaterial
              color={index % 4 === 0 ? '#67f4fa' : '#edf9fa'}
              emissive="#08c5d1"
              emissiveIntensity={index % 4 === 0 ? 2.4 : 0.55}
              metalness={0.55}
              roughness={0.18}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function ShellArchitecture({ compact }: { compact: boolean }) {
  const ribs = compact ? 4 : 7;

  return (
    <group>
      {Array.from({ length: ribs }, (_, index) => {
        const spread = (index - (ribs - 1) / 2) * 0.105;
        return (
          <mesh key={`rib-${index}`} rotation={[0.06, 0.58 + spread, spread * 0.5]}>
            <torusGeometry args={[1.38 + Math.abs(spread) * 0.22, 0.035, 8, 80]} />
            <meshStandardMaterial
              color={index % 2 ? '#f8ffff' : '#a8bdc1'}
              metalness={0.92}
              roughness={0.18}
            />
          </mesh>
        );
      })}

      <mesh rotation={[0.08, -0.61, -0.04]}>
        <torusGeometry args={[1.47, 0.12, 14, 112]} />
        <meshPhysicalMaterial
          color="#e9ffff"
          transparent
          opacity={0.76}
          metalness={0.58}
          roughness={0.1}
          clearcoat={1}
        />
      </mesh>
      <mesh rotation={[0.08, -0.61, -0.04]} scale={1.035}>
        <torusGeometry args={[1.47, 0.018, 6, 112]} />
        <meshStandardMaterial color="#53f1f7" emissive="#08c5d1" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

function CoreScene({ reduced, visible, interactive, compact }: MotionSettings) {
  const assembly = useRef<THREE.Group>(null);
  const glassCore = useRef<THREE.Mesh>(null);
  const orbitOne = useRef<THREE.Mesh>(null);
  const orbitTwo = useRef<THREE.Mesh>(null);
  const orbitThree = useRef<THREE.Mesh>(null);
  const satelliteGroup = useRef<THREE.Group>(null);
  const { pointer, camera } = useThree();

  const particles = useMemo(() => {
    const positions = new Float32Array(54 * 3);
    for (let index = 0; index < 54; index += 1) {
      const angle = index * 2.399963;
      const radius = 2.05 + (index % 8) * 0.16;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = ((index % 11) - 5) * 0.3;
      positions[index * 3 + 2] = Math.sin(angle) * radius * 0.62;
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    if (!visible) return;

    const elapsed = state.clock.elapsedTime;
    const targetX = reduced ? 0.04 : interactive ? pointer.y * 0.2 : 0.04;
    const targetY = reduced ? -0.12 : interactive ? pointer.x * 0.32 : 0;

    if (assembly.current) {
      assembly.current.rotation.x = THREE.MathUtils.damp(
        assembly.current.rotation.x,
        targetX,
        3.2,
        delta
      );
      assembly.current.rotation.y = THREE.MathUtils.damp(
        assembly.current.rotation.y,
        targetY + (reduced ? 0 : elapsed * 0.055),
        2.7,
        delta
      );
      assembly.current.position.x = THREE.MathUtils.damp(
        assembly.current.position.x,
        reduced || !interactive ? 0 : pointer.x * 0.18,
        3,
        delta
      );
      assembly.current.position.y = THREE.MathUtils.damp(
        assembly.current.position.y,
        reduced || !interactive ? 0.32 : 0.32 + pointer.y * 0.12,
        3,
        delta
      );
    }

    if (!reduced) {
      if (glassCore.current) glassCore.current.rotation.y -= delta * 0.1;
      if (orbitOne.current) orbitOne.current.rotation.z += delta * 0.095;
      if (orbitTwo.current) orbitTwo.current.rotation.x -= delta * 0.065;
      if (orbitThree.current) orbitThree.current.rotation.y += delta * 0.075;
      if (satelliteGroup.current) satelliteGroup.current.rotation.y -= delta * 0.04;
      camera.position.x = THREE.MathUtils.damp(
        camera.position.x,
        interactive ? pointer.x * 0.24 : 0,
        2.5,
        delta
      );
      camera.position.y = THREE.MathUtils.damp(
        camera.position.y,
        interactive ? 0.16 + pointer.y * 0.14 : 0.16,
        2.5,
        delta
      );
      camera.lookAt(0, 0.12, 0);
    }
  });

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[4, 5, 5]} intensity={3.2} color="#ffffff" />
      <directionalLight position={[-4, 1, 3]} intensity={1.2} color="#c8fbfd" />
      <pointLight position={[-2.5, 1.5, 3]} intensity={32} distance={7} color="#08dce7" />
      <pointLight position={[2.6, -0.7, 2.2]} intensity={18} distance={6} color="#a7fbff" />

      <group ref={assembly} position={[0, 0.32, 0]}>
        <mesh scale={0.89}>
          <sphereGeometry args={[1.16, 56, 40]} />
          <meshStandardMaterial
            color="#08c5d1"
            emissive="#08c5d1"
            emissiveIntensity={1.4}
            metalness={0.35}
            roughness={0.18}
          />
        </mesh>

        <mesh ref={glassCore} scale={1.08}>
          <sphereGeometry args={[1.2, 48, 36]} />
          <meshPhysicalMaterial
            color="#d9fbfd"
            transparent
            opacity={0.24}
            roughness={0.06}
            metalness={0.2}
            clearcoat={1}
            clearcoatRoughness={0.05}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh scale={1.13}>
          <icosahedronGeometry args={[1.18, 2]} />
          <meshBasicMaterial color="#aef6fa" wireframe transparent opacity={0.15} />
        </mesh>

        <mesh scale={1.02} rotation={[0, 0.2, 0]}>
          <sphereGeometry args={[1.22, compact ? 28 : 48, compact ? 20 : 32]} />
          <meshBasicMaterial color="#d5fbfd" wireframe transparent opacity={0.08} />
        </mesh>

        <mesh position={[0, 0, 1.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.93, 0.93, 0.28, 64]} />
          <meshStandardMaterial color="#f4f8f8" metalness={0.9} roughness={0.17} />
        </mesh>
        <mesh position={[0, 0, 1.24]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.91, 0.08, 14, 96]} />
          <meshStandardMaterial color="#ffffff" metalness={0.82} roughness={0.16} />
        </mesh>
        <mesh position={[0, 0, 1.19]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.74, 0.018, 8, 80]} />
          <meshStandardMaterial color="#53f4fa" emissive="#08c5d1" emissiveIntensity={2.2} />
        </mesh>
        <MechanicalFace compact={compact} />
        <MetallicS />

        <ShellArchitecture compact={compact} />

        <mesh ref={orbitOne} rotation={[1.13, 0.26, 0.15]}>
          <torusGeometry args={[1.91, 0.045, 10, 128]} />
          <meshStandardMaterial color="#f8ffff" metalness={0.9} roughness={0.16} />
        </mesh>
        <mesh ref={orbitTwo} rotation={[0.28, 1.04, 0.62]}>
          <torusGeometry args={[2.13, 0.021, 8, 128]} />
          <meshStandardMaterial
            color="#67ecf3"
            emissive="#08c5d1"
            emissiveIntensity={1.2}
            metalness={0.62}
            roughness={0.18}
          />
        </mesh>
        <mesh ref={orbitThree} rotation={[1.38, 0.2, 1.02]}>
          <torusGeometry args={[2.32, 0.012, 6, 128]} />
          <meshBasicMaterial color="#d5fcfe" transparent opacity={0.52} />
        </mesh>

        <group ref={satelliteGroup}>
          {satellites.map(([x, y, z, size], index) => (
            <Float
              key={index}
              speed={reduced ? 0 : 0.9 + index * 0.08}
              rotationIntensity={reduced ? 0 : 0.32}
              floatIntensity={reduced ? 0 : 0.3}
            >
              <mesh position={[x, y, z]}>
                <sphereGeometry args={[size, 24, 24]} />
                <meshStandardMaterial
                  color={index % 2 ? '#f8ffff' : '#08c5d1'}
                  emissive={index % 2 ? '#000000' : '#08c5d1'}
                  emissiveIntensity={index % 2 ? 0 : 1.25}
                  metalness={0.82}
                  roughness={0.14}
                />
              </mesh>
            </Float>
          ))}
        </group>
      </group>

      <points position={[0, 0.2, -0.15]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#76f2f7" size={0.038} transparent opacity={0.72} sizeAttenuation />
      </points>

      <group position={[0, -1.98, 0]}>
        <mesh position={[0, -0.28, 0]} scale={[1.12, 0.18, 0.72]}>
          <sphereGeometry args={[2.05, 42, 18]} />
          <meshBasicMaterial color="#06171c" transparent opacity={0.32} depthWrite={false} />
        </mesh>
        <mesh position={[0, -0.16, 0]}>
          <cylinderGeometry args={[1.94, 2.18, 0.22, 72]} />
          <meshStandardMaterial color="#879ca0" metalness={0.9} roughness={0.22} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[1.75, 2.12, 0.48, 72]} />
          <meshStandardMaterial color="#dce6e8" metalness={0.76} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <torusGeometry args={[1.58, 0.07, 14, 112]} />
          <meshStandardMaterial color="#2af4fb" emissive="#08c5d1" emissiveIntensity={2.6} />
        </mesh>
        <mesh position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.52, 72]} />
          <meshStandardMaterial color="#b8c7ca" metalness={0.88} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 1.34, 64]} />
          <meshBasicMaterial color="#bffcff" transparent opacity={0.28} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.315, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.07, 1.11, 64]} />
          <meshStandardMaterial color="#3ef5fb" emissive="#08c5d1" emissiveIntensity={2.5} />
        </mesh>
      </group>
    </>
  );
}

function StaticFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden [perspective:1000px]">
      <div
        className="absolute left-1/2 top-[45%] h-[270px] w-[270px] -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 ease-out [transform-style:preserve-3d] motion-reduce:transition-none sm:h-[330px] sm:w-[330px]"
        style={{
          transform:
            'translate3d(calc(-50% + var(--hero-x)), calc(-50% + var(--hero-y)), 0) rotateX(var(--hero-rx)) rotateY(var(--hero-ry))',
        }}
      >
        <div className="absolute inset-0 rounded-full border-[12px] border-white/75 bg-[radial-gradient(circle_at_31%_25%,#ffffff_0%,#e9fbfc_18%,rgba(151,239,243,0.72)_39%,rgba(8,197,209,0.84)_66%,#0b6670_100%)] shadow-[inset_-28px_-24px_55px_rgba(9,39,46,0.5),inset_20px_15px_38px_rgba(255,255,255,0.8),0_0_80px_rgba(8,197,209,0.38)]" />
        <div className="absolute inset-[9%] rounded-full border border-white/60 bg-[repeating-radial-gradient(circle_at_center,transparent_0_13px,rgba(255,255,255,0.18)_14px_15px)] opacity-70" />
        <div className="absolute -inset-[10%] rounded-full border-[18px] border-white/80 shadow-[inset_0_0_20px_rgba(8,197,209,0.18),0_8px_24px_rgba(0,0,0,0.16)] [transform:rotateY(58deg)_rotateZ(10deg)]" />
        <div className="absolute -inset-[17%] animate-[spin_16s_linear_infinite] rounded-[50%] border-[5px] border-white/75 [transform:rotateX(68deg)_rotateZ(-18deg)] motion-reduce:animate-none" />
        <div className="absolute left-1/2 top-1/2 h-[34%] w-[120%] -translate-x-1/2 -translate-y-1/2 -rotate-[19deg] rounded-[50%] border-[9px] border-[#e9f5f6]/90 shadow-[0_0_12px_rgba(8,197,209,0.35)]" />
        <div className="absolute inset-[20%] flex items-center justify-center rounded-full border-[8px] border-white/90 bg-[linear-gradient(145deg,#ffffff,#d5e1e3)] shadow-[0_18px_38px_rgba(4,29,35,0.32),inset_-9px_-8px_18px_rgba(79,105,110,0.22)]">
          <span className="bg-[linear-gradient(145deg,#cbdadd,#596b70_55%,#efffff)] bg-clip-text text-[86px] font-black leading-none text-transparent drop-shadow-[0_5px_4px_rgba(0,0,0,0.18)] sm:text-[104px]">
            S
          </span>
          <span className="absolute h-3 w-16 -rotate-[22deg] rounded-full bg-[#35f2f8] opacity-70 blur-md" />
        </div>
        {[
          'left-[-23%] top-[20%] h-9 w-9',
          'right-[-18%] top-[2%] h-12 w-12',
          'right-[-24%] bottom-[12%] h-8 w-8',
          'left-[-12%] bottom-[-17%] h-7 w-7',
        ].map((position, index) => (
          <span
            key={position}
            className={`absolute ${position} rounded-full border border-white/80 bg-[radial-gradient(circle_at_30%_25%,#ffffff,#a6c6ca_68%,#08c5d1)] shadow-[0_8px_18px_rgba(0,0,0,0.22)] ${index % 2 ? 'animate-[bounce_5s_ease-in-out_infinite]' : 'animate-[bounce_6s_ease-in-out_infinite]'} motion-reduce:animate-none`}
          />
        ))}
      </div>

      <div className="absolute bottom-[6.5%] left-1/2 h-[92px] w-[350px] -translate-x-1/2 rounded-[50%] border border-white/60 bg-[linear-gradient(180deg,#eef6f7_0%,#b6c8cb_58%,#8da4a8_100%)] shadow-[0_25px_45px_rgba(0,0,0,0.3)] sm:w-[430px]">
        <div className="absolute -top-3 left-[7%] h-[40px] w-[86%] rounded-[50%] border-[5px] border-[#8ff8fc] bg-[#9aafb3] shadow-[inset_0_0_18px_#08c5d1,0_0_20px_rgba(8,197,209,0.75)]" />
        <div className="absolute inset-x-0 bottom-4 text-center text-sm font-extrabold tracking-[0.38em] text-[#617c82]">
          SUMMECA
        </div>
      </div>
    </div>
  );
}

export default function SummecaAiCore() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [interactive, setInteractive] = useState(true);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointerQuery = window.matchMedia('(pointer: coarse)');
    const compactQuery = window.matchMedia('(max-width: 767px)');
    const updateMotion = () => setReduced(motionQuery.matches);
    const updatePointer = () => setInteractive(!pointerQuery.matches);
    const updateDetail = () => setCompact(compactQuery.matches);
    updateMotion();
    updatePointer();
    updateDetail();
    motionQuery.addEventListener('change', updateMotion);
    pointerQuery.addEventListener('change', updatePointer);
    compactQuery.addEventListener('change', updateDetail);

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
      compactQuery.removeEventListener('change', updateDetail);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative h-full w-full">
      {supported !== true && <StaticFallback />}
      {supported === true && (
        <Canvas
          className="relative z-10"
          camera={{ position: [0, 0.16, 6.65], fov: 44, near: 0.1, far: 30 }}
          dpr={[1, 1.5]}
          frameloop={visible && !reduced ? 'always' : 'demand'}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          fallback={<StaticFallback />}
        >
          <CoreScene
            reduced={reduced}
            visible={visible}
            interactive={interactive}
            compact={compact}
          />
        </Canvas>
      )}
    </div>
  );
}