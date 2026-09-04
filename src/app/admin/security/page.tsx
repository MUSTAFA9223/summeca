'use client';

import React, { useEffect, useState, useCallback } from 'react';
import AdminShell from '@/app/admin/components/AdminShell';
import {
  Shield, AlertTriangle, Key, Clock, RefreshCw, Loader2,
  CheckCircle, LogOut, Globe, Smartphone, Filter, Search,
  Users, Activity, Lock,
} from 'lucide-react';

interface SecurityLog {
  id: string;
  user_id: string;
  event_type: string;
  device_info: {
    browser?: string;
    os?: string;
    location?: string;
  };
  ip_hash: string | null;
  created_at: string;
}

interface SecurityStats {
  totalEvents: number;
  suspiciousCount: number;
  passwordChanges: number;
  usersWithSettings: number;
}

function eventBadge(type: string) {
  switch (type) {
    case 'login':           return 'bg-teal-50 text-teal-700 border border-teal-200';
    case 'logout':          return 'bg-gray-100 text-gray-500 border border-gray-200';
    case 'logout_all':      return 'bg-orange-50 text-orange-600 border border-orange-200';
    case 'password_change': return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'suspicious':      return 'bg-red-50 text-red-600 border border-red-200';
    default:                return 'bg-blue-50 text-blue-600 border border-blue-200';
  }
}

function eventLabel(type: string) {
  switch (type) {
    case 'login':           return 'Login';
    case 'logout':          return 'Logout';
    case 'logout_all':      return 'Logout All';
    case 'password_change': return 'Password Changed';
    case 'suspicious':      return 'Suspicious';
    default:                return type.replace(/_/g, ' ');
  }
}

function eventIcon(type: string) {
  switch (type) {
    case 'login':           return <CheckCircle size={14} className="text-teal-600" />;
    case 'logout':          return <LogOut size={14} className="text-gray-400" />;
    case 'logout_all':      return <LogOut size={14} className="text-orange-500" />;
    case 'password_change': return <Key size={14} className="text-amber-500" />;
    case 'suspicious':      return <AlertTriangle size={14} className="text-red-500" />;
    default:                return <Activity size={14} className="text-blue-500" />;
  }
}

export default function AdminSecurityPage() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [stats, setStats] = useState<SecurityStats>({ totalEvents: 0, suspiciousCount: 0, passwordChanges: 0, usersWithSettings: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterType !== 'all') params.set('event_type', filterType);
      const res = await fetch(`/api/admin/security?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setStats(data.stats || {});
      }
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = logs.filter(log => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.user_id.toLowerCase().includes(q) ||
      log.event_type.toLowerCase().includes(q) ||
      (log.device_info?.browser || '').toLowerCase().includes(q) ||
      (log.device_info?.location || '').toLowerCase().includes(q)
    );
  });

  return (
    <AdminShell>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <Shield size={20} className="text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-800 text-gray-900">Security Overview</h1>
              <p className="text-sm text-gray-500">Monitor security events and user protection status</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-500 border border-teal-200 rounded-xl px-4 py-2 hover:bg-teal-50 transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                <Activity size={16} className="text-teal-600" />
              </div>
              <span className="text-xs text-gray-400 font-500 uppercase tracking-wide">Total Events</span>
            </div>
            <div className="text-2xl font-800 text-gray-900">{stats.totalEvents.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle size={16} className="text-red-500" />
              </div>
              <span className="text-xs text-gray-400 font-500 uppercase tracking-wide">Suspicious</span>
            </div>
            <div className="text-2xl font-800 text-gray-900">{stats.suspiciousCount}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <Key size={16} className="text-amber-500" />
              </div>
              <span className="text-xs text-gray-400 font-500 uppercase tracking-wide">Pw Changes</span>
            </div>
            <div className="text-2xl font-800 text-gray-900">{stats.passwordChanges}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users size={16} className="text-blue-500" />
              </div>
              <span className="text-xs text-gray-400 font-500 uppercase tracking-wide">Protected Users</span>
            </div>
            <div className="text-2xl font-800 text-gray-900">{stats.usersWithSettings}</div>
          </div>
        </div>

        {/* Suspicious Activity Alert */}
        {stats.suspiciousCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-700 text-red-800">
                {stats.suspiciousCount} suspicious {stats.suspiciousCount === 1 ? 'event' : 'events'} detected
              </div>
              <div className="text-xs text-red-600 mt-0.5">Review the events below and take appropriate action.</div>
            </div>
          </div>
        )}

        {/* Filters + Search */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-teal-600" />
              <h2 className="text-base font-700 text-gray-900">Security Events</h2>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-500">{filtered.length}</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                />
              </div>
              <div className="relative">
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 bg-white"
                >
                  <option value="all">All Events</option>
                  <option value="login">Login</option>
                  <option value="logout">Logout</option>
                  <option value="password_change">Password Change</option>
                  <option value="suspicious">Suspicious</option>
                  <option value="logout_all">Logout All</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-12 flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading security events…
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400 text-sm">No security events found.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(log => (
                <div key={log.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    {eventIcon(log.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-600 ${eventBadge(log.event_type)}`}>
                        {eventLabel(log.event_type)}
                      </span>
                      <span className="text-xs text-gray-400 font-mono truncate max-w-[140px]" title={log.user_id}>
                        {log.user_id.slice(0, 8)}…
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                      {log.device_info?.browser && <span className="flex items-center gap-1"><Globe size={10} />{log.device_info.browser}</span>}
                      {log.device_info?.os && <span className="flex items-center gap-1"><Smartphone size={10} />{log.device_info.os}</span>}
                      {log.device_info?.location && <span>{log.device_info.location}</span>}
                      {log.ip_hash && <span className="font-mono text-gray-300">{log.ip_hash.slice(0, 8)}</span>}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AdminShell>
  );
}
