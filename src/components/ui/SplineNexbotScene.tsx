'use client';

import dynamic from 'next/dynamic';
import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';

const Spline = dynamic(() => import('./SplineClient'), {
  ssr: false,
  loading: () => null,
});

const NEXBOT_SCENE_URL = 'https://prod.spline.design/BAodEVjHSYLR1KKy/scene.splinecode';

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

type SplineNexbotSceneProps = {
  className?: string;
  interactive?: boolean;
  pointerScopeSelector?: string;
};

function StaticNexbotFallback() {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      data-spline-fallback="true"
      role="img"
      aria-label="SUMMECA interactive scene fallback"
    >
      <div className="absolute h-[58%] aspect-square rounded-full border border-cyan-300/15 bg-cyan-300/[0.035] shadow-[0_0_90px_rgba(34,211,238,0.12)]" />
      <div className="absolute h-[40%] aspect-square rounded-full border border-dashed border-cyan-200/20 motion-safe:animate-[spin_24s_linear_infinite]" />
      <div className="relative grid h-28 w-28 place-items-center rounded-[2rem] border border-cyan-200/25 bg-[#09161b]/85 shadow-[0_24px_70px_rgba(0,0,0,.42),0_0_45px_rgba(34,211,238,.12)] backdrop-blur-xl sm:h-36 sm:w-36">
        <span className="text-3xl font-black tracking-[-0.08em] text-cyan-200 sm:text-4xl">
          SMC
        </span>
        <span className="absolute -bottom-8 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.32em] text-cyan-100/55">
          SUMMECA
        </span>
      </div>
    </div>
  );
}

class SplineSceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(
      '[SplineNexbotScene] Interactive scene failed; using fallback.',
      error.message,
      info.componentStack
    );
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function SplineNexbotScene({
  className = '',
  interactive = true,
  pointerScopeSelector = 'main',
}: SplineNexbotSceneProps) {
  const [ready, setReady] = useState(false);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const supported =
        Boolean(
          window.WebGL2RenderingContext &&
          canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true })
        ) ||
        Boolean(
          window.WebGLRenderingContext &&
          canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true })
        );
      setWebglSupported(supported);
    } catch {
      setWebglSupported(false);
    }
  }, []);

  useEffect(() => {
    if (!interactive || !ready || !pointerScopeSelector || webglSupported !== true || failed)
      return;

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
        })
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
        })
      );
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;

      const target = event.target;
      if (target instanceof Node && root.contains(target)) return;

      // Keep the robot responsive near its visual stage, but ignore distant pointer
      // movement over the hero copy and CTAs so it does not compete for attention.
      const rootRect = root.getBoundingClientRect();
      const xPad = Math.min(96, rootRect.width * 0.12);
      const yPad = Math.min(64, rootRect.height * 0.1);
      const withinVisualZone =
        event.clientX >= rootRect.left - xPad &&
        event.clientX <= rootRect.right + xPad &&
        event.clientY >= rootRect.top - yPad &&
        event.clientY <= rootRect.bottom + yPad;

      if (!withinVisualZone) return;

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
  }, [failed, interactive, pointerScopeSelector, ready, webglSupported]);

  const showFallback = webglSupported === false || failed;
  const showLoader = webglSupported === null || (webglSupported === true && !ready && !failed);

  return (
    <div
      ref={rootRef}
      className={`relative h-full w-full overflow-hidden ${className}`}
      data-spline-scene="nexbot"
      data-spline-ready={ready ? 'true' : 'false'}
      style={{ touchAction: 'pan-y' }}
    >
      {showFallback && <StaticNexbotFallback />}

      {webglSupported === true && !failed && (
        <SplineSceneBoundary onFailure={() => setFailed(true)}>
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
        </SplineSceneBoundary>
      )}

      {showLoader && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-transparent">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300" />
        </div>
      )}
    </div>
  );
}
