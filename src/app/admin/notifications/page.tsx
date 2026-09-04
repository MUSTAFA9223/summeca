'use client';

import React, { useEffect, useState } from 'react';
import { Bell, Send, Users, CheckCircle, Clock, Megaphone, Loader2, AlertCircle, TrendingUp,  } from 'lucide-react';

interface DeliveryStats {
  total: number;
  unread: number;
  read: number;
  announcements: number;
}

interface RecentNotification {
  id: string;
  type: string;
  title: string;
  created_at: string;
  read: boolean;
}

export default function AdminNotificationsPage() {
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [recent, setRecent] = useState<RecentNotification[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Send form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('announcement');
  const [actionUrl, setActionUrl] = useState('');
  const [target, setTarget] = useState('all');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const res = await fetch('/api/admin/notifications/send');
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          setRecent(data.recent || []);
        }
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, type, action_url: actionUrl || undefined, target }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ success: true, message: `Sent to ${data.sent} user${data.sent !== 1 ? 's' : ''}` });
        setTitle('');
        setMessage('');
        setActionUrl('');
        // Refresh stats
        const statsRes = await fetch('/api/admin/notifications/send');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats);
          setRecent(statsData.recent || []);
        }
      } else {
        setSendResult({ success: false, message: data.error || 'Failed to send' });
      }
    } finally {
      setSending(false);
    }
  };

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-700 text-foreground flex items-center gap-2">
          <Bell size={22} className="text-primary" />
          Notification Center
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Send announcements and view delivery statistics</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Sent', value: stats?.total ?? '—', icon: Send, color: 'text-primary' },
          { label: 'Unread', value: stats?.unread ?? '—', icon: Bell, color: 'text-warning' },
          { label: 'Read', value: stats?.read ?? '—', icon: CheckCircle, color: 'text-success' },
          { label: 'Announcements', value: stats?.announcements ?? '—', icon: Megaphone, color: 'text-info' },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-500">{stat.label}</span>
              <stat.icon size={15} className={stat.color} />
            </div>
            {loadingStats ? (
              <div className="h-7 w-12 bg-secondary animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-700 text-foreground">{stat.value}</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Send Notification Form */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-base font-600 text-foreground flex items-center gap-2 mb-5">
            <Megaphone size={16} className="text-primary" />
            Send Announcement
          </h2>

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs font-600 text-foreground mb-1.5">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-600 text-foreground mb-1.5">Message *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your notification message..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-600 text-foreground mb-1.5">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                >
                  <option value="announcement">Announcement</option>
                  <option value="order">Order</option>
                  <option value="payment">Payment</option>
                  <option value="subscription">Subscription</option>
                  <option value="refund">Refund</option>
                  <option value="recommendation">Recommendation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-600 text-foreground mb-1.5">Target</label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                >
                  <option value="all">All Users</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-600 text-foreground mb-1.5">Action URL (optional)</label>
              <input
                type="url"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            {sendResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                sendResult.success
                  ? 'bg-success/10 text-success border border-success/20' :'bg-danger/10 text-danger border border-danger/20'
              }`}>
                {sendResult.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {sendResult.message}
              </div>
            )}

            <button
              type="submit"
              disabled={sending || !title.trim() || !message.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-600 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              {sending ? (
                <><Loader2 size={14} className="animate-spin" /> Sending...</>
              ) : (
                <><Send size={14} /> Send Notification</>
              )}
            </button>
          </form>
        </div>

        {/* Recent Notifications */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-base font-600 text-foreground flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-primary" />
            Recent Activity
          </h2>

          {loadingStats ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 bg-secondary animate-pulse rounded-xl" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell size={24} className="text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications sent yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recent.map((n) => (
                <div key={n.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-150">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${n.read ? 'bg-muted-foreground/30' : 'bg-primary'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-600 text-foreground truncate">{n.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground capitalize">{n.type}</span>
                      <span className="text-xs text-muted-foreground/60">·</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {n.read ? (
                      <span className="flex items-center gap-1 text-xs text-success">
                        <CheckCircle size={10} /> Read
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-warning">
                        <Clock size={10} /> Unread
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 rounded-2xl bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <Users size={16} className="text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-600 text-foreground">Notification Delivery</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Notifications are delivered in real-time via Supabase Realtime. Users see them instantly in their notification bell and the Notifications page. All notifications respect user RLS policies — users can only see their own.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
