'use client';

import { FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  ExternalLink,
  FileText,
  Mail,
  MessageSquareText,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';

type Access = { allowed: boolean; planName: string | null; purchasePath: string; limits: { maxLeads?: number; monthlyAi?: number } };
type Profile = { business_name: string; offer: string; target_audience: string; value_proposition: string; default_tone: string };
type LeadStatus = 'new' | 'contacted' | 'proposal_sent' | 'replied' | 'won' | 'lost';
type Lead = { id: string; name: string; company: string; email: string; phone: string; source: string; status: LeadStatus; notes: string; next_follow_up_at: string | null; last_contacted_at: string | null; created_at: string };
type Message = { id: string; lead_id: string; channel: string; stage: string; tone: string; language: string; output_text: string; created_at: string };
type Pagination = { page: number; pageSize: number; total: number; totalPages: number; hasPrevious: boolean; hasNext: boolean };
type MailboxConnection = { provider: 'google' | 'microsoft'; email: string; status: string };
type Data = { access: Access; profile: Profile | null; leads: Lead[]; messages: Message[]; counts: { leads: number; due: number; pipeline: Record<string, number> }; pagination: Pagination; usage: { used: number; limit: number; tokens: number; periodStart: string } };
type Metric = [label: string, value: number, icon: LucideIcon];

const emptyProfile: Profile = { business_name: '', offer: '', target_audience: '', value_proposition: '', default_tone: 'professional' };
const statusOptions: LeadStatus[] = ['new', 'contacted', 'proposal_sent', 'replied', 'won', 'lost'];
const activeFollowUpStatuses = new Set<LeadStatus>(['new', 'contacted', 'proposal_sent', 'replied']);

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1.5 block text-xs font-semibold text-foreground">{children}</span>;
}

function draftLanguageAttributes(language: string) {
  const isArabic = language.trim().toLowerCase() === 'arabic';
  return { dir: isArabic ? 'rtl' as const : 'ltr' as const, lang: isArabic ? 'ar' : undefined };
}

function emailDraftParts(value: string, language = 'English') {
  const normalized = value.replace(/\r\n/g, '\n').trim();
  const lines = normalized.split('\n');
  const subjectPattern = language.trim().toLowerCase() === 'arabic'
    ? /^\s*(?:الموضوع|subject)\s*:\s*(.+)\s*$/i
    : /^\s*(?:subject|الموضوع)\s*:\s*(.+)\s*$/i;
  const match = lines[0]?.match(subjectPattern);
  if (!match) return { subject: '', body: normalized };
  return { subject: match[1].trim().slice(0, 180), body: lines.slice(1).join('\n').trim() };
}

function localInputDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function followUpPreset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localInputDate(date.toISOString());
}

function isFollowUpDue(lead: Lead) {
  if (!activeFollowUpStatuses.has(lead.status) || !lead.next_follow_up_at) return false;
  const due = new Date(lead.next_follow_up_at).getTime();
  return Number.isFinite(due) && due <= Date.now();
}

function displayDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(date);
}

function providerLabel(provider: MailboxConnection['provider']) {
  return provider === 'google' ? 'Google' : 'Microsoft';
}

function leadStatusLabel(status: LeadStatus) {
  return status === 'proposal_sent' ? 'Proposal sent' : status.charAt(0).toUpperCase() + status.slice(1);
}

function proposalHref(lead: Lead) {
  const params = new URLSearchParams({
    leadId: lead.id,
    clientName: lead.name,
    clientCompany: lead.company || '',
    clientEmail: lead.email || '',
    extraContext: [
      lead.source ? `Lead source: ${lead.source}` : '',
      lead.notes ? `Lead notes: ${lead.notes}` : '',
    ].filter(Boolean).join('\n'),
  });
  return `/user-dashboard/proposalflow?${params.toString()}`;
}

function LeadFollowSkeleton() {
  return (
    <div className="space-y-7" aria-busy="true" aria-label="Loading LeadFollow AI">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"><Sparkles size={15} /> SUMMECA SaaS</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">LeadFollow AI</h1>
          <p className="mt-2 text-sm text-muted-foreground">Preparing your lead workspace…</p>
        </div>
        <div className="h-10 w-48 animate-pulse rounded-xl bg-primary/10" />
      </header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />)}
      </section>
      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
        <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
      </section>
      <p className="sr-only" role="status">Loading LeadFollow AI...</p>
    </div>
  );
}

