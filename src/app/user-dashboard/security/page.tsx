'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, KeyRound, Loader2, LogOut, Mail, RefreshCw, Shield } from 'lucide-react';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';

type SecurityLog = {
  id: string;
  event_type: string;
  device_info?: { user_agent?: string | null } | null;
  created_at: string;
};

type PasswordForm = { current: string; next: string; confirm: string };

function labelEvent(event: string) {
  return event.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SecurityPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState('');
  const [form, setForm] = useState<PasswordForm>({ current: '', next: '', confirm: '' });
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [logoutBusy, setLogoutBusy] = useState(false);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError('');
    try {
      const response = await fetch('/api/security/logs', { cache: 'no-store' });
      const result = await response.json().catch(() => null) as { logs?: SecurityLog[]; error?: string } | null;
      if (!response.ok) throw new Error(result?.error || 'Unable to load security activity.');
      setLogs(result?.logs || []);
    } catch (error) {
      setLogsError(error instanceof Error ? error.message : 'Unable to load security activity.');
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => { void loadLogs(); }, [loadLogs]);

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError('');
    setPasswordMessage('');
    if (!form.current) return setPasswordError('Current password is required.');
    if (form.next.length < 8 || form.next.length > 128) return setPasswordError('New password must be between 8 and 128 characters.');
    if (form.next !== form.confirm) return setPasswordError('Passwords do not match.');

    setPasswordBusy(true);
    try {
      const response = await fetch('/api/security/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.next }),
      });
      const result = await response.json().catch(() => null) as { error?: string; emailNotificationSent?: boolean } | null;
      if (!response.ok) throw new Error(result?.error || 'Unable to change your password.');
      setForm({ current: '', next: '', confirm: '' });
      setPasswordMessage(result?.emailNotificationSent
        ? 'Password changed successfully. The email service also confirmed delivery of the security notification.'
        : 'Password changed successfully.');
      void loadLogs();
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Unable to change your password.');
    } finally {
      setPasswordBusy(false);
    }
  }

  async function logoutAll() {
    setLogoutBusy(true);
    try {
      const response = await fetch('/api/security/logout-all', { method: 'POST' });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || 'Unable to terminate sessions.');
      window.location.assign('/sign-up-login-screen');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Unable to terminate sessions.');
      setLogoutBusy(false);
    }
  }

  const emailVerified = Boolean(user?.email_confirmed_at);

  return (
    <DashboardLayout activeRoute="security">
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <header className="flex items-start gap-3">
          <div className="rounded-xl bg-teal-50 p-2.5"><Shield className="text-teal-600" size={21} /></div>
          <div>
            <h1 className="text-2xl font-800 text-gray-900">Account Security</h1>
            <p className="mt-1 text-sm text-gray-500">Only security information that SUMMECA can verify is shown here.</p>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Mail size={18} className={emailVerified ? 'text-teal-600' : 'text-amber-500'} />
              <div>
                <p className="text-xs font-600 uppercase tracking-wide text-gray-400">Email verification</p>
                <p className={`text-sm font-700 ${emailVerified ? 'text-teal-700' : 'text-amber-600'}`}>{emailVerified ? 'Verified' : 'Not verified'}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-teal-600" />
              <div>
                <p className="text-xs font-600 uppercase tracking-wide text-gray-400">Session controls</p>
                <p className="text-sm font-700 text-gray-800">Sign out everywhere is available below</p>
              </div>
            </div>
          </div>
        </section>

        {!emailVerified && (
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            Verify your email address using the most recent confirmation email before relying on email-based account recovery.
          </div>
        )}

        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4"><h2 className="flex items-center gap-2 font-700 text-gray-900"><KeyRound size={17} className="text-teal-600" />Change password</h2></div>
          <form onSubmit={changePassword} className="space-y-4 p-6">
            <label className="block text-sm font-600 text-gray-700">Current password<input type="password" autoComplete="current-password" value={form.current} onChange={(e) => setForm((v) => ({ ...v, current: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 font-400" required /></label>
            <label className="block text-sm font-600 text-gray-700">New password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={form.next} onChange={(e) => setForm((v) => ({ ...v, next: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 font-400" required /></label>
            <label className="block text-sm font-600 text-gray-700">Confirm new password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={form.confirm} onChange={(e) => setForm((v) => ({ ...v, confirm: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 font-400" required /></label>
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            {passwordMessage && <p className="flex items-center gap-2 text-sm text-teal-700"><CheckCircle2 size={16} />{passwordMessage}</p>}
            <button disabled={passwordBusy} className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-5 disabled:opacity-60">{passwordBusy && <Loader2 size={16} className="animate-spin" />}Update password</button>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="font-700 text-gray-900">Security activity</h2>
            <button onClick={() => void loadLogs()} disabled={logsLoading} className="inline-flex items-center gap-1.5 text-sm font-600 text-teal-700 disabled:opacity-50"><RefreshCw size={15} className={logsLoading ? 'animate-spin' : ''} />Refresh</button>
          </div>
          <div className="divide-y divide-gray-100">
            {logsLoading ? <div className="p-6 text-sm text-gray-500">Loading verified activity…</div> : logsError ? <div className="p-6 text-sm text-red-600">{logsError}</div> : logs.length === 0 ? <div className="p-6 text-sm text-gray-500">No server-recorded security events are available yet.</div> : logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-6 py-4">
                <Clock size={16} className="mt-0.5 shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1"><p className="text-sm font-600 text-gray-800">{labelEvent(log.event_type)}</p><p className="mt-0.5 truncate text-xs text-gray-400">{log.device_info?.user_agent || 'Server-recorded event'} · {new Date(log.created_at).toLocaleString()}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <h2 className="font-700 text-gray-900">Sign out everywhere</h2>
          <p className="mt-1 text-sm text-gray-500">Revokes active sessions through Supabase Auth. SUMMECA does not display an invented session count.</p>
          <button onClick={() => void logoutAll()} disabled={logoutBusy} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-700 text-red-600 hover:bg-red-50 disabled:opacity-60">{logoutBusy ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}Sign out everywhere</button>
        </section>
      </main>
    </DashboardLayout>
  );
}
