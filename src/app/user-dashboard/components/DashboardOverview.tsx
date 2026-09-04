'use client';

import React from 'react';
import KpiGrid from './KpiGrid';
import AiUsageChart from './AiUsageChart';
import ActiveSubscriptions from './ActiveSubscriptions';
import RecentOrders from './RecentOrders';
import DownloadsPanel from './DownloadsPanel';
import ApiKeysPanel from './ApiKeysPanel';
import RecommendedForYou from '@/components/RecommendedForYou';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, ArrowRight, Cpu, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const Animated3DBackground = dynamic(
  () => import('@/components/ui/Animated3DBackground'),
  { ssr: false }
);

export default function DashboardOverview() {
  const { user } = useAuth();

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')?.[0] ||
    'there';

  return (
    <div className="space-y-7">
      {/* Header — subtle 3D welcome section */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 p-6"
        style={{ background: 'linear-gradient(135deg, #f0fdfa 0%, #ecfeff 50%, #f0f9ff 100%)' }}
      >
        <Animated3DBackground variant="subtle" />
        {/* Inner glow */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-gradient-teal flex items-center justify-center">
                <Cpu size={12} className="text-white" />
              </div>
              <span className="text-xs font-600 text-primary uppercase tracking-wide">SUMMECA Dashboard</span>
            </div>
            <h1 className="text-2xl font-700 text-foreground">
              Welcome back, <span className="text-gradient-primary">{displayName}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Here&apos;s what&apos;s happening with your SUMMECA account today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/8 border border-success/20 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
              <span className="text-xs font-600 text-success">All systems operational</span>
            </div>
            <Link
              href="/products"
              className="hidden sm:flex items-center gap-1.5 btn-primary text-xs px-3.5 py-2"
            >
              <Sparkles size={12} />
              Explore Products
              <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <KpiGrid />

      {/* Charts + Subscriptions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <AiUsageChart />
        </div>
        <div className="xl:col-span-1">
          <ActiveSubscriptions />
        </div>
      </div>

      {/* Orders + Downloads */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <RecentOrders />
        </div>
        <div className="xl:col-span-1">
          <DownloadsPanel />
        </div>
      </div>

      {/* API Keys */}
      <ApiKeysPanel />

      {/* AI Recommendations — subtle 3D section */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-border p-6">
        <Animated3DBackground variant="subtle" />
        {/* Teal accent top bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-transparent rounded-t-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-teal flex items-center justify-center">
              <TrendingUp size={13} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-700 text-foreground">AI Suggestions For You</h3>
              <p className="text-xs text-muted-foreground">Personalized picks based on your activity</p>
            </div>
          </div>
          <RecommendedForYou
            title=""
            subtitle=""
            maxItems={4}
          />
        </div>
      </div>
    </div>
  );
}