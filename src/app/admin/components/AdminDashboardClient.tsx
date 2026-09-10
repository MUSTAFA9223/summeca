'use client';

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ShoppingBag, CheckCircle, Clock, Users, Package, Download, TrendingUp, Cpu, WalletCards } from 'lucide-react';
import dynamic from 'next/dynamic';

const Animated3DBackground = dynamic(() => import('@/components/ui/Animated3DBackground'), { ssr: false });

type RevenueTotal = { currency: string; amount: number };

interface Stats {
  revenueTotals: RevenueTotal[];
  totalOrders: number;
  completedOrders: number;
  pendingPayments: number;
  totalCustomers: number;
  totalProducts: number;
  totalDownloads: number;
}

interface ChartPoint {
  date: string;
  orders: number;
  completed: number;
  pending: number;
}

interface TopProduct {
  name: string;
  count: number;
}

interface Props {
  stats: Stats;
  initialChartData: ChartPoint[];
  topProducts: TopProduct[];
}

const kpiConfig = [
  { key: 'totalOrders', label: 'Total Orders', icon: ShoppingBag, iconBg: 'bg-primary/10', iconColor: 'text-primary' },
  { key: 'completedOrders', label: 'Completed Orders', icon: CheckCircle, iconBg: 'bg-success/10', iconColor: 'text-success' },
  { key: 'pendingPayments', label: 'Pending Payments', icon: Clock, iconBg: 'bg-warning/10', iconColor: 'text-warning' },
  { key: 'totalCustomers', label: 'Total Customers', icon: Users, iconBg: 'bg-accent/10', iconColor: 'text-accent' },
  { key: 'totalProducts', label: 'Total Products', icon: Package, iconBg: 'bg-primary/10', iconColor: 'text-primary' },
  { key: 'totalDownloads', label: 'Total Downloads', icon: Download, iconBg: 'bg-accent/10', iconColor: 'text-accent' },
] as const;

function formatCurrency(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function AdminDashboardClient({ stats, initialChartData, topProducts }: Props) {
  const [activeChart, setActiveChart] = useState<'orders' | 'payments'>('orders');
  const chartData = initialChartData.map((point) => ({ ...point, date: formatDate(point.date) }));
  const isEmpty = initialChartData.length === 0;

  return (
    <div className="space-y-6 fade-in">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-5">
        <Animated3DBackground variant="admin" />
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 via-accent/40 to-transparent rounded-t-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-gradient-teal flex items-center justify-center">
              <Cpu size={11} className="text-white" />
            </div>
            <span className="text-xs font-600 text-primary uppercase tracking-wide">Admin Control Center</span>
          </div>
          <h1 className="text-2xl font-800 text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Live commerce data from SUMMECA. Revenue is kept separate by currency.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <WalletCards size={17} className="text-primary" />
          <h2 className="text-sm font-700 text-foreground">Completed revenue by currency</h2>
        </div>
        {stats.revenueTotals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No completed paid revenue yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {stats.revenueTotals.map((item) => (
              <div key={item.currency} className="rounded-xl border border-border bg-secondary/30 px-4 py-3">
                <p className="text-xs text-muted-foreground">{item.currency}</p>
                <p className="text-lg font-800 text-foreground tabular-nums">{formatCurrency(item.amount, item.currency)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiConfig.map((kpi) => {
          const value = stats[kpi.key];
          return (
            <div key={kpi.key} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/20 hover:shadow-md transition-all duration-200 group">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl ${kpi.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                  <kpi.icon size={16} className={kpi.iconColor} />
                </div>
              </div>
              <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1">{kpi.label}</p>
              <p className="text-2xl font-800 tabular-nums text-foreground">{value.toLocaleString('en-US')}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-700 text-foreground">Order activity (Last 30 days)</h2>
            <div className="flex gap-1">
              {(['orders', 'payments'] as const).map((tab) => (
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
              <p className="text-sm font-600 text-muted-foreground">No order activity yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              {activeChart === 'orders' ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#0D9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="Pending payment" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-700 text-foreground mb-4">Top Products by completed orders</h2>
          {topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Package size={28} className="text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No completed orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={`${product.name}-${index}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-700 text-primary">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-600 text-foreground truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.count} completed orders</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