export default function LeadFollowPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeLeadAction, setActiveLeadAction] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [forbidden, setForbidden] = useState<Access | null>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [mailboxConnection, setMailboxConnection] = useState<MailboxConnection | null>(null);
  const [mailboxLoading, setMailboxLoading] = useState(true);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadPage, setLeadPage] = useState(1);
  const [leadForm, setLeadForm] = useState({ name: '', company: '', email: '', phone: '', source: '', notes: '', nextFollowUpAt: '' });
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [draftForm, setDraftForm] = useState({ channel: 'email', stage: 'follow_up', tone: 'professional', language: 'English', extraContext: '' });
  const [latestDraft, setLatestDraft] = useState('');
  const [latestDraftLanguage, setLatestDraftLanguage] = useState('English');
  const [latestDraftChannel, setLatestDraftChannel] = useState('');
  const [latestMessageId, setLatestMessageId] = useState('');
  const [latestLeadId, setLatestLeadId] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailPermissionConfirmed, setEmailPermissionConfirmed] = useState(false);
  const [emailReviewConfirmed, setEmailReviewConfirmed] = useState(false);
  const [emailSentAt, setEmailSentAt] = useState('');
  const [followUpValue, setFollowUpValue] = useState('');

  const loadMailbox = useCallback(async () => {
    setMailboxLoading(true);
    try {
      const response = await fetch('/api/leadfollow/email-connections', { cache: 'no-store' });
      if (!response.ok) {
        setMailboxConnection(null);
        return;
      }
      const payload = await response.json();
      const connection = payload.connection as MailboxConnection | null;
      setMailboxConnection(connection?.status === 'active' ? connection : null);
    } catch {
      setMailboxConnection(null);
    } finally {
      setMailboxLoading(false);
    }
  }, []);

  const load = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leadfollow?page=${encodeURIComponent(String(page))}`, { cache: 'no-store' });
      const payload = await response.json();
      if (response.status === 403) {
        setForbidden(payload.access ?? { allowed: false, planName: null, purchasePath: '/products/summeca-leadfollow-ai', limits: {} });
        setData(null);
        return;
      }
      if (!response.ok) throw new Error(payload.error || 'Unable to load LeadFollow AI.');
      setForbidden(null);
      setData(payload);
      setProfile(payload.profile ? { ...emptyProfile, ...payload.profile } : emptyProfile);
      setLeadPage(payload.pagination?.page ?? page);
      setSelectedLeadId((current) => payload.leads?.some((lead: Lead) => lead.id === current) ? current : payload.leads?.[0]?.id || '');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load LeadFollow AI.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(leadPage); }, [leadPage, load]);
  useEffect(() => { void loadMailbox(); }, [loadMailbox]);

  const selectedLead = useMemo(() => data?.leads.find((lead) => lead.id === selectedLeadId) ?? null, [data?.leads, selectedLeadId]);
  const salesContextReady = Boolean(profile.business_name.trim() && profile.offer.trim() && profile.value_proposition.trim());
  const metrics = useMemo<Metric[]>(() => data ? [
    ['Leads', data.counts.leads, Users],
    ['Due now', data.counts.due, CalendarClock],
    ['Contacted', data.counts.pipeline.contacted || 0, MessageSquareText],
    ['Proposals', data.counts.pipeline.proposal_sent || 0, Target],
    ['Won', data.counts.pipeline.won || 0, Check],
  ] : [], [data]);

  useEffect(() => {
    setFollowUpValue(localInputDate(selectedLead?.next_follow_up_at ?? null));
  }, [selectedLead?.id, selectedLead?.next_follow_up_at]);

  async function post(body: Record<string, unknown>) {
    const response = await fetch('/api/leadfollow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'LeadFollow action failed.');
    return payload;
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await post({ action: 'save_profile', businessName: profile.business_name, offer: profile.offer, targetAudience: profile.target_audience, valueProposition: profile.value_proposition, defaultTone: profile.default_tone });
      toast.success('Business context saved.');
      await load(leadPage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function createLead(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = await post({ action: 'create_lead', ...leadForm, nextFollowUpAt: leadForm.nextFollowUpAt || null });
      setLeadForm({ name: '', company: '', email: '', phone: '', source: '', notes: '', nextFollowUpAt: '' });
      setShowLeadForm(false);
      setSelectedLeadId(payload.lead.id);
      toast.success('Lead added.');
      await load(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to add lead.');
    } finally {
      setSaving(false);
    }
  }

  async function updateLead(leadId: string, patch: Record<string, unknown>, success: string) {
    const key = `lead:${leadId}`;
    if (activeLeadAction) return;
    setActiveLeadAction(key);
    try {
      await post({ action: 'update_lead', leadId, ...patch });
      toast.success(success);
      await load(leadPage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update lead.');
    } finally {
      setActiveLeadAction('');
    }
  }

  function openEmailFollowUp(lead: Lead) {
    setSelectedLeadId(lead.id);
    setDraftForm((current) => ({ ...current, stage: lead.status === 'new' ? 'first_contact' : 'follow_up', channel: 'email' }));
    requestAnimationFrame(() => {
      document.getElementById('follow-up-studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function generateDraft(event: FormEvent) {
    event.preventDefault();
    if (!selectedLeadId) {
      toast.error('Choose a lead first.');
      return;
    }
    if (generating) return;
    setGenerating(true);
    setLatestDraft('');
    setLatestMessageId('');
    setEmailSubject('');
    setEmailPermissionConfirmed(false);
    setEmailReviewConfirmed(false);
    setEmailSentAt('');
    try {
      const response = await fetch('/api/leadfollow/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedLeadId, ...draftForm }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'AI generation failed.');
      const rawDraft = payload.output || '';
      const parts = draftForm.channel === 'email' ? emailDraftParts(rawDraft, draftForm.language) : { subject: '', body: rawDraft };
      setLatestDraft(parts.body);
      setEmailSubject(parts.subject);
      setLatestMessageId(payload.message?.id || '');
      setLatestLeadId(selectedLeadId);
      setLatestDraftChannel(draftForm.channel);
      setLatestDraftLanguage(draftForm.language);
      toast.success('Draft generated and saved to history.');
      await load(leadPage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  async function sendLatestEmail() {
    if (!selectedLead || latestLeadId !== selectedLead.id) {
      toast.error('Generate an email draft for the selected lead first.');
      return;
    }
    if (latestDraftChannel !== 'email' || !latestMessageId) {
      toast.error('Only an Email-channel draft can be sent by email.');
      return;
    }
    if (!selectedLead.email?.trim()) {
      toast.error('This lead does not have an email address.');
      return;
    }
    if (!emailSubject.trim()) {
      toast.error('Add an email subject before sending.');
      return;
    }
    if (!latestDraft.trim()) {
      toast.error('Email body cannot be empty.');
      return;
    }
    if (!emailReviewConfirmed) {
      toast.error('Review the subject and message before sending.');
      return;
    }
    if (!emailPermissionConfirmed) {
      toast.error('Confirm that you have permission or a lawful basis to email this lead.');
      return;
    }
    if (sendingEmail) return;

    setSendingEmail(true);
    try {
      const response = await fetch('/api/leadfollow/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: latestMessageId, subject: emailSubject, body: latestDraft, confirmed: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Email could not be sent.');
      setEmailSentAt(payload.sentAt || new Date().toISOString());
      setEmailPermissionConfirmed(false);
      setEmailReviewConfirmed(false);
      if ((payload.provider === 'google' || payload.provider === 'microsoft') && payload.senderEmail) {
        setMailboxConnection({ provider: payload.provider, email: payload.senderEmail, status: 'active' });
      }
      toast.success(`Email sent to ${selectedLead.email}.`);
      await load(leadPage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Email could not be sent.');
    } finally {
      setSendingEmail(false);
    }
  }

  async function copyDraft(value = latestDraft) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Draft copied.');
    } catch {
      toast.error('Could not copy the draft.');
    }
  }

  if (loading && !data) {
    return <DashboardLayout activeRoute="leadfollow"><LeadFollowSkeleton /></DashboardLayout>;
  }

  if (forbidden) return (
    <DashboardLayout activeRoute="leadfollow">
      <div className="mx-auto max-w-3xl py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Bot size={30} /></div>
        <h1 className="mt-6 text-3xl font-black">Unlock LeadFollow AI</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">Purchase a lifetime plan, then manage leads, create AI-assisted follow-ups, and send reviewed email drafts from your SUMMECA account.</p>
        <Link href={forbidden.purchasePath || '/products/summeca-leadfollow-ai'} className="btn-primary mt-7 inline-flex items-center gap-2 px-6 py-3">View LeadFollow AI plans <ExternalLink size={15} /></Link>
      </div>
    </DashboardLayout>
  );

  if (!data) return <DashboardLayout activeRoute="leadfollow"><div className="p-8 text-center text-muted-foreground">LeadFollow AI could not be loaded.</div></DashboardLayout>;

  return (
    <DashboardLayout activeRoute="leadfollow">
      <div className="space-y-7" aria-busy={loading}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"><Sparkles size={15} /> SUMMECA SaaS</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight">LeadFollow AI</h1>
            <p className="mt-2 text-sm text-muted-foreground">Keep every lead organized, generate grounded follow-ups, and send reviewed email drafts through your connected mailbox.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-2 text-xs font-bold text-primary">{data.access.planName} · {data.access.planName === 'Free' ? 'Free tier' : 'Lifetime'}</span>
            <span className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold">AI drafts: {data.usage.used}/{data.usage.limit} this month</span>
            <Link href="/user-dashboard/leadfollow/mailbox" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary">
              <Mail size={13} />
              {mailboxLoading ? 'Checking mailbox…' : mailboxConnection ? `${providerLabel(mailboxConnection.provider)} · ${mailboxConnection.email}` : 'Connect mailbox'}
            </Link>
            <button onClick={() => setShowLeadForm((value) => !value)} className="btn-primary inline-flex items-center gap-2 px-4 py-2"><Plus size={15} /> Add lead</button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map(([label, value, Icon]) => (
            <div key={label} className={`rounded-2xl border bg-card p-5 ${label === 'Due now' && value > 0 ? 'border-amber-500/30' : 'border-border'}`}>
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon size={18} className={label === 'Due now' && value > 0 ? 'text-amber-600' : 'text-primary'} /></div>
              <div className={`mt-2 text-2xl font-black ${label === 'Due now' && value > 0 ? 'text-amber-700 dark:text-amber-400' : ''}`}>{value}</div>
            </div>
          ))}
        </section>

        {showLeadForm && (
          <section className="rounded-2xl border border-primary/25 bg-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="font-bold">Add a lead</h2><p className="text-xs text-muted-foreground">Only add information you actually know. AI drafts use these facts as context.</p></div>
              <button type="button" onClick={() => setShowLeadForm(false)} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
            </div>
            <form onSubmit={createLead} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label><FieldLabel>Lead name</FieldLabel><input required className="form-input w-full" placeholder="Lead name" value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} /></label>
              <label><FieldLabel>Company</FieldLabel><input className="form-input w-full" placeholder="Company" value={leadForm.company} onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })} /></label>
              <label><FieldLabel>Source</FieldLabel><input className="form-input w-full" placeholder="Source" value={leadForm.source} onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })} /></label>
              <label><FieldLabel>Email</FieldLabel><input className="form-input w-full" type="email" placeholder="Email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} /></label>
              <label><FieldLabel>Phone</FieldLabel><input className="form-input w-full" placeholder="Phone" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} /></label>
              <label><FieldLabel>Next follow-up</FieldLabel><input className="form-input w-full" type="datetime-local" lang="en" dir="ltr" value={leadForm.nextFollowUpAt} onChange={(e) => setLeadForm({ ...leadForm, nextFollowUpAt: e.target.value })} /></label>
              <label className="sm:col-span-2 lg:col-span-3"><FieldLabel>Factual notes</FieldLabel><textarea className="form-input w-full" placeholder="Need, objection, last conversation, requested information..." value={leadForm.notes} onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })} /></label>
              <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3"><span className="mr-1 self-center text-xs font-semibold text-muted-foreground">Quick follow-up:</span>{[{ label: 'Tomorrow', days: 1 }, { label: '+3 days', days: 3 }, { label: '+7 days', days: 7 }].map((preset) => <button key={preset.days} type="button" onClick={() => setLeadForm({ ...leadForm, nextFollowUpAt: followUpPreset(preset.days) })} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:border-primary/40 hover:text-primary">{preset.label}</button>)}</div>
              <button disabled={saving} className="btn-primary sm:col-span-2 lg:col-span-3 py-2.5 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving lead…' : 'Save lead'}</button>
            </form>
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <form onSubmit={saveProfile} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2"><Target size={18} className="text-primary" /><h2 className="font-bold">Your sales context</h2></div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Set this once so drafts stay grounded in your real offer. LeadFollow will not invent missing claims.</p>
            <div className={`mt-4 rounded-xl border px-3 py-2.5 text-xs leading-5 ${salesContextReady ? 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300' : 'border-amber-500/25 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300'}`}>
              {salesContextReady ? 'Draft context ready — LeadFollow can name your business, offer, and value proposition instead of using generic sales copy.' : 'For specific, professional drafts, add at least your business name, offer, and value proposition before generating.'}
            </div>
            <div className="mt-5 space-y-3">
              <label><FieldLabel>Business name</FieldLabel><input className="form-input w-full" placeholder="Business name" value={profile.business_name} onChange={(e) => setProfile({ ...profile, business_name: e.target.value })} /></label>
              <label><FieldLabel>Offer</FieldLabel><textarea className="form-input w-full" placeholder="What do you sell? Include factual scope and price only if you want it used." value={profile.offer} onChange={(e) => setProfile({ ...profile, offer: e.target.value })} /></label>
              <label><FieldLabel>Target audience</FieldLabel><textarea className="form-input w-full" placeholder="Target audience" value={profile.target_audience} onChange={(e) => setProfile({ ...profile, target_audience: e.target.value })} /></label>
              <label><FieldLabel>Value proposition</FieldLabel><textarea className="form-input w-full" placeholder="Factual value proposition — no invented results" value={profile.value_proposition} onChange={(e) => setProfile({ ...profile, value_proposition: e.target.value })} /></label>
              <label><FieldLabel>Default tone</FieldLabel><select className="form-input w-full" value={profile.default_tone} onChange={(e) => setProfile({ ...profile, default_tone: e.target.value })}><option value="professional">Professional</option><option value="friendly">Friendly</option><option value="concise">Concise</option><option value="consultative">Consultative</option></select></label>
            </div>
            <button disabled={saving} className="btn-primary mt-4 px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving context…' : 'Save sales context'}</button>
          </form>

          <form id="follow-up-studio" onSubmit={generateDraft} className="scroll-mt-24 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.05] to-card p-6">
            <div className="flex items-center gap-2"><Bot size={19} className="text-primary" /><h2 className="font-bold">AI follow-up studio</h2></div>
            <p className="mt-1 text-xs text-muted-foreground">Generate and review the draft first. Email-channel drafts can then be sent through your connected mailbox; other channels remain copy-and-send.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2"><FieldLabel>Lead</FieldLabel><select required className="form-input w-full" value={selectedLeadId} onChange={(e) => setSelectedLeadId(e.target.value)}><option value="">Choose a lead</option>{data.leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}{lead.company ? ` — ${lead.company}` : ''}</option>)}</select></label>
              <label><FieldLabel>Channel</FieldLabel><select className="form-input w-full" value={draftForm.channel} onChange={(e) => setDraftForm({ ...draftForm, channel: e.target.value })}><option value="email">Email</option><option value="linkedin">LinkedIn</option><option value="whatsapp">WhatsApp</option><option value="sms">SMS</option><option value="generic">Generic</option></select></label>
              <label><FieldLabel>Stage</FieldLabel><select className="form-input w-full" value={draftForm.stage} onChange={(e) => setDraftForm({ ...draftForm, stage: e.target.value })}><option value="first_contact">First contact</option><option value="follow_up">Follow-up</option><option value="objection">Objection response</option><option value="close">Close / next step</option><option value="revive">Revive old lead</option></select></label>
              <label><FieldLabel>Tone</FieldLabel><select className="form-input w-full" value={draftForm.tone} onChange={(e) => setDraftForm({ ...draftForm, tone: e.target.value })}><option>professional</option><option>friendly</option><option>concise</option><option>consultative</option><option>warm</option></select></label>
              <label><FieldLabel>Language</FieldLabel><select className="form-input w-full" value={draftForm.language} onChange={(e) => setDraftForm({ ...draftForm, language: e.target.value })}><option>English</option><option>Arabic</option><option>Spanish</option><option>French</option><option>German</option></select></label>
              <label className="sm:col-span-2"><FieldLabel>Additional factual context (optional)</FieldLabel><textarea {...draftLanguageAttributes(draftForm.language)} className="form-input w-full" placeholder="Context for this specific message" value={draftForm.extraContext} onChange={(e) => setDraftForm({ ...draftForm, extraContext: e.target.value })} /></label>
            </div>
            <button disabled={generating || !selectedLeadId || data.usage.used >= data.usage.limit} className="btn-primary mt-4 inline-flex items-center gap-2 px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"><Sparkles size={15} />{generating ? 'Generating…' : 'Generate draft'}</button>

            {latestDraft && (
              <div className="mt-5 rounded-xl border border-primary/20 bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">Latest draft · review before using</span>
                  <button type="button" onClick={() => copyDraft(latestDraftChannel === 'email' ? `${emailSubject ? `Subject: ${emailSubject}\n\n` : ''}${latestDraft}` : latestDraft)} className="inline-flex items-center gap-1 text-xs font-bold text-primary"><Clipboard size={13} /> Copy</button>
                </div>

                {latestDraftChannel === 'email' && (
                  <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-bold text-primary"><Mail size={14} /> Direct email delivery</div><Link href="/user-dashboard/leadfollow/mailbox" className="text-xs font-semibold text-primary hover:underline">Manage mailbox</Link></div>
                    <div className="rounded-lg border border-border/70 bg-background px-3 py-2.5 text-xs leading-5 text-muted-foreground">
                      <div>From: {mailboxLoading ? <span>Checking mailbox…</span> : mailboxConnection ? <><span className="font-semibold text-foreground">{profile.business_name || providerLabel(mailboxConnection.provider)}</span>{' '}<span dir="ltr" className="font-semibold text-foreground">&lt;{mailboxConnection.email}&gt;</span>{' '}<span>· {providerLabel(mailboxConnection.provider)}</span></> : <span className="font-semibold text-foreground">SUMMECA fallback delivery</span>}</div>
                      <div>To: <span dir="ltr" className="font-semibold text-foreground">{selectedLead?.email || 'No email on this lead'}</span></div>
                    </div>
                    <label><FieldLabel>Email subject</FieldLabel><input className="form-input w-full" value={emailSubject} maxLength={180} placeholder="Email subject" onChange={(event) => { setEmailSubject(event.target.value); setEmailReviewConfirmed(false); }} /></label>
                    <label><FieldLabel>Email body</FieldLabel><textarea {...draftLanguageAttributes(latestDraftLanguage)} className="form-input min-h-44 w-full" value={latestDraft} maxLength={8000} onChange={(event) => { setLatestDraft(event.target.value); setEmailReviewConfirmed(false); }} /></label>
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2.5 text-xs leading-5 text-amber-800 dark:text-amber-300">
                      Sending is a separate action from generating. Review the recipient, subject and body below before enabling Send email.
                    </div>
                    <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><input type="checkbox" className="mt-1" checked={emailReviewConfirmed} onChange={(event) => setEmailReviewConfirmed(event.target.checked)} /><span>I reviewed the recipient, subject and email body and want to send this draft.</span></label>
                    <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><input type="checkbox" className="mt-1" checked={emailPermissionConfirmed} onChange={(event) => setEmailPermissionConfirmed(event.target.checked)} /><span>I confirm I have permission or a lawful basis to email this lead.{' '}{mailboxConnection ? <>This message will be sent from <span dir="ltr" className="font-semibold text-foreground">{mailboxConnection.email}</span> through {providerLabel(mailboxConnection.provider)}, so replies return to that mailbox.</> : <>No connected mailbox is active; SUMMECA fallback delivery will route replies to my account email.</>}</span></label>
                    <button
                      type="button"
                      onClick={sendLatestEmail}
                      disabled={sendingEmail || Boolean(emailSentAt) || !selectedLead?.email || !emailSubject.trim() || !latestDraft.trim() || !emailReviewConfirmed || !emailPermissionConfirmed}
                      className="inline-flex items-center gap-2 rounded-xl border border-foreground bg-foreground px-5 py-2.5 text-sm font-bold text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {sendingEmail ? <RefreshCw size={15} className="animate-spin" /> : emailSentAt ? <Check size={15} /> : <Send size={15} />}
                      {sendingEmail ? 'Sending…' : emailSentAt ? 'Email sent' : 'Send email'}
                    </button>
                    {emailSentAt && <div className="text-xs font-semibold text-success">Sent successfully at <time dir="ltr">{displayDateTime(emailSentAt)}</time>.</div>}
                  </div>
                )}

                {latestDraftChannel !== 'email' && <pre {...draftLanguageAttributes(latestDraftLanguage)} className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-foreground">{latestDraft}</pre>}
              </div>
            )}
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-bold">Lead pipeline</h2><p className="mt-1 text-xs text-muted-foreground">{data.counts.leads} / {data.access.limits.maxLeads ?? '—'} plan limit · {data.counts.due} active follow-up{data.counts.due === 1 ? '' : 's'} due now · showing up to {data.pagination.pageSize} per page</p></div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <button type="button" aria-label="Previous lead page" disabled={!data.pagination.hasPrevious || loading} onClick={() => setLeadPage((page) => Math.max(1, page - 1))} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background disabled:opacity-40"><ChevronLeft size={16} /></button>
              <span className="min-w-[110px] text-center font-semibold">Page {data.pagination.page} of {data.pagination.totalPages}</span>
              <button type="button" aria-label="Next lead page" disabled={!data.pagination.hasNext || loading} onClick={() => setLeadPage((page) => page + 1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>

          {data.leads.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground"><tr><th className="py-3 pr-4">Lead</th><th className="py-3 pr-4">Source</th><th className="py-3 pr-4">Status</th><th className="py-3 pr-4">Next follow-up</th><th className="py-3">Actions</th></tr></thead>
                <tbody>
                  {data.leads.map((lead) => {
                    const due = isFollowUpDue(lead);
                    const rowBusy = activeLeadAction === `lead:${lead.id}`;
                    return (
                      <tr key={lead.id} className={`border-b border-border/60 ${selectedLeadId === lead.id ? 'bg-primary/[0.03]' : due ? 'bg-amber-500/[0.035]' : ''}`}>
                        <td className="py-3 pr-4"><button onClick={() => setSelectedLeadId(lead.id)} className="text-left"><div className="font-semibold">{lead.name}</div><div className="text-xs text-muted-foreground">{lead.company || lead.email || 'No company'}</div></button></td>
                        <td className="py-3 pr-4 text-muted-foreground">{lead.source || '—'}</td>
                        <td className="py-3 pr-4"><select className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-semibold capitalize" value={lead.status} onChange={(e) => updateLead(lead.id, { status: e.target.value }, 'Lead status updated.')} disabled={Boolean(activeLeadAction)}>{statusOptions.map((status) => <option key={status} value={status}>{leadStatusLabel(status)}</option>)}</select></td>
                        <td className="py-3 pr-4"><div className="flex flex-wrap items-center gap-2"><time dir="ltr" className={`inline-block whitespace-nowrap tabular-nums ${due ? 'font-bold text-amber-700 dark:text-amber-400' : ''}`} dateTime={lead.next_follow_up_at ?? undefined}>{displayDateTime(lead.next_follow_up_at)}</time>{due && <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-400">Due now</span>}</div></td>
                        <td className="py-3"><div className="flex flex-wrap gap-2"><button disabled={rowBusy} onClick={() => openEmailFollowUp(lead)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50 ${due ? 'border-primary/35 bg-primary/[0.05] text-primary' : 'border-border'}`}>Email follow-up</button><Link href={proposalHref(lead)} className="rounded-lg border border-primary/25 bg-primary/[0.05] px-2.5 py-1.5 text-xs font-bold text-primary">Create proposal</Link>{lead.status !== 'won' && <button disabled={Boolean(activeLeadAction)} onClick={() => updateLead(lead.id, { status: 'won' }, 'Lead marked won.')} className="rounded-lg bg-success/10 px-2.5 py-1.5 text-xs font-bold text-success disabled:opacity-50">{rowBusy ? 'Updating…' : 'Won'}</button>}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-12 text-center">
              <Users size={28} className="mx-auto text-muted-foreground/50" />
              <p className="mt-3 text-sm font-bold text-foreground">No leads yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Add a lead to start tracking follow-ups and generating drafts.</p>
              <button type="button" onClick={() => setShowLeadForm(true)} className="btn-primary mt-4 px-4 py-2 text-xs">Add your first lead</button>
            </div>
          )}
        </section>

        {selectedLead && (
          <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
            <div className={`rounded-2xl border bg-card p-6 ${isFollowUpDue(selectedLead) ? 'border-amber-500/30' : 'border-border'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Next action · {selectedLead.name}</h2>{isFollowUpDue(selectedLead) && <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-400">Follow-up due now</span>}</div>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{selectedLead.notes || 'No notes yet.'}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row"><label className="flex-1"><FieldLabel>Next follow-up</FieldLabel><input type="datetime-local" lang="en" dir="ltr" className="form-input w-full" value={followUpValue} onChange={(e) => setFollowUpValue(e.target.value)} /></label><button disabled={Boolean(activeLeadAction)} onClick={() => updateLead(selectedLead.id, { nextFollowUpAt: followUpValue || null }, 'Follow-up schedule saved.')} className="mt-0 rounded-xl border border-border px-4 text-xs font-bold sm:mt-6 disabled:opacity-50">{activeLeadAction === `lead:${selectedLead.id}` ? 'Saving…' : 'Save'}</button></div>
              <div className="mt-3 flex flex-wrap gap-2"><span className="mr-1 self-center text-xs font-semibold text-muted-foreground">Reschedule:</span>{[{ label: 'Tomorrow', days: 1 }, { label: '+3 days', days: 3 }, { label: '+7 days', days: 7 }].map((preset) => <button key={preset.days} type="button" onClick={() => setFollowUpValue(followUpPreset(preset.days))} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:border-primary/40 hover:text-primary">{preset.label}</button>)}</div>
              <div className="mt-4 flex flex-wrap gap-3"><button disabled={Boolean(activeLeadAction)} onClick={() => updateLead(selectedLead.id, { status: 'contacted' }, 'Lead marked contacted.')} className="inline-flex items-center gap-2 text-xs font-bold text-primary disabled:opacity-50"><MessageSquareText size={14} /> Mark contacted now</button><button type="button" onClick={() => openEmailFollowUp(selectedLead)} className="inline-flex items-center gap-2 text-xs font-bold text-primary"><Mail size={14} /> Open email follow-up</button></div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-bold">Recent drafts for this lead</h2>
              <div className="mt-4 space-y-3">
                {data.messages.filter((message) => message.lead_id === selectedLead.id).slice(0, 6).map((message) => (
                  <div key={message.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase text-primary">{message.channel} · {message.stage}</span><button onClick={() => copyDraft(message.output_text)} className="text-xs font-semibold text-primary">Copy</button></div>
                    <p {...draftLanguageAttributes(message.language)} className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-6 text-muted-foreground">{message.output_text}</p>
                    <time dir="ltr" className="mt-2 block text-[11px] tabular-nums text-muted-foreground" dateTime={message.created_at}>{displayDateTime(message.created_at)}</time>
                  </div>
                ))}
                {!data.messages.some((message) => message.lead_id === selectedLead.id) && (
                  <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                    <Sparkles size={24} className="mx-auto text-muted-foreground/50" />
                    <p className="mt-3 text-sm font-bold text-foreground">No AI drafts yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Select a lead and generate a draft</p>
                    <button type="button" onClick={() => document.getElementById('follow-up-studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="mt-3 text-xs font-bold text-primary hover:underline">Generate a draft →</button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
