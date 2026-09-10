'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  Cpu,
  Gauge,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

type UsageRow = {
  id: string;
  period_start: string;
  period_end: string;
  requests_count: number | null;
  tokens_used: number | null;
  monthly_limit: number | null;
};

type GenerationRow = {
  id: string;
  generation_type: string;
  model: string;
  tokens_used: number | null;
  duration_ms: number | null;
  created_at: string;
};

const numberFormatter = new Intl.NumberFormat('en-US');

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatGenerationType(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function UsagePage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [usageRows, setUsageRows] = useState<UsageRow[]>([]);
  const [activityRows, setActivityRows] = useState<GenerationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [usageError, setUsageError] = useState(false);
  const [activityError, setActivityError] = useState(false);

  const loadUsage = useCallback(async () => {
    if (!user?.id) {
      setUsageRows([]);
      setActivityRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setUsageError(false);
    setActivityError(false);

    const [usageResult, activityResult] = await Promise.all([
      supabase
        .from('ai_usage')
        .select('id, period_start, period_end, requests_count, tokens_used, monthly_limit')
        .eq('user_id', user.id)
        .order('period_start', { ascending: false })
        .limit(12),
      supabase
        .from('ai_generations')
        .select('id, generation_type, model, tokens_used, duration_ms, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (usageResult.error) {
      setUsageRows([]);
      setUsageError(true);
    } else {
      setUsageRows((usageResult.data ?? []) as UsageRow[]);
    }

    if (activityResult.error) {
      setActivityRows([]);
      setActivityError(true);
    } else {
      setActivityRows((activityResult.data ?? []) as GenerationRow[]);
    }

    setLoading(false);
  }, [supabase, user?.id]);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  const monthKey = new Date().toISOString().slice(0, 7);
  const currentUsage = usageRows.find((row) => row.period_start.slice(0, 7) === monthKey) ?? null;
  const requests = Number(currentUsage?.requests_count ?? 0);
  const tokens = Number(currentUsage?.tokens_used ?? 0);
  const limit = currentUsage?.monthly_limit == null ? null : Number(currentUsage.monthly_limit);
  const remaining = limit == null ? null : Math.max(0, limit - requests);
  const progress = limit && limit > 0 ? Math.min(100, Math.round((requests / limit) * 100)) : 0;

  const cards = [
    {
      label: 'Requests this month',
      value: numberFormatter.format(requests),
      detail: currentUsage ? 'Recorded for your account' : 'No usage recorded this month',
      icon: Activity,
    },
    {
      label: 'Tokens used',
      value: numberFormatter.format(tokens),
      detail: 'Recorded AI tokens this month',
      icon: Cpu,
    },
    {
      label: 'Monthly limit',
      value: limit == null ? '—' : numberFormatter.format(limit),
      detail: limit == null ? 'No limit record for this month' : `${progress}% used`,
      icon: Gauge,
    },
    {
      label: 'Remaining',
      value: remaining == null ? '—' : numberFormatter.format(remaining),
      detail: currentUsage?.period_end ? `Resets after ${formatDate(currentUsage.period_end)}` : 'No active usage period',
      icon: CalendarDays,
    },
  ];

  return (
    <DashboardLayout activeRoute="usage">
      <div className="space-y-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles size={14} className="text-primary" />
              </div>
              <span className="text-xs font-600 uppercase tracking-wide text-primary">Account analytics</span>
            </div>
            <h1 className="text-2xl font-700 text-foreground">AI Usage</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Live usage data linked only to your signed-in SUMMECA account.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadUsage()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-3.5 py-2 text-xs font-600 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh usage
          </button>
        </div>

        {usageError && (
          <div className="rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-muted-foreground">
            Usage data is temporarily unavailable. Please refresh in a moment.
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
            <Loader2 size={18} className="mr-2 animate-spin" />
            Loading your AI usage...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-border bg-card p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <card.icon size={18} className="text-primary" />
                  </div>
                  <p className="text-xs font-600 uppercase tracking-wide text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-3xl font-800 tabular-nums text-foreground">{card.value}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{card.detail}</p>
                </div>
              ))}
            </div>

            {limit != null && limit > 0 && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-700 text-foreground">Monthly request allowance</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {numberFormatter.format(requests)} of {numberFormatter.format(limit)} requests used
                    </p>
                  </div>
                  <span className="text-sm font-700 tabular-nums text-primary">{progress}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="text-sm font-700 text-foreground">Monthly history</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Up to the latest 12 recorded periods</p>
                </div>

                {usageRows.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <Activity size={28} className="mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm font-600 text-foreground">No AI usage recorded yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Your real usage will appear here after AI requests are recorded.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-secondary/50 text-muted-foreground">
                        <tr>
                          <th className="px-5 py-3 font-600">Period</th>
                          <th className="px-5 py-3 font-600">Requests</th>
                          <th className="px-5 py-3 font-600">Tokens</th>
                          <th className="px-5 py-3 font-600">Limit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {usageRows.map((row) => (
                          <tr key={row.id}>
                            <td className="whitespace-nowrap px-5 py-3 font-600 text-foreground">{formatDate(row.period_start)}</td>
                            <td className="px-5 py-3 tabular-nums text-muted-foreground">{numberFormatter.format(Number(row.requests_count ?? 0))}</td>
                            <td className="px-5 py-3 tabular-nums text-muted-foreground">{numberFormatter.format(Number(row.tokens_used ?? 0))}</td>
                            <td className="px-5 py-3 tabular-nums text-muted-foreground">
                              {row.monthly_limit == null ? '—' : numberFormatter.format(Number(row.monthly_limit))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="border-b border-border px-5 py-4">
                  <h2 className="text-sm font-700 text-foreground">Recent AI activity</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Latest generations recorded for your account</p>
                </div>

                {activityError ? (
                  <div className="px-5 py-10 text-center text-xs text-muted-foreground">
                    Recent AI activity is temporarily unavailable.
                  </div>
                ) : activityRows.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <Sparkles size={28} className="mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm font-600 text-foreground">No recent AI activity</p>
                    <p className="mt-1 text-xs text-muted-foreground">Only activity actually recorded for this account is shown.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {activityRows.map((row) => (
                      <div key={row.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-600 text-foreground">{formatGenerationType(row.generation_type)}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{row.model} · {formatDateTime(row.created_at)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-600 tabular-nums text-foreground">{numberFormatter.format(Number(row.tokens_used ?? 0))} tokens</p>
                          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                            {row.duration_ms == null ? '—' : `${numberFormatter.format(row.duration_ms)} ms`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
