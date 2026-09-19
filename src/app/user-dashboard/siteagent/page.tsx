'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, CheckCircle2, Code2, Copy, Globe2, Mail, MessageSquareText, RefreshCw, Save, Sparkles, Users } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';

type SiteAgentAccess = {
  allowed: boolean;
  planName: string | null;
  purchasePath: string;
  limits: {
    monthlySiteAgentReplies?: number;
    maxKnowledgeChars?: number;
    maxSiteAgentDomains?: number;
  };
};

type Agent = {
  publicKey: string;
  agentName: string;
  businessName: string;
  welcomeMessage: string;
  knowledgeText: string;
  humanEmail: string;
  allowedDomains: string[];
  captureLeads: boolean;
  isEnabled: boolean;
};

type Conversation = {
  id: string;
  visitor_name: string;
  visitor_email: string;
  visitor_company: string;
  page_url: string;
  status: string;
  lead_id: string | null;
  started_at: string;
  updated_at: string;
};

type SiteAgentData = {
  access: SiteAgentAccess;
  agent: Agent;
  usage: { used: number; tokens: number; limit: number };
  conversations: Conversation[];
};

function initialAgent(): Agent {
  return {
    publicKey: '',
    agentName: 'SiteAgent AI',
    businessName: '',
    welcomeMessage: 'Hi! How can I help today?',
    knowledgeText: '',
    humanEmail: '',
    allowedDomains: [],
    captureLeads: true,
    isEnabled: true,
  };
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';
}

