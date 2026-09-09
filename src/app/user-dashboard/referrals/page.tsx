'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';
import { CheckCheck, CheckCircle2, Clock, Copy, Gift, Loader2, Share2, Star, TrendingUp, Users } from 'lucide-react';

type ReferralStats = {
  referral_code: string | null;
  total_invitations: number;
  successful_referrals: number;
  rewards_by_currency: Record<string, number>;
  recent_referrals: Array<{
    id: string;
    status: string;
    reward_amount: number;
    reward_currency: string | null;
    created_at: string;
  }>;
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ComponentType<any> }> = {
  pending: { label: 'Pending', cls: 'bg-warning/10 text-warning', icon: Clock },
  registered: { label: 'Registered', cls: 'bg-info/10 text-info', icon: Users },
  purchased: { label: 'Purchased', cls: 'bg-success/10 text-success', icon: CheckCircle2 },
  rewarded: { label: 'Rewarded', cls: 'bg-primary/10 text-primary', icon: Star },
};

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) return null;
  try { return JSON.parse(text) as T; } catch { return null; }
}

function formatMoney(amount: number, currency: string) {
  if (currency === 'UNSPECIFIED') return `${amount.toFixed(2)} (currency unavailable)`;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function ReferralsPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://summeca.com').replace(/\/$/, '');

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch('/api/referrals/stats', { cache: 'no-store' });
      const data = await readJson<ReferralStats & { error?: string }>(response);
      if (!response.ok || !data) throw new Error(data?.error || 'Could not load referral statistics.');
      setStats(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load referral statistics.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void fetchStats(); }, [fetchStats]);

  const generateCode = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/referrals/generate', { method: 'POST' });
      const data = await readJson<{ referral_code?: string; error?: string }>(response);
      if (!response.ok || !data?.referral_code) throw new Error(data?.error || 'Could not create your referral link.');
      await fetchStats();
      toast.success('Your referral link is ready.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create your referral link.');
    } finally {
      setGenerating(false);
    }
  };

  const referralLink = stats?.referral_code ? `${siteUrl}/sign-up-login-screen?ref=${encodeURIComponent(stats.referral_code)}` : '';

  const copyLink = async () => {
    if (!referralLink || !stats?.referral_code) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      trackEvent('referral_signup', { referral_code: stats.referral_code });
      toast.success('Referral link copied.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy the referral link.');
    }
  };

  const rewards = useMemo(() => Object.entries(stats?.rewards_by_currency ?? {}), [stats]);

  if (authLoading) {
    return <DashboardLayout activeRoute="referrals"><div className="flex items-center justify-center h-64"><Loader2 size={28} className="animate-spin text-primary" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout activeRoute="referrals">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center"><Gift size={20} className="text-primary-foreground" /></div>
          <div>
            <h1 className="text-2xl font-800 text-foreground">Referral Program</h1>
            <p className="text-sm text-secondary-foreground">Earn 5% of a referred customer's first completed purchase. Refunded qualifying orders reverse the reward.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin text-primary" /></div>
        ) : (
          <>
            <section className="bg-primary/5 rounded-2xl border border-primary/20 p-6">
              <div className="flex items-center gap-2 mb-4"><Share2 size={16} className="text-primary" /><h2 className="text-base font-700 text-foreground">Your Referral Link</h2></div>
              {stats?.referral_code ? (
                <>
                  <div className="flex items-center gap-2 bg-card rounded-xl border border-border p-3 mb-3">
                    <span className="flex-1 text-sm text-foreground font-500 truncate">{referralLink}</span>
                    <button type="button" onClick={() => void copyLink()} className={`flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-lg ${copied ? 'bg-success/10 text-success' : 'bg-primary text-primary-foreground'}`}>
                      {copied ? <CheckCheck size={12} /> : <Copy size={12} />}{copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Code: <span className="font-mono font-700 text-foreground">{stats.referral_code}</span></p>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-secondary-foreground mb-4">Generate your unique referral link to start tracking referrals.</p>
                  <button type="button" onClick={() => void generateCode()} disabled={generating} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-600 text-sm disabled:opacity-60">
                    {generating ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}{generating ? 'Generating…' : 'Generate My Referral Link'}
                  </button>
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card rounded-2xl border border-border p-5"><Users size={18} className="text-primary mb-3" /><div className="text-xs text-muted-foreground">Tracked referrals</div><div className="text-2xl font-800 text-foreground mt-1">{stats?.total_invitations ?? 0}</div></div>
              <div className="bg-card rounded-2xl border border-border p-5"><TrendingUp size={18} className="text-success mb-3" /><div className="text-xs text-muted-foreground">Successful referrals</div><div className="text-2xl font-800 text-foreground mt-1">{stats?.successful_referrals ?? 0}</div></div>
              <div className="bg-card rounded-2xl border border-border p-5"><Star size={18} className="text-warning mb-3" /><div className="text-xs text-muted-foreground">Recorded rewards</div><div className="mt-1 space-y-0.5">{rewards.length ? rewards.map(([currency, amount]) => <div key={currency} className="text-sm font-800 text-foreground">{formatMoney(amount, currency)}</div>) : <div className="text-2xl font-800 text-foreground">—</div>}</div></div>
            </div>

            <section className="bg-card rounded-2xl border border-border p-6">
              <h2 className="text-base font-700 text-foreground mb-4">How it works</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-sm">
                <div><div className="font-700 text-foreground">1. Share your link</div><p className="text-xs text-muted-foreground mt-1">The referred user must register through your referral code.</p></div>
                <div><div className="font-700 text-foreground">2. First purchase completes</div><p className="text-xs text-muted-foreground mt-1">The reward is created only when the qualifying order reaches verified completed status.</p></div>
                <div><div className="font-700 text-foreground">3. Reward is recorded</div><p className="text-xs text-muted-foreground mt-1">SUMMECA records 5% in the same currency as that order; a refund reverses it.</p></div>
              </div>
            </section>

            <section className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border"><h2 className="text-base font-700 text-foreground">Recent Referrals</h2></div>
              {!stats?.recent_referrals?.length ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No tracked referrals yet.</div>
              ) : (
                <div className="divide-y divide-border">
                  {stats.recent_referrals.map((referral) => {
                    const config = STATUS_CONFIG[referral.status] ?? STATUS_CONFIG.pending;
                    const StatusIcon = config.icon;
                    return (
                      <div key={referral.id} className="flex items-center justify-between gap-4 px-6 py-3">
                        <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full ${config.cls} flex items-center justify-center`}><StatusIcon size={13} /></div><div><div className="text-xs font-600 text-foreground">Referral #{referral.id.slice(0, 8)}</div><div className="text-xs text-muted-foreground">{new Date(referral.created_at).toLocaleDateString()}</div></div></div>
                        <div className="text-right">{referral.reward_amount > 0 && <div className="text-xs font-700 text-success">{formatMoney(referral.reward_amount, referral.reward_currency || 'UNSPECIFIED')}</div>}<span className={`inline-flex text-xs font-600 px-2 py-0.5 rounded-full ${config.cls}`}>{config.label}</span></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
