'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeInternalActionUrl } from '@/lib/notifications/actionUrl';
import {
  AlertCircle,
  Bell,
  BellOff,
  CheckCheck,
  CreditCard,
  Filter,
  Heart,
  Loader2,
  Megaphone,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  read: boolean;
  created_at: string;
}

const FILTER_TABS = [
  { id: 'all', label: 'All', icon: Bell },
  { id: 'order', label: 'Orders', icon: ShoppingBag },
  { id: 'payment', label: 'Payments', icon: CreditCard },
  { id: 'subscription', label: 'Subscriptions', icon: RefreshCw },
  { id: 'refund', label: 'Refunds', icon: RotateCcw },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'recommendation', label: 'Recommendations', icon: Sparkles },
];

async function readJsonSafely<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function typeIcon(type: string) {
  switch (type) {
    case 'order': return ShoppingBag;
    case 'payment': return CreditCard;
    case 'subscription': return RefreshCw;
    case 'refund': return RotateCcw;
    case 'wishlist': return Heart;
    case 'recommendation': return Sparkles;
    case 'announcement': return Megaphone;
    default: return Bell;
  }
}

function typeColor(type: string) {
  switch (type) {
    case 'order': return 'bg-success/10 text-success';
    case 'payment': return 'bg-info/10 text-info';
    case 'subscription': return 'bg-primary/10 text-primary';
    case 'refund': return 'bg-warning/10 text-warning';
    case 'wishlist': return 'bg-pink-50 text-pink-500';
    case 'recommendation': return 'bg-purple-50 text-purple-500';
    case 'announcement': return 'bg-teal-50 text-teal-600';
    default: return 'bg-secondary text-muted-foreground';
  }
}

function timeAgo(dateStr: string): string {
  const timestamp = new Date(dateStr).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const diff = Math.max(0, Date.now() - timestamp);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (activeFilter !== 'all') params.set('type', activeFilter);
      const res = await fetch(`/api/notifications?${params}`, { cache: 'no-store' });
      const data = await readJsonSafely<{ notifications?: Notification[]; unreadCount?: number; error?: string }>(res);
      if (!res.ok || !data) {
        throw new Error(data?.error || 'Could not load notifications.');
      }
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => { void fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`notif-page:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          if (activeFilter === 'all' || activeFilter === n.type) {
            setNotifications((prev) => [n, ...prev.filter((item) => item.id !== n.id)]);
          }
          if (!n.read) setUnreadCount((count) => count + 1);
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, activeFilter]);

  const patchRead = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/notifications/mark-read', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await readJsonSafely<{ error?: string }>(res);
    if (!res.ok) throw new Error(data?.error || 'Could not update notification.');
  };

  const markAllRead = async () => {
    setError('');
    try {
      await patchRead({ markAll: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark notifications as read.');
    }
  };

  const markRead = async (id: string) => {
    const notif = notifications.find((n) => n.id === id);
    if (!notif || notif.read || busyId === id) return;
    setBusyId(id);
    setError('');
    try {
      await patchRead({ id });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark notification as read.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteNotification = async (id: string) => {
    if (busyId === id) return;
    setBusyId(id);
    setError('');
    try {
      const notif = notifications.find((n) => n.id === id);
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await readJsonSafely<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || 'Could not delete notification.');
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (notif && !notif.read) setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete notification.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout activeRoute="notifications">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-700 text-foreground flex items-center gap-2">
              <Bell size={22} className="text-primary" /> Notifications
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'No unread notifications'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={() => void markAllRead()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-500 text-primary border border-primary/30 hover:bg-primary/5">
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => void fetchNotifications()} className="font-600 underline">Retry</button>
          </div>
        )}

        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          <Filter size={13} className="text-muted-foreground flex-shrink-0 mr-1" />
          {FILTER_TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-500 whitespace-nowrap flex-shrink-0 ${activeFilter === tab.id ? 'bg-primary text-white shadow-sm' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
              >
                <TabIcon size={11} /> {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4"><BellOff size={28} className="text-muted-foreground/50" /></div>
            <h3 className="text-base font-600 text-foreground mb-1">No notifications</h3>
            <p className="text-sm text-muted-foreground">{activeFilter !== 'all' ? `No ${activeFilter} notifications yet` : 'There are no notifications to show.'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const NotificationIcon = typeIcon(n.type);
              const actionUrl = sanitizeInternalActionUrl(n.action_url);
              return (
                <div
                  key={n.id}
                  className={`group relative flex gap-4 p-4 rounded-2xl border transition-all ${!n.read ? 'bg-white border-primary/20 shadow-sm' : 'bg-white border-border'}`}
                  onClick={() => void markRead(n.id)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeColor(n.type)}`}><NotificationIcon size={16} /></div>
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-sm font-600 ${!n.read ? 'text-foreground' : 'text-secondary-foreground'}`}>{n.title}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary" />}
                        <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                    {actionUrl && (
                      <Link href={actionUrl} className="inline-flex text-xs text-primary font-500 mt-1.5 hover:underline" onClick={(e) => e.stopPropagation()}>
                        View details →
                      </Link>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); void deleteNotification(n.id); }}
                    disabled={busyId === n.id}
                    className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-danger/5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-50"
                    aria-label="Delete notification"
                  >
                    {busyId === n.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
