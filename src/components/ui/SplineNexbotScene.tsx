'use client';

import { useState } from 'react';
import Spline from '@splinetool/react-spline';

const NEXBOT_SCENE_URL = 'https://prod.spline.design/BAodEVjHSYLR1KKy/scene.splinecode';

type SplineNexbotSceneProps = {
  className?: string;
  interactive?: boolean;
};

export default function SplineNexbotScene({
  className = '',
  interactive = true,
}: SplineNexbotSceneProps) {
  const [ready, setReady] = useState(false);

  return (
    <div
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
