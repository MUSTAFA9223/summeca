import React from 'react';
import { Zap, LayoutDashboard, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const subscriptions = [
  {
    id: 'sub-001',
    product: 'AI Content Generator',
    plan: 'Pro',
    icon: Zap,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    status: 'active' as const,
    renewsOn: 'Sep 14, 2026',
    daysUntilRenewal: 17,
    usagePercent: 87,
    usageLabel: '4,350 / 5,000 req',
    price: '$39/mo',
    alert: true,
  },
  {
    id: 'sub-002',
    product: 'Business Dashboard',
    plan: 'Pro',
    icon: LayoutDashboard,
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
    status: 'active' as const,
    renewsOn: 'Sep 28, 2026',
    daysUntilRenewal: 31,
    usagePercent: 34,
    usageLabel: '17 / 50 reports',
    price: '$49/mo',
    alert: false,
  },
  {
    id: 'sub-003',
    product: 'AI PDF Analyzer',
    plan: 'Free Trial',
    icon: Zap,
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
    status: 'trialing' as const,
    renewsOn: 'Sep 4, 2026',
    daysUntilRenewal: 7,
    usagePercent: 55,
    usageLabel: '11 / 20 docs',
    price: 'Trial',
    alert: false,
  },
];

const statusConfig = {
  active: { label: 'Active', color: 'bg-success/10 text-success', icon: CheckCircle },
  trialing: { label: 'Trial', color: 'bg-accent/10 text-accent', icon: Clock },
  past_due: { label: 'Past Due', color: 'bg-danger/10 text-danger', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground', icon: AlertTriangle },
};

export default function ActiveSubscriptions() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-700 text-foreground">Active Subscriptions</h3>
        <span className="text-xs text-primary font-600 cursor-pointer hover:text-primary/80 transition-colors">
          Manage all →
        </span>
      </div>

      <div className="space-y-4">
        {subscriptions.map((sub) => {
          const StatusIcon = statusConfig[sub.status].icon;
          return (
            <div
              key={sub.id}
              className={`rounded-xl border p-3.5 ${
                sub.alert ? 'border-warning/30 bg-warning/5' : 'border-border'
              }`}
            >
              <div className="flex items-start gap-2.5 mb-3">
                <div className={`w-8 h-8 rounded-lg ${sub.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <sub.icon size={15} className={sub.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-700 text-foreground truncate">{sub.product}</span>
                    {sub.alert && <AlertTriangle size={11} className="text-warning flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs font-600 px-1.5 py-0.5 rounded-full ${statusConfig[sub.status].color}`}>
                      {statusConfig[sub.status].label}
                    </span>
                    <span className="text-xs text-muted-foreground">{sub.plan}</span>
                  </div>
                </div>
                <span className="text-xs font-700 text-foreground flex-shrink-0 tabular-nums">{sub.price}</span>
              </div>

              {/* Usage bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{sub.usageLabel}</span>
                  <span className={`text-xs font-600 ${sub.usagePercent >= 80 ? 'text-warning' : 'text-muted-foreground'}`}>
                    {sub.usagePercent}%
                  </span>
                </div>
                <div className="usage-bar-track">
                  <div
                    className={`usage-bar-fill ${sub.usagePercent >= 80 ? 'bg-warning' : 'bg-primary'}`}
                    style={{ width: `${sub.usagePercent}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Renews {sub.renewsOn}
                </span>
                <span className={`text-xs font-600 ${sub.daysUntilRenewal <= 7 ? 'text-warning' : 'text-muted-foreground'}`}>
                  {sub.daysUntilRenewal}d left
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}