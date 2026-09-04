'use client';

import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Lock, Mail, Monitor, AlertTriangle, CheckCircle, Eye, EyeOff, Loader2, RefreshCw, LogOut, Clock, Smartphone, Globe, Key, Bell, Info,  } from 'lucide-react';

interface SecurityLog {
  id: string;
  event_type: string;
  device_info: {
    browser?: string;
    os?: string;
    device?: string;
    location?: string;
  };
  ip_hash: string | null;
  created_at: string;
}

interface SecuritySettings {
  login_alerts: boolean;
  email_alerts: boolean;
}

interface PasswordForm {
  current: string;
  next: string;
  confirm: string;
}

function eventIcon(type: string) {
  switch (type) {
    case 'login':           return <CheckCircle size={14} className="text-teal-600" />;
    case 'logout':          return <LogOut size={14} className="text-gray-400" />;
    case 'password_change': return <Key size={14} className="text-amber-500" />;
    case 'suspicious':      return <AlertTriangle size={14} className="text-red-500" />;
    default:                return <Clock size={14} className="text-gray-400" />;
  }
}

function eventLabel(type: string) {
  switch (type) {
    case 'login':           return 'Successful login';
    case 'logout':          return 'Signed out';
    case 'password_change': return 'Password changed';
    case 'suspicious':      return 'Suspicious activity';
    default:                return type.replace(/_/g, ' ');
  }
}

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: 'bg-gray-200' };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-400' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-amber-400' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-teal-400' };
  return { score, label: 'Strong', color: 'bg-teal-600' };
}

