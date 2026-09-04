'use client';

import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  DollarSign, ShoppingBag, CheckCircle, Clock, Users, RefreshCw, Package, Download, TrendingUp, Cpu,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const Animated3DBackground = dynamic(
  () => import('@/components/ui/Animated3DBackground'),
  { ssr: false }
);

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  pendingPayments: number;
  totalCustomers: number;
  activeSubscriptions: number;
  totalProducts: number;
  totalDownloads: number;
}

interface ChartPoint {
  date: string;
  revenue: number;
  orders: number;
  completed: number;
  pending: number;
}

interface TopProduct {
  name: string;
  revenue: number;
  count: number;
}

interface Props {
  stats: Stats;
  initialChartData: ChartPoint[];
  topProducts: TopProduct[];
}

const kpiConfig = [
  { key: 'totalRevenue', label: 'Total Revenue', icon: DollarSign, iconBg: 'bg-success/10', iconColor: 'text-success', format: 'currency' },
  { key: 'totalOrders', label: 'Total Orders', icon: ShoppingBag, iconBg: 'bg-primary/10', iconColor: 'text-primary', format: 'number' },
  { key: 'completedOrders', label: 'Completed Orders', icon: CheckCircle, iconBg: 'bg-success/10', iconColor: 'text-success', format: 'number' },
  { key: 'pendingPayments', label: 'Pending Payments', icon: Clock, iconBg: 'bg-warning/10', iconColor: 'text-warning', format: 'number' },
  { key: 'totalCustomers', label: 'Total Customers', icon: Users, iconBg: 'bg-accent/10', iconColor: 'text-accent', format: 'number' },
  { key: 'activeSubscriptions', label: 'Active Subscriptions', icon: RefreshCw, iconBg: 'bg-info/10', iconColor: 'text-info', format: 'number' },
  { key: 'totalProducts', label: 'Total Products', icon: Package, iconBg: 'bg-primary/10', iconColor: 'text-primary', format: 'number' },
  { key: 'totalDownloads', label: 'Total Downloads', icon: Download, iconBg: 'bg-accent/10', iconColor: 'text-accent', format: 'number' },
];

function formatValue(value: number, format: string) {
  if (format === 'currency') return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return value.toLocaleString('en-US');
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function AdminDashboardClient({ stats, initialChartData, topProducts }: Props) {
  const [activeChart, setActiveChart] = useState<'revenue' | 'orders' | 'payments'>('revenue');

  const chartData = initialChartData.map((d) => ({ ...d, date: formatDate(d.date) }));
  const isEmpty = initialChartData.length === 0;

  return (
    <div className="space-y-6 fade-in">
      {/* Header — very light 3D admin accent */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-5">
        <Animated3DBackground variant="admin" />
        {/* Subtle teal top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 via-accent/40 to-transparent rounded-t-2xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-gradient-teal flex items-center justify-center">
                <Cpu size={11} className="text-white" />
              </div>
              <span className="text-xs font-600 text-primary uppercase tracking-wide">Admin Control Center</span>
            </div>
            <h1 className="text-2xl font-800 text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Welcome back. Here&apos;s what&apos;s happening with SUMMECA.</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/8 border border-success/20">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></div>
            <span className="text-xs font-600 text-success">All systems operational</span>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiConfig.map((kpi) => {
          const value = stats[kpi.key as keyof Stats] as number;
          return (
            <div key={kpi.key} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/20 hover:shadow-md transition-all duration-200 group">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${kpi.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                  <kpi.icon size={16} className={kpi.iconColor} />
                </div>
              </div>
              <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1">{kpi.label}</p>
              <p className="text-2xl font-800 tabular-nums text-foreground">{formatValue(value, kpi.format)}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Main chart */}
        <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-700 text-foreground">Analytics (Last 30 days)</h2>
            <div className="flex gap-1">
              {(['revenue', 'orders', 'payments'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveChart(tab)}
                  className={`px-3 py-1.5 text-xs font-600 rounded-lg transition-all ${activeChart === tab ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {isEmpty ? (
            <div className="h-48 flex flex-col items-center justify-center text-center">
              <TrendingUp size={32} className="text-muted-foreground/40 mb-2" />
              <p className="text-sm font-600 text-muted-foreground">No data yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Charts will appear once orders are placed</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              {activeChart === 'revenue' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#0D9488" strokeWidth={2} fill="url(#colorRevenue)" />
                </AreaChart>
              ) : activeChart === 'orders' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#0D9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Top products */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-700 text-foreground mb-4">Top Products</h2>
          {topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Package size={28} className="text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No sales yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-700 text-primary">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-600 text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.count} orders</p>
                  </div>
                  <span className="text-xs font-700 text-success">${p.revenue.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
