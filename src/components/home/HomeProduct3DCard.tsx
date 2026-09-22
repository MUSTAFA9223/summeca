'use client';

import { type PointerEvent as ReactPointerEvent, type ReactNode, useRef } from 'react';

type HomeProduct3DCardProps = {
  children: ReactNode;
};

export default function HomeProduct3DCard({ children }: HomeProduct3DCardProps) {
  const glareRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    const rotateX = (0.5 - y) * 7;
    const rotateY = (x - 0.5) * 9;

    event.currentTarget.style.transform =
      `perspective(1100px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;

    if (glareRef.current) {
      glareRef.current.style.opacity = '1';
      glareRef.current.style.background =
        `radial-gradient(circle at ${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%, rgba(103,232,249,.20) 0, rgba(34,211,238,.08) 20%, transparent 48%)`;
    }
  };

  const reset = (event: ReactPointerEvent<HTMLElement>) => {
    event.currentTarget.style.transform =
      'perspective(1100px) rotateX(0deg) rotateY(0deg) translateY(0)';

    if (glareRef.current) {
      glareRef.current.style.opacity = '0';
    }
  };

  return (
    <article
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
      className="group relative flex h-full min-h-[470px] flex-col overflow-hidden rounded-[22px] border border-border bg-card shadow-sm transition-[transform,border-color,box-shadow] duration-200 ease-out hover:border-primary/35 hover:shadow-xl focus-within:border-primary/40 motion-reduce:transform-none motion-reduce:transition-none"
      style={{
        transform: 'perspective(1100px) rotateX(0deg) rotateY(0deg) translateY(0)',
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        backfaceVisibility: 'hidden',
      }}
    >
      <div
        ref={glareRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-40 rounded-[inherit] opacity-0 transition-opacity duration-200 motion-reduce:hidden"
      />
      {children}
    </article>
  );
}
