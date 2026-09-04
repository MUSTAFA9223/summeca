import React from 'react';
import { Package, Activity, DollarSign, Download, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

const kpis = [
  {
    id: 'kpi-active-products',
    label: 'Active Products',
    value: '3',
    subtext: '2 subscriptions · 1 lifetime',
    icon: Package,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    trend: null,
    alert: false,
  },
  {
    id: 'kpi-ai-requests',
    label: 'AI Requests This Month',
    value: '4,231',
    subtext: '84% of 5,000 limit used',
    icon: Activity,
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
    trend: { direction: 'up', value: '+18%', label: 'vs last month' },
    alert: true,
    progress: 84,
    progressColor: 'bg-warning',
  },
  {
    id: 'kpi-total-spend',
    label: 'Total Spend',
    value: '$156',
    subtext: '$39/mo active · $12 one-time · $105 lifetime',
    icon: DollarSign,
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
    trend: { direction: 'up', value: '+$39', label: 'this billing cycle' },
    alert: false,
  },
  {
    id: 'kpi-downloads',
    label: 'Available Downloads',
    value: '2',
    subtext: '1 ready · 1 new this week',
    icon: Download,
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
    trend: null,
    alert: false,
  },
];

export default function KpiGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis?.map((kpi) => (
        <div
          key={kpi?.id}
          className={`rounded-2xl border p-5 transition-all duration-200 hover:shadow-card-md ${
            kpi?.alert
              ? 'border-warning/30 bg-gradient-to-br from-warning/5 to-warning/3' :'border-border bg-white hover:border-primary/20'
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl ${kpi?.iconBg} flex items-center justify-center`}>
              <kpi.icon size={18} className={kpi?.iconColor} />
            </div>
            {kpi?.alert && (
              <div className="flex items-center gap-1 text-xs font-600 text-warning bg-warning/10 px-2 py-1 rounded-full">
                <AlertTriangle size={11} />
                <span>Near limit</span>
              </div>
            )}
          </div>

          <div className="mb-1">
            <p className="text-xs font-600 text-muted-foreground uppercase tracking-wide mb-1">
              {kpi?.label}
            </p>
            <p className="text-3xl font-800 tabular-nums text-foreground">{kpi?.value}</p>
          </div>

          {kpi?.progress !== undefined && (
            <div className="mb-2">
              <div className="usage-bar-track mt-2">
                <div
                  className={`usage-bar-fill ${kpi?.progressColor}`}
                  style={{ width: `${kpi?.progress}%` }}
                ></div>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground leading-snug">{kpi?.subtext}</p>

          {kpi?.trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-600 ${
              kpi?.trend?.direction === 'up' ? 'text-success' : 'text-danger'
            }`}>
              {kpi?.trend?.direction === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              <span>{kpi?.trend?.value}</span>
              <span className="text-muted-foreground font-400">{kpi?.trend?.label}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}