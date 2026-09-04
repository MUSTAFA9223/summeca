'use client';

import React, { useEffect, useState, useCallback } from 'react';
import AdminShell from '@/app/admin/components/AdminShell';
import { Megaphone, Sparkles, Send, BarChart2, Users, Mail, Globe, Share2, Loader2, CheckCircle, AlertCircle, Trash2, Eye, TrendingUp, Plus, RefreshCw, Target, Zap, ChevronDown, ChevronUp,  } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  subject: string | null;
  target_type: string;
  created_at: string;
}

interface AnalyticsStats {
  total_campaigns: number;
  total_sent: number;
  open_rate: number;
  click_rate: number;
  opened: number;
  clicked: number;
}

interface GeneratedContent {
  campaignName?: string;
  headline?: string;
  subheadline?: string;
  emailSubject?: string;
  emailPreview?: string;
  emailBody?: string;
  socialPosts?: { twitter?: string; linkedin?: string; instagram?: string };
  seoKeywords?: string[];
  cta?: string;
  keyMessages?: string[];
  targetSegment?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CAMPAIGN_TYPES = [
  { value: 'email', label: 'Email Campaign', icon: Mail },
  { value: 'product_announcement', label: 'Product Announcement', icon: Zap },
  { value: 'promotional', label: 'Promotional / Discount', icon: Target },
  { value: 'seo', label: 'SEO Marketing Text', icon: Globe },
  { value: 'social_media', label: 'Social Media Posts', icon: Share2 },
];

const SEGMENTS = [
  { value: 'all', label: 'All Users' },
  { value: 'new_customers', label: 'New Customers (last 30d)' },
  { value: 'returning_customers', label: 'Returning Customers' },
  { value: 'high_value', label: 'High Value Customers' },
  { value: 'trial_users', label: 'Trial Users' },
  { value: 'subscription_users', label: 'Subscription Users' },
  { value: 'wishlist_users', label: 'Wishlist Users' },
  { value: 'inactive_users', label: 'Inactive Users' },
];

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly & Warm' },
  { value: 'urgent', label: 'Urgent / FOMO' },
  { value: 'luxury', label: 'Luxury / Premium' },
  { value: 'playful', label: 'Playful & Fun' },
  { value: 'educational', label: 'Educational' },
];

function statusBadge(status: string) {
  switch (status) {
    case 'sent':    return 'bg-teal-50 text-teal-700 border border-teal-200';
    case 'draft':   return 'bg-gray-100 text-gray-600 border border-gray-200';
    case 'active':  return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'paused':  return 'bg-amber-50 text-amber-700 border border-amber-200';
    default:        return 'bg-gray-100 text-gray-500 border border-gray-200';
  }
}

