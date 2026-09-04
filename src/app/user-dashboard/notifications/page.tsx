'use client';

import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bell, CheckCheck, Trash2, ShoppingBag, CreditCard, RefreshCw,
  RotateCcw, Heart, Sparkles, Megaphone, Filter, Loader2, BellOff,
} from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


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
  const diff = Date.now() - new Date(dateStr).getTime();
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (activeFilter !== 'all') params.set('type', activeFilter);
      const res = await fetch(`/api/notifications?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Realtime
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
            setNotifications((prev) => [n, ...prev]);
          }
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeFilter]);

  const markAllRead = async () => {
    await fetch('/api/notifications/mark-read', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id: string) => {
    const notif = notifications.find((n) => n.id === id);
    if (!notif || notif.read) return;
    await fetch('/api/notifications/mark-read', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const deleteNotification = async (id: string) => {
    setDeletingId(id);
    try {
      const notif = notifications.find((n) => n.id === id);
      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (notif && !notif.read) setUnreadCount((c) => Math.max(0, c - 1));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout activeRoute="notifications">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-700 text-foreground flex items-center gap-2">
              <Bell size={22} className="text-primary" />
              Notifications
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-500 text-primary border border-primary/30 hover:bg-primary/5 transition-all duration-150"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          <Filter size={13} className="text-muted-foreground flex-shrink-0 mr-1" />
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-500 whitespace-nowrap transition-all duration-150 flex-shrink-0 ${
                  activeFilter === tab.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                }`}
              >
                <Icon size={11} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <BellOff size={28} className="text-muted-foreground/50" />
            </div>
            <h3 className="text-base font-600 text-foreground mb-1">No notifications</h3>
            <p className="text-sm text-muted-foreground">
              {activeFilter !== 'all'
                ? `No ${activeFilter} notifications yet`
                : "You're all caught up! Check back later."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const Icon = typeIcon(n.type);
              const colorClass = typeColor(n.type);
              return (
                <div
                  key={n.id}
                  className={`group relative flex gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    !n.read
                      ? 'bg-white border-primary/20 shadow-sm hover:shadow-md'
                      : 'bg-white border-border hover:border-border/80 hover:shadow-sm'
                  }`}
                  onClick={() => markRead(n.id)}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon size={16} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-sm font-600 ${!n.read ? 'text-foreground' : 'text-secondary-foreground'}`}>
                        {n.title}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        )}
                        <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                    {n.action_url && (
                      <a
                        href={n.action_url}
                        className="inline-flex items-center gap-1 text-xs text-primary font-500 mt-1.5 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View details →
                      </a>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                    disabled={deletingId === n.id}
                    className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-danger/5 opacity-0 group-hover:opacity-100 transition-all duration-150"
                    title="Delete notification"
                  >
                    {deletingId === n.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
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
