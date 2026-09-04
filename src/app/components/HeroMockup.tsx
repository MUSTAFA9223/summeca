import React from 'react';
import { Zap, CheckCircle, Activity } from 'lucide-react';

export default function HeroMockup() {
  const metrics = [
    { label: 'AI Requests', value: '4,231', change: '+12%', positive: true },
    { label: 'Active Tools', value: '3', change: 'Active', positive: true },
    { label: 'Cost Saved', value: '$847', change: 'this month', positive: true },
  ];

  const recentActivity = [
    { tool: 'AI Content Generator', action: 'Generated blog post', time: '2m ago', status: 'success' },
    { tool: 'AI PDF Analyzer', action: 'Analyzed 12-page report', time: '18m ago', status: 'success' },
    { tool: 'AI Cost Guard', action: 'Budget alert triggered', time: '1h ago', status: 'warning' },
  ];

  return (
    <div className="hero-mockup rounded-2xl p-5 max-w-md ml-auto">
      {/* Mockup header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-0.5">Dashboard</div>
          <div className="text-sm font-700 text-foreground">August 2026</div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/20">
          <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
          <span className="text-xs font-600 text-success">All systems live</span>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {metrics?.map((m) => (
          <div key={`mockup-metric-${m?.label}`} className="bg-secondary rounded-xl p-3">
            <div className="text-xs text-muted-foreground mb-1">{m?.label}</div>
            <div className="text-base font-700 tabular-nums text-foreground">{m?.value}</div>
            <div className={`text-xs font-500 ${m?.positive ? 'text-success' : 'text-danger'}`}>
              {m?.change}
            </div>
          </div>
        ))}
      </div>

      {/* Usage bar */}
      <div className="bg-secondary rounded-xl p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Activity size={13} className="text-primary" />
            <span className="text-xs font-600 text-foreground">AI Usage This Month</span>
          </div>
          <span className="text-xs font-700 tabular-nums text-foreground">4,231 / 5,000</span>
        </div>
        <div className="usage-bar-track">
          <div className="usage-bar-fill bg-primary" style={{ width: '84%' }}></div>
        </div>
        <div className="text-xs text-muted-foreground mt-1.5">84% used — 769 requests remaining</div>
      </div>

      {/* Recent activity */}
      <div>
        <div className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-2">Recent Activity</div>
        <div className="space-y-2">
          {recentActivity?.map((item) => (
            <div key={`mockup-activity-${item?.tool}`} className="flex items-center gap-2.5">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                item?.status === 'success' ? 'bg-success/10' : 'bg-warning/10'
              }`}>
                {item?.status === 'success'
                  ? <CheckCircle size={12} className="text-success" />
                  : <Zap size={12} className="text-warning" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-600 text-foreground truncate">{item?.tool}</div>
                <div className="text-xs text-muted-foreground truncate">{item?.action}</div>
              </div>
              <div className="text-xs text-muted-foreground flex-shrink-0">{item?.time}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart bars decorative */}
      <div className="mt-4 flex items-end gap-1 h-12">
        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 88]?.map((h, i) => (
          <div
            key={`mockup-bar-${i}`}
            className="flex-1 rounded-sm bg-primary/20"
            style={{ height: `${h}%` }}
          ></div>
        ))}
      </div>
    </div>
  );
}