function typeBadge(type: string) {
  switch (type) {
    case 'email':                return 'bg-indigo-50 text-indigo-700';
    case 'product_announcement': return 'bg-purple-50 text-purple-700';
    case 'promotional':          return 'bg-orange-50 text-orange-700';
    case 'seo':                  return 'bg-green-50 text-green-700';
    case 'social_media':         return 'bg-pink-50 text-pink-700';
    default:                     return 'bg-gray-50 text-gray-600';
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminMarketingPage() {
  const [activeTab, setActiveTab] = useState<'builder' | 'campaigns' | 'analytics'>('builder');

  // Builder state
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState('');
  const [tone, setTone] = useState('professional');
  const [campaignType, setCampaignType] = useState('email');
  const [segment, setSegment] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('email');

  // Campaigns state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Analytics state
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Saved campaign id for sending
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(null);

  // ─── Fetch campaigns ──────────────────────────────────────────────────────

  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/admin/marketing/campaigns${params}`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns ?? []);
      }
    } finally {
      setCampaignsLoading(false);
    }
  }, [statusFilter]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch('/api/admin/marketing/analytics');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentCampaigns(data.recent_campaigns ?? []);
      }
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'campaigns') fetchCampaigns();
    if (activeTab === 'analytics') fetchAnalytics();
  }, [activeTab, fetchCampaigns, fetchAnalytics]);

  useEffect(() => {
    if (activeTab === 'campaigns') fetchCampaigns();
  }, [statusFilter, activeTab, fetchCampaigns]);

  // ─── Generate ─────────────────────────────────────────────────────────────

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.trim() || !goal.trim()) return;
    setGenerating(true);
    setGenerated(null);
    setGenError(null);
    setSaveResult(null);
    setSendResult(null);
    setSavedCampaignId(null);
    try {
      const res = await fetch('/api/admin/marketing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, audience, goal, tone, campaign_type: campaignType }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGenerated(typeof data.output === 'object' ? data.output : { emailBody: data.raw });
        setExpandedSection('email');
      } else {
        setGenError(data.error ?? 'Generation failed');
      }
    } catch {
      setGenError('Network error. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Save campaign ────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!generated) return;
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch('/api/admin/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: generated.campaignName ?? `${product} — ${campaignType}`,
          campaign_type: campaignType,
          status: 'draft',
          subject: generated.emailSubject ?? null,
          content: JSON.stringify(generated),
          target_type: segment,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSavedCampaignId(data.campaign?.id ?? null);
        setSaveResult({ success: true, message: 'Campaign saved as draft!' });
      } else {
        setSaveResult({ success: false, message: data.error ?? 'Save failed' });
      }
    } finally {
      setSaving(false);
    }
  };

  // ─── Send campaign ────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!savedCampaignId) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/admin/marketing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: savedCampaignId, segment }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ success: true, message: `Campaign sent to ${data.sent} users!` });
      } else {
        setSendResult({ success: false, message: data.error ?? 'Send failed' });
      }
    } finally {
      setSending(false);
    }
  };

  // ─── Delete campaign ──────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/admin/marketing/campaigns/${id}`, { method: 'DELETE' });
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Chart data ───────────────────────────────────────────────────────────

  const chartData = stats
    ? [
        { name: 'Sent', value: stats.total_sent, color: '#0D9488' },
        { name: 'Opened', value: stats.opened, color: '#6366F1' },
        { name: 'Clicked', value: stats.clicked, color: '#F59E0B' },
      ]
    : [];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AdminShell>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-700 text-foreground flex items-center gap-2">
              <Megaphone size={22} className="text-primary" />
              AI Marketing Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Generate, manage and send AI-powered marketing campaigns — SUMMECA V35
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5">
            <Sparkles size={13} className="text-primary" />
            <span className="text-xs font-600 text-primary">AI Powered</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-6 w-fit">
          {[
            { id: 'builder', label: 'Campaign Builder', icon: Sparkles },
            { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
            { id: 'analytics', label: 'Analytics', icon: BarChart2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-500 transition-all duration-150 ${
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Builder ── */}
        {activeTab === 'builder' && (
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Left: Form */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="text-sm font-600 text-foreground flex items-center gap-2 mb-4">
                  <Sparkles size={15} className="text-primary" />
                  AI Campaign Builder
                </h2>

                <form onSubmit={handleGenerate} className="space-y-3.5">
                  {/* Campaign Type */}
                  <div>
                    <label className="block text-xs font-600 text-foreground mb-1.5">Campaign Type *</label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {CAMPAIGN_TYPES.map((ct) => (
                        <button
                          key={ct.value}
                          type="button"
                          onClick={() => setCampaignType(ct.value)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs font-500 transition-all duration-150 text-left ${
                            campaignType === ct.value
                              ? 'border-primary bg-primary/5 text-primary' :'border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-border/80'
                          }`}
                        >
                          <ct.icon size={13} className="flex-shrink-0" />
                          {ct.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Product */}
                  <div>
                    <label className="block text-xs font-600 text-foreground mb-1.5">Product / Service *</label>
                    <input
                      type="text"
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                      placeholder="e.g. SUMMECA Pro AI Suite"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      required
                    />
                  </div>

                  {/* Audience */}
                  <div>
                    <label className="block text-xs font-600 text-foreground mb-1.5">Target Audience</label>
                    <input
                      type="text"
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      placeholder="e.g. SaaS founders, digital marketers"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>

                  {/* Goal */}
                  <div>
                    <label className="block text-xs font-600 text-foreground mb-1.5">Campaign Goal *</label>
                    <input
                      type="text"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      placeholder="e.g. Increase trial sign-ups by 30%"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      required
                    />
                  </div>

                  {/* Tone */}
                  <div>
                    <label className="block text-xs font-600 text-foreground mb-1.5">Tone</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    >
                      {TONES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Segment */}
                  <div>
                    <label className="block text-xs font-600 text-foreground mb-1.5">
                      <Users size={11} className="inline mr-1" />
                      Customer Segment
                    </label>
                    <select
                      value={segment}
                      onChange={(e) => setSegment(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    >
                      {SEGMENTS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={generating || !product.trim() || !goal.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-600 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                  >
                    {generating ? (
                      <><Loader2 size={14} className="animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles size={14} /> Generate Campaign</>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Output */}
            <div className="lg:col-span-3 space-y-4">
              {genError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  <AlertCircle size={14} />
                  {genError}
                </div>
              )}

              {!generated && !generating && (
                <div className="bg-card border border-border rounded-2xl p-10 flex flex-col items-center justify-center text-center min-h-[300px]">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles size={24} className="text-primary" />
                  </div>
                  <h3 className="text-base font-600 text-foreground mb-1">AI Campaign Generator</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Fill in the form and click Generate to create AI-powered marketing content instantly.
                  </p>
                </div>
              )}

              {generating && (
                <div className="bg-card border border-border rounded-2xl p-10 flex flex-col items-center justify-center min-h-[300px]">
                  <Loader2 size={32} className="text-primary animate-spin mb-4" />
                  <p className="text-sm font-500 text-foreground">AI is crafting your campaign...</p>
                  <p className="text-xs text-muted-foreground mt-1">This takes a few seconds</p>
                </div>
              )}

              {generated && !generating && (
                <div className="space-y-3">
                  {/* Campaign Name */}
                  {generated.campaignName && (
                    <div className="bg-gradient-to-r from-primary/5 to-teal-50 border border-primary/20 rounded-2xl p-4">
                      <div className="text-xs font-600 text-primary mb-1">Campaign Name</div>
                      <div className="text-lg font-700 text-foreground">{generated.campaignName}</div>
                      {generated.headline && (
                        <div className="text-sm text-muted-foreground mt-1">{generated.headline}</div>
                      )}
                    </div>
                  )}

                  {/* Key Messages */}
                  {generated.keyMessages && generated.keyMessages.length > 0 && (
                    <div className="bg-card border border-border rounded-2xl p-4">
                      <div className="text-xs font-600 text-foreground mb-2">Key Messages</div>
                      <ul className="space-y-1.5">
                        {generated.keyMessages.map((msg, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle size={13} className="text-primary mt-0.5 flex-shrink-0" />
                            {msg}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Email Content */}
                  {(generated.emailSubject || generated.emailBody) && (
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'email' ? null : 'email')}
                        className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-all"
                      >
                        <div className="flex items-center gap-2 text-sm font-600 text-foreground">
                          <Mail size={14} className="text-primary" />
                          Email Content
                        </div>
                        {expandedSection === 'email' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {expandedSection === 'email' && (
                        <div className="px-4 pb-4 space-y-3 border-t border-border">
                          {generated.emailSubject && (
                            <div className="mt-3">
                              <div className="text-xs font-600 text-muted-foreground mb-1">Subject Line</div>
                              <div className="text-sm font-500 text-foreground bg-secondary px-3 py-2 rounded-lg">
                                {generated.emailSubject}
                              </div>
                            </div>
                          )}
                          {generated.emailPreview && (
                            <div>
                              <div className="text-xs font-600 text-muted-foreground mb-1">Preview Text</div>
                              <div className="text-sm text-muted-foreground bg-secondary px-3 py-2 rounded-lg">
                                {generated.emailPreview}
                              </div>
                            </div>
                          )}
                          {generated.emailBody && (
                            <div>
                              <div className="text-xs font-600 text-muted-foreground mb-1">Email Body</div>
                              <div
                                className="text-sm text-foreground bg-secondary px-3 py-3 rounded-lg max-h-48 overflow-y-auto leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: generated.emailBody }}
                              />
                            </div>
                          )}
                          {generated.cta && (
                            <div>
                              <div className="text-xs font-600 text-muted-foreground mb-1">CTA Button</div>
                              <span className="inline-block bg-primary text-white text-xs font-600 px-4 py-1.5 rounded-lg">
                                {generated.cta}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Social Posts */}
                  {generated.socialPosts && (
                    <div className="bg-card border border-border rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'social' ? null : 'social')}
                        className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-all"
                      >
                        <div className="flex items-center gap-2 text-sm font-600 text-foreground">
                          <Share2 size={14} className="text-primary" />
                          Social Media Posts
                        </div>
                        {expandedSection === 'social' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {expandedSection === 'social' && (
                        <div className="px-4 pb-4 space-y-3 border-t border-border">
                          {generated.socialPosts.twitter && (
                            <div className="mt-3">
                              <div className="text-xs font-600 text-muted-foreground mb-1">𝕏 / Twitter</div>
                              <div className="text-sm text-foreground bg-secondary px-3 py-2 rounded-lg">
                                {generated.socialPosts.twitter}
                              </div>
                            </div>
                          )}
                          {generated.socialPosts.linkedin && (
                            <div>
                              <div className="text-xs font-600 text-muted-foreground mb-1">LinkedIn</div>
                              <div className="text-sm text-foreground bg-secondary px-3 py-2 rounded-lg whitespace-pre-line">
                                {generated.socialPosts.linkedin}
                              </div>
                            </div>
                          )}
                          {generated.socialPosts.instagram && (
                            <div>
                              <div className="text-xs font-600 text-muted-foreground mb-1">Instagram</div>
                              <div className="text-sm text-foreground bg-secondary px-3 py-2 rounded-lg">
                                {generated.socialPosts.instagram}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SEO Keywords */}
                  {generated.seoKeywords && generated.seoKeywords.length > 0 && (
                    <div className="bg-card border border-border rounded-2xl p-4">
                      <div className="text-xs font-600 text-foreground mb-2 flex items-center gap-1.5">
                        <Globe size={13} className="text-primary" />
                        SEO Keywords
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {generated.seoKeywords.map((kw, i) => (
                          <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-500">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2.5">
                    <button
                      onClick={handleSave}
                      disabled={saving || !!savedCampaignId}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary text-primary text-sm font-600 hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      {savedCampaignId ? 'Saved!' : 'Save Campaign'}
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={sending || !savedCampaignId}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-600 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      {sending ? 'Sending...' : 'Send Campaign'}
                    </button>
                  </div>

                  {saveResult && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                      saveResult.success
                        ? 'bg-teal-50 text-teal-700 border border-teal-200' :'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {saveResult.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      {saveResult.message}
                    </div>
                  )}

                  {sendResult && (
                    <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                      sendResult.success
                        ? 'bg-teal-50 text-teal-700 border border-teal-200' :'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {sendResult.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      {sendResult.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Campaigns ── */}
        {activeTab === 'campaigns' && (
          <div>
            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex gap-1 bg-secondary rounded-xl p-1">
                {['all', 'draft', 'sent', 'active', 'paused'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-500 capitalize transition-all ${
                      statusFilter === s
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                onClick={fetchCampaigns}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>

            {campaignsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-secondary animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center text-center">
                <Megaphone size={28} className="text-muted-foreground/40 mb-3" />
                <p className="text-sm font-500 text-foreground mb-1">No campaigns yet</p>
                <p className="text-xs text-muted-foreground">Use the Campaign Builder to create your first campaign.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-primary/30 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-600 text-foreground truncate">{c.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-500 ${statusBadge(c.status)}`}>
                          {c.status}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-500 ${typeBadge(c.campaign_type)}`}>
                          {c.campaign_type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {c.subject && <span className="truncate max-w-xs">Subject: {c.subject}</span>}
                        <span className="flex items-center gap-1">
                          <Users size={10} />
                          {c.target_type.replace('_', ' ')}
                        </span>
                        <span>{timeAgo(c.created_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      {deletingId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Analytics ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Total Campaigns', value: stats?.total_campaigns ?? '—', icon: Megaphone, color: 'text-primary' },
                { label: 'Emails Sent', value: stats?.total_sent ?? '—', icon: Send, color: 'text-indigo-500' },
                { label: 'Open Rate', value: stats ? `${stats.open_rate}%` : '—', icon: Eye, color: 'text-teal-500' },
                { label: 'Click Rate', value: stats ? `${stats.click_rate}%` : '—', icon: TrendingUp, color: 'text-amber-500' },
                { label: 'Total Opened', value: stats?.opened ?? '—', icon: CheckCircle, color: 'text-green-500' },
                { label: 'Total Clicked', value: stats?.clicked ?? '—', icon: Target, color: 'text-purple-500' },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-500">{kpi.label}</span>
                    <kpi.icon size={15} className={kpi.color} />
                  </div>
                  {analyticsLoading ? (
                    <div className="h-7 w-16 bg-secondary animate-pulse rounded" />
                  ) : (
                    <div className="text-2xl font-700 text-foreground">{kpi.value}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Chart */}
            {!analyticsLoading && chartData.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-600 text-foreground mb-4 flex items-center gap-2">
                  <BarChart2 size={15} className="text-primary" />
                  Campaign Performance Overview
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent Campaigns */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="text-sm font-600 text-foreground mb-4 flex items-center gap-2">
                <TrendingUp size={15} className="text-primary" />
                Recent Campaigns
              </h3>
              {analyticsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-secondary animate-pulse rounded-xl" />)}
                </div>
              ) : recentCampaigns.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">No campaigns yet</div>
              ) : (
                <div className="space-y-2">
                  {recentCampaigns.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.status === 'sent' ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-600 text-foreground truncate">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.campaign_type.replace('_', ' ')} · {timeAgo(c.created_at)}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-500 ${statusBadge(c.status)}`}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
