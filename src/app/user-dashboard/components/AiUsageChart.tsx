'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const AiUsageChartInner = dynamic(() => import('./AiUsageChartInner'), { ssr: false });

export default function AiUsageChart() {
  return <AiUsageChartInner />;
}