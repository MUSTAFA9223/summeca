'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ExternalLink, Mail, RefreshCw, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';

type Connection = {
  provider: 'google' | 'microsoft';
  email: string;
  status: 'active' | 'error' | 'revoked';
  lastError: string;
  lastUsedAt: string | null;
  connectedAt: string;
  updatedAt: string;
};

type StatusPayload = {
  connection: Connection | null;
  providers: { google: boolean; microsoft: boolean };
};

function providerName(provider: 'google' | 'microsoft') {
  return provider === 'google' ? 'Gmail / Google Workspace' : 'Outlook / Microsoft 365';
}

export default function LeadFollowMailboxPage() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/leadfollow/email-connections', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load mailbox settings.');
      setData(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load mailbox settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function disconnect() {
    if (!data?.connection) return;
    if (!window.confirm(`Disconnect ${data.connection.email} from LeadFollow AI?`)) return;
    setDisconnecting(true);
    try {
      const response = await fetch('/api/leadfollow/email-connections', { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to disconnect mailbox.');
      toast.success('Mailbox disconnected.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to disconnect mailbox.');
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <DashboardLayout activeRoute="leadfollow-mailbox">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"><Mail size={15}/> LeadFollow AI</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Connected email</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Connect the mailbox you want customers to see as the sender. LeadFollow sends through the provider&apos;s official API; SUMMECA never asks for or stores your mailbox password.
            </p>
          </div>
          <Link href="/user-dashboard/leadfollow" className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold hover:border-primary/40 hover:text-primary">
            Back to LeadFollow
          </Link>
        </div>

        {loading && !data ? (
          <div className="flex min-h-56 items-center justify-center rounded-2xl border border-border bg-card"><RefreshCw className="animate-spin text-primary"/></div>
        ) : data?.connection ? (
          <section className="rounded-2xl border border-primary/25 bg-card p-6 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Mail size={22}/></div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black">{providerName(data.connection.provider)}</h2>
                    {data.connection.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success"><CheckCircle2 size={13}/> Connected</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700"><AlertTriangle size={13}/> Reconnect required</span>
                    )}
                  </div>
                  <p dir="ltr" className="mt-2 text-sm font-semibold text-foreground">{data.connection.email}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    New LeadFollow emails are sent from this mailbox and replies return to this mailbox automatically.
                  </p>
                  {data.connection.lastError && (
                    <p className="mt-3 max-w-xl rounded-xl bg-danger/5 px-3 py-2 text-xs leading-5 text-danger">{data.connection.lastError}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`/api/leadfollow/email-connections/${data.connection.provider}/start`} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/40 hover:text-primary"><RefreshCw size={15}/> Reconnect</a>
                <button onClick={disconnect} disabled={disconnecting} className="inline-flex items-center gap-2 rounded-xl border border-danger/20 px-4 py-2.5 text-sm font-bold text-danger hover:bg-danger/5 disabled:opacity-50"><Unplug size={15}/>{disconnecting ? 'Disconnecting...' : 'Disconnect'}</button>
              </div>
            </div>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-border bg-card p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Mail size={20}/></div>
              <h2 className="mt-4 text-lg font-black">Gmail / Google Workspace</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Send from the user&apos;s Gmail or Google Workspace address through Gmail&apos;s official API.</p>
              {data?.providers.google ? (
                <a href="/api/leadfollow/email-connections/google/start" className="btn-primary mt-5 inline-flex items-center gap-2 px-5 py-2.5">Connect Google <ExternalLink size={14}/></a>
              ) : (
                <div className="mt-5 rounded-xl bg-secondary/40 px-3 py-2 text-xs leading-5 text-muted-foreground">Google connection is not configured by the SUMMECA administrator yet.</div>
              )}
            </article>

            <article className="rounded-2xl border border-border bg-card p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Mail size={20}/></div>
              <h2 className="mt-4 text-lg font-black">Outlook / Microsoft 365</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Send from the user&apos;s Outlook or Microsoft 365 mailbox through Microsoft Graph.</p>
              {data?.providers.microsoft ? (
                <a href="/api/leadfollow/email-connections/microsoft/start" className="btn-primary mt-5 inline-flex items-center gap-2 px-5 py-2.5">Connect Microsoft <ExternalLink size={14}/></a>
              ) : (
                <div className="mt-5 rounded-xl bg-secondary/40 px-3 py-2 text-xs leading-5 text-muted-foreground">Microsoft connection is not configured by the SUMMECA administrator yet.</div>
              )}
            </article>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-secondary/20 p-5 text-sm leading-6 text-muted-foreground">
          <strong className="text-foreground">Privacy:</strong> SUMMECA stores an encrypted OAuth refresh token, never the mailbox password. Direct sending remains user-triggered after the AI draft is reviewed; connecting a mailbox does not enable background mass-mailing.
        </section>
      </div>
    </DashboardLayout>
  );
}
