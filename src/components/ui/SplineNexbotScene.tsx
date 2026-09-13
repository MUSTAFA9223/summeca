'use client';

import { useEffect, useRef, useState } from 'react';
import Spline from '@splinetool/react-spline';

const NEXBOT_SCENE_URL = 'https://prod.spline.design/BAodEVjHSYLR1KKy/scene.splinecode';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

type SplineNexbotSceneProps = {
  className?: string;
  interactive?: boolean;
  pointerScopeSelector?: string;
};

export default function SplineNexbotScene({
  className = '',
  interactive = true,
  pointerScopeSelector = 'main',
}: SplineNexbotSceneProps) {
  const [ready, setReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!interactive || !ready || !pointerScopeSelector) return;

    const root = rootRef.current;
    const scope = root?.closest(pointerScopeSelector) as HTMLElement | null;
    const canvas = root?.querySelector('canvas');

    if (!root || !scope || !(canvas instanceof HTMLCanvasElement)) return;

    let animationFrame: number | null = null;
    let latestPointer: PointerEvent | null = null;

    const dispatchMappedPointer = () => {
      animationFrame = null;
      const event = latestPointer;
      latestPointer = null;
      if (!event) return;

      const scopeRect = scope.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      if (
        scopeRect.width <= 0 ||
        scopeRect.height <= 0 ||
        canvasRect.width <= 0 ||
        canvasRect.height <= 0
      ) {
        return;
      }

      const xRatio = clamp01((event.clientX - scopeRect.left) / scopeRect.width);
      const yRatio = clamp01((event.clientY - scopeRect.top) / scopeRect.height);
      const clientX = canvasRect.left + xRatio * canvasRect.width;
      const clientY = canvasRect.top + yRatio * canvasRect.height;

      canvas.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: event.pointerId,
          pointerType: event.pointerType || 'mouse',
          isPrimary: event.isPrimary,
          clientX,
          clientY,
          button: event.button,
          buttons: event.buttons,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          metaKey: event.metaKey,
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      );

      canvas.dispatchEvent(
        new MouseEvent('mousemove', {
          clientX,
          clientY,
          button: event.button,
          buttons: event.buttons,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          metaKey: event.metaKey,
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      );
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;

      const target = event.target;
      if (target instanceof Node && root.contains(target)) return;

      latestPointer = event;
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(dispatchMappedPointer);
      }
    };

    scope.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      scope.removeEventListener('pointermove', handlePointerMove);
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, [interactive, pointerScopeSelector, ready]);

  return (
    <div
      ref={rootRef}
      className={`relative h-full w-full overflow-hidden ${className}`}
      data-spline-scene="nexbot"
      data-spline-ready={ready ? 'true' : 'false'}
      style={{ touchAction: 'pan-y' }}
    >
      <div
        className={`absolute inset-0 transition-opacity duration-200 ${ready ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden={!ready}
      >
        <Spline
          scene={NEXBOT_SCENE_URL}
          onLoad={() => setReady(true)}
          className="absolute inset-0 h-full w-full"
          style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
            touchAction: 'pan-y',
            pointerEvents: interactive ? 'auto' : 'none',
          }}
        />
      </div>

      {!ready && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-transparent">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300" />
        </div>
      )}
    </div>
  );
}
