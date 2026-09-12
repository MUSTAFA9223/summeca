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
      <Spline
        scene={NEXBOT_SCENE_URL}
        onLoad={() => setReady(true)}
        className="absolute inset-0 h-full w-full"
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'pan-y',
          pointerEvents: interactive ? 'auto' : 'none',
        }}
      />

      {!ready && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300" />
        </div>
      )}
    </div>
  );
}