export default function SecurityPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [settings, setSettings] = useState<SecuritySettings>({ login_alerts: true, email_alerts: true });
  const [logsLoading, setLogsLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [pwForm, setPwForm] = useState<PasswordForm>({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/security/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/security/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSettings(data.settings);
      }
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchSettings();
  }, [fetchLogs, fetchSettings]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (!pwForm.current) { setPwError('Current password is required.'); return; }
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match.'); return; }
    const strength = passwordStrength(pwForm.next);
    if (strength.score < 2) { setPwError('Password is too weak. Add uppercase, numbers, or symbols.'); return; }
    setPwLoading(true);
    try {
      const res = await fetch('/api/security/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error || 'Failed to change password.'); return; }
      setPwSuccess('Password changed successfully. A confirmation email has been sent.');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch {
      setPwError('An unexpected error occurred.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleSettingsToggle = async (key: keyof SecuritySettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setSettingsSaving(true);
    try {
      await fetch('/api/security/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      showToast('Security preferences saved.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleLogoutAll = async () => {
    setLogoutAllLoading(true);
    try {
      const res = await fetch('/api/security/logout-all', { method: 'POST' });
      if (res.ok) {
        showToast('All sessions have been terminated. Please log in again.');
        setTimeout(() => { window.location.href = '/sign-up-login-screen'; }, 2000);
      }
    } finally {
      setLogoutAllLoading(false);
    }
  };

  const strength = passwordStrength(pwForm.next);
  const emailVerified = user?.email_confirmed_at != null;

  return (
    <DashboardLayout activeRoute="security">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* Toast */}
        {toast && (
          <div className="fixed top-5 right-5 z-50 bg-teal-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-500 animate-fade-in">
            {toast}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
            <Shield size={20} className="text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-gray-900">Account Security</h1>
            <p className="text-sm text-gray-500">Manage your security settings and monitor account activity</p>
          </div>
        </div>

        {/* Security Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${emailVerified ? 'bg-teal-50' : 'bg-amber-50'}`}>
              <Mail size={18} className={emailVerified ? 'text-teal-600' : 'text-amber-500'} />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-500 uppercase tracking-wide">Email</div>
              <div className={`text-sm font-700 ${emailVerified ? 'text-teal-700' : 'text-amber-600'}`}>
                {emailVerified ? 'Verified' : 'Not Verified'}
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <Lock size={18} className="text-teal-600" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-500 uppercase tracking-wide">Password</div>
              <div className="text-sm font-700 text-teal-700">Protected</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <Monitor size={18} className="text-teal-600" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-500 uppercase tracking-wide">Sessions</div>
              <div className="text-sm font-700 text-teal-700">Active</div>
            </div>
          </div>
        </div>

        {/* Email Verification Banner */}
        {!emailVerified && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-700 text-amber-800">Email not verified</div>
              <div className="text-xs text-amber-700 mt-0.5">Please verify your email address to improve account security.</div>
            </div>
          </div>
        )}

        {/* Password Change */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
            <Key size={16} className="text-teal-600" />
            <h2 className="text-base font-700 text-gray-900">Change Password</h2>
          </div>
          <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-600 text-gray-700 mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showPw.current ? 'text' : 'password'}
                  value={pwForm.current}
                  onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPw(s => ({ ...s, current: !s.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw.current ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {/* New Password */}
            <div>
              <label className="block text-sm font-600 text-gray-700 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showPw.next ? 'text' : 'password'}
                  value={pwForm.next}
                  onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw(s => ({ ...s, next: !s.next }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw.next ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Strength indicator */}
              {pwForm.next && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : 'bg-gray-100'}`} />
                    ))}
                  </div>
                  <div className="text-xs text-gray-500">Strength: <span className="font-600">{strength.label}</span></div>
                </div>
              )}
            </div>
            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-600 text-gray-700 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPw.confirm ? 'text' : 'password'}
                  value={pwForm.confirm}
                  onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {pwForm.confirm && pwForm.next && pwForm.confirm !== pwForm.next && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            {pwError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{pwError}</p>
              </div>
            )}
            {pwSuccess && (
              <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
                <CheckCircle size={14} className="text-teal-600 flex-shrink-0" />
                <p className="text-sm text-teal-700">{pwSuccess}</p>
              </div>
            )}

            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
              <Info size={13} className="text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-500">A confirmation email will be sent after the password is changed.</p>
            </div>

            <button
              type="submit"
              disabled={pwLoading}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-600 transition-colors disabled:opacity-60"
            >
              {pwLoading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Security Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
            <Bell size={16} className="text-teal-600" />
            <h2 className="text-base font-700 text-gray-900">Security Alerts</h2>
          </div>
          <div className="p-6 space-y-4">
            {settingsLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm"><Loader2 size={15} className="animate-spin" /> Loading…</div>
            ) : (
              <>
                <div className="flex items-center justify-between py-3 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                      <Monitor size={15} className="text-teal-600" />
                    </div>
                    <div>
                      <div className="text-sm font-600 text-gray-800">Login Notifications</div>
                      <div className="text-xs text-gray-400">Alert me when a new login is detected</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSettingsToggle('login_alerts')}
                    disabled={settingsSaving}
                    className={`relative w-11 h-6 rounded-full transition-colors ${settings.login_alerts ? 'bg-teal-500' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.login_alerts ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                      <Mail size={15} className="text-teal-600" />
                    </div>
                    <div>
                      <div className="text-sm font-600 text-gray-800">Email Security Alerts</div>
                      <div className="text-xs text-gray-400">Receive email for suspicious activity</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSettingsToggle('email_alerts')}
                    disabled={settingsSaving}
                    className={`relative w-11 h-6 rounded-full transition-colors ${settings.email_alerts ? 'bg-teal-500' : 'bg-gray-200'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.email_alerts ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Recent Login Activity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-teal-600" />
              <h2 className="text-base font-700 text-gray-900">Recent Activity</h2>
            </div>
            <button onClick={fetchLogs} className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1 font-500">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {logsLoading ? (
              <div className="px-6 py-8 flex items-center justify-center gap-2 text-gray-400 text-sm">
                <Loader2 size={16} className="animate-spin" /> Loading activity…
              </div>
            ) : logs.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">No activity recorded yet.</div>
            ) : (
              logs.slice(0, 10).map(log => (
                <div key={log.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                    {eventIcon(log.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-600 text-gray-800">{eventLabel(log.event_type)}</div>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                      {log.device_info?.browser && <span className="flex items-center gap-1"><Globe size={10} />{log.device_info.browser}</span>}
                      {log.device_info?.os && <span className="flex items-center gap-1"><Smartphone size={10} />{log.device_info.os}</span>}
                      {log.device_info?.location && <span>{log.device_info.location}</span>}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Session Management */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-2">
            <Monitor size={16} className="text-teal-600" />
            <h2 className="text-base font-700 text-gray-900">Session Management</h2>
          </div>
          <div className="p-6">
            <div className="flex items-start gap-4 bg-gray-50 rounded-xl p-4 mb-4">
              <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                <Monitor size={16} className="text-teal-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-700 text-gray-800">Current Session</div>
                <div className="text-xs text-gray-400 mt-0.5">This device — Active now</div>
              </div>
              <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-1 rounded-full font-600">Active</span>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-700 text-red-800">Sign out from all devices</div>
                  <div className="text-xs text-red-600 mt-0.5">This will immediately terminate all active sessions including this one.</div>
                </div>
              </div>
              <button
                onClick={handleLogoutAll}
                disabled={logoutAllLoading}
                className="mt-3 flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-600 transition-colors disabled:opacity-60"
              >
                {logoutAllLoading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                {logoutAllLoading ? 'Signing out…' : 'Sign Out All Devices'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