export default function SiteAgentPage() {
  const [data, setData] = useState<SiteAgentData | null>(null);
  const [agent, setAgent] = useState<Agent>(initialAgent);
  const [domainsText, setDomainsText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/siteagent', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load SiteAgent AI.');
      setData(payload);
      setAgent(payload.agent);
      setDomainsText((payload.agent.allowedDomains ?? []).join('\n'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load SiteAgent AI.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const maxKnowledge = data?.access.limits.maxKnowledgeChars ?? 0;
  const maxDomains = data?.access.limits.maxSiteAgentDomains ?? 0;
  const replyLimit = data?.usage.limit ?? data?.access.limits.monthlySiteAgentReplies ?? 0;
  const usagePercent = replyLimit > 0 ? Math.min(100, ((data?.usage.used ?? 0) / replyLimit) * 100) : 0;
  const domainCount = useMemo(
    () => domainsText.split(/[\n,]/).map((item) => item.trim()).filter(Boolean).length,
    [domainsText],
  );

  const embedSnippet = agent.publicKey
    ? `<script src="https://summeca.com/siteagent-widget.js" data-agent-key="${agent.publicKey}" async></script>`
    : '';

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/siteagent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_agent',
          agentName: agent.agentName,
          businessName: agent.businessName,
          welcomeMessage: agent.welcomeMessage,
          knowledgeText: agent.knowledgeText,
          humanEmail: agent.humanEmail,
          allowedDomains: domainsText,
          captureLeads: agent.captureLeads,
          isEnabled: agent.isEnabled,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to save SiteAgent AI.');
      setAgent(payload.agent);
      setDomainsText((payload.agent.allowedDomains ?? []).join('\n'));
      setData((current) => current ? { ...current, agent: payload.agent } : current);
      toast.success('SiteAgent AI settings saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save SiteAgent AI.');
    } finally {
      setSaving(false);
    }
  }

  async function copySnippet() {
    if (!embedSnippet) return;
    try {
      await navigator.clipboard.writeText(embedSnippet);
      toast.success('Embed code copied.');
    } catch {
      toast.error('Copy failed. Select the code and copy it manually.');
    }
  }

  return (
    <DashboardLayout activeRoute="siteagent">
      <div className="space-y-7">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              <Bot size={15} /> SUMMECA SaaS
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">SiteAgent AI</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Add a grounded AI assistant to your website, answer from your verified business knowledge, capture visitor contact details, and move qualified leads into LeadFollow AI.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </header>

        {loading && !data ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl border border-border bg-card" />)}
          </div>
        ) : data ? (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <Sparkles size={20} className="text-primary" />
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{data.access.planName ?? 'Free'}</span>
                </div>
                <p className="mt-4 text-sm font-bold text-foreground">AI replies this month</p>
                <p className="mt-1 text-3xl font-black">{data.usage.used} <span className="text-sm font-semibold text-muted-foreground">/ {replyLimit}</span></p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${usagePercent}%` }} />
                </div>
              </article>

              <article className="rounded-2xl border border-border bg-card p-5">
                <Globe2 size={20} className="text-primary" />
                <p className="mt-4 text-sm font-bold text-foreground">Allowed websites</p>
                <p className="mt-1 text-3xl font-black">{domainCount} <span className="text-sm font-semibold text-muted-foreground">/ {maxDomains}</span></p>
                <p className="mt-2 text-xs text-muted-foreground">Only configured domains can use your public agent key.</p>
              </article>

              <article className="rounded-2xl border border-border bg-card p-5">
                <Users size={20} className="text-primary" />
                <p className="mt-4 text-sm font-bold text-foreground">Recent conversations</p>
                <p className="mt-1 text-3xl font-black">{data.conversations.length}</p>
                <p className="mt-2 text-xs text-muted-foreground">Latest conversations loaded for this account.</p>
              </article>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
              <form onSubmit={save} className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
                <div>
                  <h2 className="text-lg font-black text-foreground">Agent setup</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">The model is instructed to answer only from the knowledge you provide and the live conversation.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-foreground">
                    Agent name
                    <input
                      className="form-input mt-1.5 w-full"
                      maxLength={100}
                      value={agent.agentName}
                      onChange={(event) => setAgent({ ...agent, agentName: event.target.value })}
                      placeholder="SiteAgent AI"
                    />
                  </label>
                  <label className="text-sm font-semibold text-foreground">
                    Business name
                    <input
                      className="form-input mt-1.5 w-full"
                      maxLength={160}
                      value={agent.businessName}
                      onChange={(event) => setAgent({ ...agent, businessName: event.target.value })}
                      placeholder="Your business"
                    />
                  </label>
                </div>

                <label className="block text-sm font-semibold text-foreground">
                  Welcome message
                  <input
                    className="form-input mt-1.5 w-full"
                    maxLength={500}
                    value={agent.welcomeMessage}
                    onChange={(event) => setAgent({ ...agent, welcomeMessage: event.target.value })}
                    placeholder="Hi! How can I help today?"
                  />
                </label>

                <label className="block text-sm font-semibold text-foreground">
                  Verified business knowledge
                  <textarea
                    className="form-input mt-1.5 min-h-64 w-full"
                    maxLength={maxKnowledge || 80000}
                    value={agent.knowledgeText}
                    onChange={(event) => setAgent({ ...agent, knowledgeText: event.target.value })}
                    placeholder="Paste factual information about your products, services, pricing, policies, FAQs, opening hours, delivery, and other facts the agent is allowed to use."
                  />
                  <span className="mt-1.5 block text-xs font-normal text-muted-foreground">
                    {agent.knowledgeText.length.toLocaleString()} / {maxKnowledge.toLocaleString()} characters
                  </span>
                </label>

                <label className="block text-sm font-semibold text-foreground">
                  Allowed website domains
                  <textarea
                    className="form-input mt-1.5 min-h-24 w-full"
                    value={domainsText}
                    onChange={(event) => setDomainsText(event.target.value)}
                    placeholder={'example.com\nstore.example.com'}
                  />
                  <span className="mt-1.5 block text-xs font-normal text-muted-foreground">One domain per line. Current plan limit: {maxDomains}.</span>
                </label>

                <label className="block text-sm font-semibold text-foreground">
                  Human handoff email
                  <input
                    className="form-input mt-1.5 w-full"
                    type="email"
                    maxLength={240}
                    value={agent.humanEmail}
                    onChange={(event) => setAgent({ ...agent, humanEmail: event.target.value })}
                    placeholder="support@example.com"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-start gap-3 rounded-xl border border-border p-4 text-sm">
                    <input
                      type="checkbox"
                      checked={agent.captureLeads}
                      onChange={(event) => setAgent({ ...agent, captureLeads: event.target.checked })}
                      className="mt-1"
                    />
                    <span><strong className="block">Capture leads</strong><span className="text-xs text-muted-foreground">Send visitors with email details into LeadFollow when its plan has capacity.</span></span>
                  </label>
                  <label className="flex items-start gap-3 rounded-xl border border-border p-4 text-sm">
                    <input
                      type="checkbox"
                      checked={agent.isEnabled}
                      onChange={(event) => setAgent({ ...agent, isEnabled: event.target.checked })}
                      className="mt-1"
                    />
                    <span><strong className="block">Agent enabled</strong><span className="text-xs text-muted-foreground">Turn the public website agent on or off without removing the embed code.</span></span>
                  </label>
                </div>

                <button
                  disabled={saving}
                  className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={15} /> {saving ? 'Saving…' : 'Save SiteAgent settings'}
                </button>
              </form>

              <div className="space-y-6">
                <section className="rounded-2xl border border-primary/20 bg-primary/[0.035] p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <Code2 size={19} className="text-primary" />
                    <h2 className="font-black text-foreground">Install on your website</h2>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Save at least one allowed domain, then paste this snippet before the closing body tag on that website.
                  </p>
                  <pre className="mt-4 overflow-x-auto rounded-xl border border-border bg-foreground p-4 text-xs leading-6 text-background"><code>{embedSnippet || 'Loading agent key…'}</code></pre>
                  <button
                    type="button"
                    onClick={() => void copySnippet()}
                    disabled={!embedSnippet}
                    className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/25 bg-card px-4 text-sm font-bold text-primary disabled:opacity-50"
                  >
                    <Copy size={14} /> Copy embed code
                  </button>
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-card p-3 text-xs leading-5 text-muted-foreground">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-primary" />
                    The public key identifies your agent. It does not expose your SUMMECA account credentials or service-role keys.
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <MessageSquareText size={19} className="text-primary" />
                    <h2 className="font-black text-foreground">How lead capture works</h2>
                  </div>
                  <ol className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                    <li><strong className="text-foreground">1.</strong> A visitor asks a question on your website.</li>
                    <li><strong className="text-foreground">2.</strong> SiteAgent answers from your verified knowledge only.</li>
                    <li><strong className="text-foreground">3.</strong> If the visitor provides an email, SiteAgent can add them to LeadFollow AI within your LeadFollow plan limit.</li>
                    <li><strong className="text-foreground">4.</strong> Continue with LeadFollow → ProposalFlow → InvoiceFlow.</li>
                  </ol>
                  {agent.humanEmail && (
                    <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-primary"><Mail size={14} /> Human handoff: {agent.humanEmail}</p>
                  )}
                </section>
              </div>
            </div>

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-foreground">Recent conversations</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Only conversations belonging to this SiteAgent account are shown.</p>
                </div>
              </div>

              {data.conversations.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-12 text-center">
                  <Bot size={28} className="mx-auto text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-bold text-foreground">No visitor conversations yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Install the widget on an allowed domain to start receiving conversations.</p>
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                      <tr><th className="py-3 pr-4">Visitor</th><th className="py-3 pr-4">Page</th><th className="py-3 pr-4">Status</th><th className="py-3 pr-4">Lead</th><th className="py-3">Updated</th></tr>
                    </thead>
                    <tbody>
                      {data.conversations.map((conversation) => (
                        <tr key={conversation.id} className="border-b border-border/60">
                          <td className="py-3 pr-4">
                            <div className="font-semibold text-foreground">{conversation.visitor_name || conversation.visitor_email || 'Anonymous visitor'}</div>
                            {conversation.visitor_email && conversation.visitor_name && <div className="text-xs text-muted-foreground">{conversation.visitor_email}</div>}
                          </td>
                          <td className="max-w-72 truncate py-3 pr-4 text-xs text-muted-foreground">{conversation.page_url || '—'}</td>
                          <td className="py-3 pr-4"><span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold capitalize">{conversation.status}</span></td>
                          <td className="py-3 pr-4 text-xs font-semibold">{conversation.lead_id ? <span className="text-success">Captured</span> : '—'}</td>
                          <td className="py-3 text-xs text-muted-foreground">{dateLabel(conversation.updated_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
