'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';
import { Gift, Copy, CheckCheck, Users, TrendingUp, DollarSign, Share2, Loader2, Star, Clock, CheckCircle2 } from 'lucide-react';

interface ReferralStats {
  referral_code: string | null;
  total_invitations: number;
  successful_referrals: number;
  rewards_earned: number;
  recent_referrals: {
    id: string;
    status: string;
    reward_amount: number;
    created_at: string;
  }[];
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ComponentType<any> }> = {
  pending: { label: 'Pending', cls: 'bg-warning/10 text-warning', icon: Clock },
  registered: { label: 'Registered', cls: 'bg-info/10 text-info', icon: Users },
  purchased: { label: 'Purchased', cls: 'bg-success/10 text-success', icon: CheckCircle2 },
  rewarded: { label: 'Rewarded', cls: 'bg-primary/10 text-primary', icon: Star },
};

async function readJsonSafely<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export default function ReferralsPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://summeca.com';

  useEffect(() => {
    if (!user) return;
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/referrals/stats', { cache: 'no-store' });
      const data = await readJsonSafely<ReferralStats & { error?: string }>(res);

      if (!res.ok || !data) {
        toast.error(data?.error || 'Could not load referral statistics. Please try again.');
        return;
      }

      setStats(data);
    } catch {
      toast.error('Could not load referral statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/referrals/generate', { method: 'POST' });
      const data = await readJsonSafely<{ referral_code?: string; error?: string }>(res);

      if (!res.ok || !data?.referral_code) {
        toast.error(data?.error || 'Could not create your referral link. Please try again.');
        return;
      }

      await fetchStats();
      toast.success('Your referral link is ready.');
    } catch {
      toast.error('Could not create your referral link. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = () => {
    if (!stats?.referral_code) return;
    const link = `${siteUrl}/sign-up-login-screen?ref=${stats.referral_code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      trackEvent('referral_signup', { referral_code: stats.referral_code });
      toast.success('Referral link copied.');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('Could not copy the referral link.');
    });
  };

  const referralLink = stats?.referral_code
    ? `${siteUrl}/sign-up-login-screen?ref=${stats.referral_code}`
    : '';

  const kpiCards = [
    {
      label: 'Total Invitations',
      value: stats?.total_invitations ?? 0,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Successful Referrals',
      value: stats?.successful_referrals ?? 0,
      icon: TrendingUp,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Rewards Earned',
      value: `$${(stats?.rewards_earned ?? 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  if (authLoading) {
    return (
      <DashboardLayout activeRoute="referrals">
        <div className="flex items-center justify-center h-64">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeRoute="referrals">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Gift size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-foreground">Referral Program</h1>
            <p className="text-sm text-secondary-foreground">Invite friends and earn 5% on their first completed purchase</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border border-primary/20 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Share2 size={16} className="text-primary" />
                <h2 className="text-base font-700 text-foreground">Your Referral Link</h2>
              </div>

              {stats?.referral_code ? (
                <>
                  <div className="flex items-center gap-2 bg-white rounded-xl border border-border p-3 mb-3">
                    <span className="flex-1 text-sm text-foreground font-500 truncate">{referralLink}</span>
                    <button
                      onClick={copyLink}
                      className={`flex items-center gap-1.5 text-xs font-600 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                        copied ? 'bg-success/10 text-success' : 'bg-primary text-white hover:bg-primary/90'
                      }`}
                    >
                      {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-700 bg-primary/10 text-primary px-3 py-1 rounded-full">
                      Code: {stats.referral_code}
                    </span>
                    <span className="text-xs text-muted-foreground">You earn 5% when your referral completes their first purchase</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-secondary-foreground mb-4">Generate your unique referral link to start earning rewards</p>
                  <button
                    onClick={generateCode}
                    disabled={generating}
                    className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-600 text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {generating ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />}
                    {generating ? 'Generating...' : 'Generate My Referral Link'}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {kpiCards.map((card) => (
                <div key={card.label} className="bg-white rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}>
                      <card.icon size={18} className={card.color} />
                    </div>
                    <span className="text-xs font-600 text-secondary-foreground">{card.label}</span>
                  </div>
                  <div className="text-2xl font-800 text-foreground">{card.value}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-border p-6 mb-6">
              <h2 className="text-base font-700 text-foreground mb-4">How It Works</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { step: '1', title: 'Share Your Link', desc: 'Copy your unique referral link and share it with friends, colleagues, or on social media.' },
                  { step: '2', title: 'Friend Signs Up', desc: 'When someone registers using your link, they become your referral.' },
                  { step: '3', title: 'Earn 5%', desc: 'When your referral completes their first purchase, you earn 5% of that order.' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-teal text-white text-xs font-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div>
                      <div className="text-sm font-700 text-foreground mb-1">{item.title}</div>
                      <div className="text-xs text-secondary-foreground leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {stats?.recent_referrals && stats.recent_referrals.length > 0 && (
              <div className="bg-white rounded-2xl border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="text-base font-700 text-foreground">Recent Referrals</h2>
                </div>
                <div className="divide-y divide-border">
                  {stats.recent_referrals.map((ref) => {
                    const statusCfg = STATUS_CONFIG[ref.status] ?? STATUS_CONFIG.pending;
                    const StatusIcon = statusCfg.icon;
                    return (
                      <div key={ref.id} className="flex items-center justify-between px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full ${statusCfg.cls} flex items-center justify-center`}>
                            <StatusIcon size={13} />
                          </div>
                          <div>
                            <div className="text-xs font-600 text-foreground">Referral #{ref.id.slice(0, 8)}</div>
                            <div className="text-xs text-muted-foreground">{new Date(ref.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {ref.reward_amount > 0 && (
                            <span className="text-xs font-700 text-success">+${ref.reward_amount.toFixed(2)}</span>
                          )}
                          <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(!stats?.recent_referrals || stats.recent_referrals.length === 0) && stats?.referral_code && (
              <div className="bg-white rounded-2xl border border-border p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users size={24} className="text-primary" />
                </div>
                <h3 className="text-base font-700 text-foreground mb-2">No referrals yet</h3>
                <p className="text-sm text-secondary-foreground mb-4">Start sharing your link to earn 5% rewards.</p>
                <button
                  onClick={copyLink}
                  className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl font-600 text-sm hover:bg-primary/90 transition-colors"
                >
                  <Copy size={13} />
                  Copy Referral Link
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
