'use client';

import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

const dailyData = [
  { date: 'Aug 1', requests: 82, cost: 0.18 },
  { date: 'Aug 2', requests: 145, cost: 0.32 },
  { date: 'Aug 3', requests: 97, cost: 0.21 },
  { date: 'Aug 4', requests: 178, cost: 0.39 },
  { date: 'Aug 5', requests: 203, cost: 0.45 },
  { date: 'Aug 6', requests: 67, cost: 0.15 },
  { date: 'Aug 7', requests: 41, cost: 0.09 },
  { date: 'Aug 8', requests: 189, cost: 0.42 },
  { date: 'Aug 9', requests: 234, cost: 0.51 },
  { date: 'Aug 10', requests: 156, cost: 0.34 },
  { date: 'Aug 11', requests: 212, cost: 0.47 },
  { date: 'Aug 12', requests: 278, cost: 0.61 },
  { date: 'Aug 13', requests: 143, cost: 0.31 },
  { date: 'Aug 14', requests: 89, cost: 0.20 },
  { date: 'Aug 15', requests: 198, cost: 0.44 },
  { date: 'Aug 16', requests: 267, cost: 0.59 },
  { date: 'Aug 17', requests: 189, cost: 0.42 },
  { date: 'Aug 18', requests: 234, cost: 0.51 },
  { date: 'Aug 19', requests: 156, cost: 0.34 },
  { date: 'Aug 20', requests: 312, cost: 0.68 },
  { date: 'Aug 21', requests: 78, cost: 0.17 },
  { date: 'Aug 22', requests: 198, cost: 0.44 },
  { date: 'Aug 23', requests: 243, cost: 0.53 },
  { date: 'Aug 24', requests: 167, cost: 0.37 },
  { date: 'Aug 25', requests: 289, cost: 0.63 },
  { date: 'Aug 26', requests: 134, cost: 0.29 },
  { date: 'Aug 27', requests: 198, cost: 0.43 },
  { date: 'Aug 28', requests: 143, cost: 0.31 },
];

const productData = [
  { product: 'Content Gen', requests: 1842 },
  { product: 'PDF Analyzer', requests: 1156 },
  { product: 'Cost Guard', requests: 743 },
  { product: 'Resume AI', requests: 490 },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-card-lg p-3 text-xs">
        <div className="font-600 text-foreground mb-1.5">{label}</div>
        {payload.map((p, i) => (
          <div key={`tooltip-entry-${i}`} className="flex items-center gap-2 text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <span>{p.name === 'requests' ? `${p.value} requests` : `$${p.value} est. cost`}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function AiUsageChartInner() {
  const [activeTab, setActiveTab] = useState<'daily' | 'product'>('daily');

  return (
    <div className="bg-card border border-border rounded-2xlp-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-700 text-foreground">AI Usage</h3>
          <p className="text-xs text-muted-foreground mt-0.5">August 2026 · 4,231 / 5,000 requests</p>
        </div>
        <div className="flex bg-secondary rounded-lg p-0.5">
          {(['daily', 'product'] as const).map((tab) => (
            <button
              key={`chart-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-600 transition-all duration-150 ${
                activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'daily' ? 'Daily trend' : 'By product'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'daily' ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
              interval={3}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="requests"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#usageGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={productData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="product"
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="requests" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-xs text-muted-foreground">Est. cost this month</span>
            <span className="text-xs font-700 text-foreground ml-1.5 tabular-nums">$9.31</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Avg daily</span>
            <span className="text-xs font-700 text-foreground ml-1.5 tabular-nums">151 req</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Resets Sep 1, 2026
        </div>
      </div>
    </div>
  );
}