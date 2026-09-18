'use client';

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clipboard,
  Download,
  FileText,
  History,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';

type Access = {
  allowed: boolean;
  planName: string | null;
  purchasePath: string;
  limits: { monthlyProposals?: number };
};

type Usage = { used: number; limit: number };

type ProposalOutput = {
  executiveSummary: string;
  scope: string;
  deliverables: string[];
  timeline: string;
  pricing: string;
  assumptions: string[];
  nextStep: string;
  followUpEmail: string;
};

type FormState = {
  clientName: string;
  clientCompany: string;
  project: string;
  deliverables: string;
  timeline: string;
  price: string;
  extraContext: string;
  language: 'English' | 'Arabic';
  tone: 'professional' | 'friendly' | 'concise' | 'consultative';
  template: 'general' | 'freelancer' | 'agency' | 'web-development' | 'marketing' | 'ecommerce';
};

type SavedProposal = {
  id: string;
  source_lead_id: string | null;
  client_name: string;
  client_company: string;
  template: FormState['template'];
  language: FormState['language'];
  tone: FormState['tone'];
  project: string;
  deliverables: string;
  timeline: string;
  price: string;
  extra_context: string;
  output: ProposalOutput;
  status: 'draft' | 'sent' | 'accepted' | 'declined';
  share_enabled: boolean;
  created_at: string;
};

const initialForm: FormState = {
  clientName: '',
  clientCompany: '',
  project: '',
  deliverables: '',
  timeline: '',
  price: '',
  extraContext: '',
  language: 'English',
  tone: 'professional',
  template: 'general',
};

const templateLabels: Record<FormState['template'], string> = {
  general: 'General business',
  freelancer: 'Freelancer',
  agency: 'Agency',
  'web-development': 'Web development',
  marketing: 'Marketing',
  ecommerce: 'Ecommerce',
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character);
}

function numericPrice(value: string) {
  const match = value.replaceAll(',', '').match(/\d+(?:\.\d{1,2})?/);
  return match ? Number(match[0]) : 0;
}

function ResultCard({
  title,
  children,
  copyValue,
}: {
  title: string;
  children: ReactNode;
  copyValue: string;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(copyValue);
      toast.success(title + ' copied.');
    } catch {
      toast.error('Could not copy this section.');
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-foreground">{title}</h3>
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground transition hover:border-primary/35 hover:text-primary"
        >
          <Clipboard size={13} /> Copy
        </button>
      </div>
      <div className="mt-3 text-sm leading-7 text-secondary-foreground">{children}</div>
    </article>
  );
}

export default function ProposalFlowPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [access, setAccess] = useState<Access | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [output, setOutput] = useState<ProposalOutput | null>(null);
  const [savedProposals, setSavedProposals] = useState<SavedProposal[]>([]);
  const [activeProposalId, setActiveProposalId] = useState('');
  const [sourceLeadId, setSourceLeadId] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedLeadId = params.get('leadId') || '';
    const clientName = params.get('clientName') || '';
    const clientCompany = params.get('clientCompany') || '';
    const email = params.get('clientEmail') || '';
    const extraContext = params.get('extraContext') || '';
    if (linkedLeadId || clientName || clientCompany || extraContext) {
      setSourceLeadId(linkedLeadId);
      setClientEmail(email);
      setForm((current) => ({
        ...current,
        clientName: clientName || current.clientName,
        clientCompany: clientCompany || current.clientCompany,
        extraContext: extraContext || current.extraContext,
      }));
    }
  }, []);

  useEffect(() => {
    let alive = true;

    void fetch('/api/proposalflow', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!alive) return;
        if (response.status === 403) {
          setAccess(payload.access ?? {
            allowed: false,
            planName: null,
            purchasePath: '/products/summeca-proposalflow-ai',
            limits: {},
          });
          return;
        }
        if (!response.ok) throw new Error(payload.error || 'Unable to load ProposalFlow AI.');
        setAccess(payload.access);
        setUsage(payload.usage);
        setSavedProposals(payload.proposals ?? []);
      })
      .catch((error) => {
        if (alive) toast.error(error instanceof Error ? error.message : 'Unable to load ProposalFlow AI.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const activeProposal = useMemo(
    () => savedProposals.find((proposal) => proposal.id === activeProposalId) ?? null,
    [activeProposalId, savedProposals],
  );

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function loadSaved(proposal: SavedProposal) {
    setActiveProposalId(proposal.id);
    setSourceLeadId(proposal.source_lead_id ?? '');
    setForm({
      clientName: proposal.client_name,
      clientCompany: proposal.client_company,
      project: proposal.project,
      deliverables: proposal.deliverables,
      timeline: proposal.timeline,
      price: proposal.price,
      extraContext: proposal.extra_context,
      language: proposal.language,
      tone: proposal.tone,
      template: proposal.template,
    });
    setOutput(proposal.output);
    requestAnimationFrame(() => {
      document.getElementById('proposalflow-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (generating) return;
    setGenerating(true);

    try {
      const response = await fetch('/api/proposalflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sourceLeadId: sourceLeadId || null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Proposal generation failed.');
      setOutput(payload.output);
      setUsage(payload.usage);
      if (payload.proposal) {
        setActiveProposalId(payload.proposal.id);
        setSavedProposals((current) => [payload.proposal, ...current.filter((item) => item.id !== payload.proposal.id)]);
      }
      if (payload.warning) toast.warning(payload.warning);
      else toast.success('Proposal generated and saved.');
      requestAnimationFrame(() => {
        document.getElementById('proposalflow-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Proposal generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  async function updateProposalStatus(status: SavedProposal['status']) {
    if (!activeProposalId || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const response = await fetch('/api/proposalflow', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: activeProposalId, status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to update proposal.');
      setSavedProposals((current) => current.map((proposal) => (
        proposal.id === activeProposalId ? { ...proposal, status } : proposal
      )));
      toast.success(`Proposal marked ${status}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update proposal.');
    } finally {
      setUpdatingStatus(false);
    }
  }

  function printProposal() {
    if (!output) return;
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000');
    if (!popup) {
      toast.error('Allow pop-ups to export the proposal.');
      return;
    }

    const list = (items: string[]) => items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Proposal - ${escapeHtml(form.clientName)}</title>
  <style>
    body{font-family:Arial,sans-serif;color:#12222a;margin:0;background:#fff}
    main{max-width:780px;margin:0 auto;padding:52px}
    header{border-bottom:3px solid #0f9f95;padding-bottom:24px;margin-bottom:30px}
    .brand{font-weight:800;letter-spacing:.08em;color:#0f9f95;font-size:13px}
    h1{font-size:30px;margin:8px 0}
    h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:#0f9f95;margin:28px 0 8px}
    p,li{font-size:14px;line-height:1.7}
    .meta{color:#5f6f76;font-size:13px}
    .price{font-size:20px;font-weight:800}
    footer{margin-top:44px;border-top:1px solid #dce4e7;padding-top:16px;color:#6b7780;font-size:11px}
    @media print{main{padding:24px}}
  </style>
</head>
<body>
<main>
  <header>
    <div class="brand">SUMMECA · PROPOSALFLOW AI</div>
    <h1>Proposal for ${escapeHtml(form.clientName)}</h1>
    <div class="meta">${escapeHtml(form.clientCompany || 'Client proposal')} · ${escapeHtml(templateLabels[form.template])}</div>
  </header>
  <h2>Executive summary</h2><p>${escapeHtml(output.executiveSummary)}</p>
  <h2>Scope</h2><p>${escapeHtml(output.scope)}</p>
  <h2>Deliverables</h2><ul>${list(output.deliverables)}</ul>
  <h2>Timeline</h2><p>${escapeHtml(output.timeline)}</p>
  <h2>Pricing</h2><p class="price">${escapeHtml(output.pricing)}</p>
  <h2>Assumptions & clarifications</h2><ul>${list(output.assumptions)}</ul>
  <h2>Next step</h2><p>${escapeHtml(output.nextStep)}</p>
  <footer>Generated with SUMMECA ProposalFlow AI. Review all details before sending.</footer>
</main>
<script>window.addEventListener('load',()=>window.print())</script>
</body>
</html>`;
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  }

  function invoiceHref() {
    const params = new URLSearchParams({
      source: 'proposalflow',
      proposalId: activeProposalId,
      clientName: form.clientName,
      clientCompany: form.clientCompany,
      clientEmail,
      description: form.deliverables || form.project,
      amount: String(numericPrice(form.price)),
      notes: `Proposal: ${form.project}\n\n${output?.nextStep ?? ''}`.trim(),
    });
    return `/user-dashboard/invoiceflow?${params.toString()}`;
  }

  if (loading) {
    return (
      <DashboardLayout activeRoute="proposalflow">
        <div className="space-y-5" aria-busy="true">
          <div className="h-9 w-64 animate-pulse rounded-xl bg-primary/10" />
          <div className="h-[520px] animate-pulse rounded-2xl border border-border bg-card" />
        </div>
      </DashboardLayout>
    );
  }

  if (access && !access.allowed) {
    return (
      <DashboardLayout activeRoute="proposalflow">
        <div className="mx-auto max-w-3xl py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BriefcaseBusiness size={30} />
          </div>
          <h1 className="mt-6 text-3xl font-black text-foreground">Unlock ProposalFlow AI</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
            Turn a client brief into a structured proposal, scope, deliverables, pricing section, next step, and follow-up email.
          </p>
          <Link href={access.purchasePath || '/products/summeca-proposalflow-ai'} className="btn-primary mt-7 inline-flex min-h-11 items-center gap-2 px-6">
            View ProposalFlow AI plans
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeRoute="proposalflow">
      <div className="space-y-7">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              <Sparkles size={15} /> SUMMECA SaaS
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">ProposalFlow AI</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Turn verified client facts into proposals you can save, export, track, and hand off to InvoiceFlow.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {access?.planName && (
              <span className="rounded-full bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
                {access.planName} · {access.planName === 'Free' ? 'Free tier' : 'Lifetime access'}
              </span>
            )}
            {usage && (
              <span className="rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground">
                Proposals: {usage.used}/{usage.limit} this month
              </span>
            )}
            {access?.planName === 'Free' && (
              <Link href={access.purchasePath} className="rounded-full border border-primary/30 bg-card px-3 py-2 text-xs font-bold text-primary">
                Upgrade
              </Link>
            )}
          </div>
        </header>

        {savedProposals.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <History size={18} className="text-primary" />
              <h2 className="font-black text-foreground">Saved proposals</h2>
            </div>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {savedProposals.slice(0, 8).map((proposal) => (
                <button
                  key={proposal.id}
                  type="button"
                  onClick={() => loadSaved(proposal)}
                  className="min-w-56 rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary/35"
                >
                  <div className="truncate text-sm font-bold text-foreground">{proposal.client_name}</div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">{proposal.client_company || templateLabels[proposal.template]}</div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                    <span className="capitalize text-primary">{proposal.status}</span>
                    <span className="text-muted-foreground">{new Date(proposal.created_at).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <form onSubmit={generate} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <h2 className="text-lg font-black text-foreground">Client brief</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              ProposalFlow uses only the facts you enter. Review the result before sending it to a client.
            </p>

            {sourceLeadId && (
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
                Linked to a LeadFollow lead. Generating this proposal will move that lead to “Proposal sent”.
              </div>
            )}

            <label className="mt-5 block text-xs font-semibold text-foreground">
              Proposal template
              <select
                value={form.template}
                onChange={(event) => patch('template', event.target.value as FormState['template'])}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {Object.entries(templateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-foreground">
                Client name *
                <input value={form.clientName} onChange={(event) => patch('clientName', event.target.value)} required maxLength={160} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="Alex Morgan" />
              </label>
              <label className="text-xs font-semibold text-foreground">
                Company
                <input value={form.clientCompany} onChange={(event) => patch('clientCompany', event.target.value)} maxLength={160} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="Example Studio" />
              </label>
            </div>

            <label className="mt-4 block text-xs font-semibold text-foreground">
              What does the client need? *
              <textarea value={form.project} onChange={(event) => patch('project', event.target.value)} required maxLength={1200} rows={5} className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none focus:border-primary" placeholder="Describe the problem, requested outcome, and any confirmed requirements." />
            </label>

            <label className="mt-4 block text-xs font-semibold text-foreground">
              Deliverables you will provide *
              <textarea value={form.deliverables} onChange={(event) => patch('deliverables', event.target.value)} required maxLength={1800} rows={4} className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none focus:border-primary" placeholder="Landing page redesign, responsive build, analytics setup..." />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-foreground">
                Timeline
                <input value={form.timeline} onChange={(event) => patch('timeline', event.target.value)} maxLength={300} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="2 weeks after approval" />
              </label>
              <label className="text-xs font-semibold text-foreground">
                Price / pricing structure *
                <input value={form.price} onChange={(event) => patch('price', event.target.value)} required maxLength={240} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" placeholder="$1,500 fixed project fee" />
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-foreground">
                Language
                <select value={form.language} onChange={(event) => patch('language', event.target.value as FormState['language'])} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
                  <option>English</option><option>Arabic</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-foreground">
                Tone
                <select value={form.tone} onChange={(event) => patch('tone', event.target.value as FormState['tone'])} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary">
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="concise">Concise</option>
                  <option value="consultative">Consultative</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block text-xs font-semibold text-foreground">
              Extra confirmed context
              <textarea value={form.extraContext} onChange={(event) => patch('extraContext', event.target.value)} maxLength={1800} rows={3} className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none focus:border-primary" placeholder="Optional constraints, exclusions, decision criteria, or facts the client already confirmed." />
            </label>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={generating} className="btn-primary inline-flex min-h-11 flex-1 items-center justify-center gap-2 px-5 disabled:cursor-not-allowed disabled:opacity-60">
                {generating ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {generating ? 'Generating proposal…' : 'Generate & save proposal'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setOutput(null);
                  setActiveProposalId('');
                  setSourceLeadId('');
                  setClientEmail('');
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-bold text-foreground transition hover:border-primary/35 hover:text-primary"
              >
                New
              </button>
            </div>
          </form>

          <section id="proposalflow-results" className="scroll-mt-24 space-y-4">
            {!output ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/20 p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BriefcaseBusiness size={26} /></div>
                <h2 className="mt-5 text-xl font-black text-foreground">Your proposal package appears here</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Generate a proposal, save it to your account, export a clean PDF, then continue directly to InvoiceFlow.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CheckCircle2 size={17} className="text-primary" />
                      {activeProposal ? `Saved · ${activeProposal.status}` : 'Draft generated. Review every section before sending.'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={printProposal} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-bold text-foreground">
                        <Download size={14} /> Export PDF
                      </button>
                      <Link href={invoiceHref()} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground">
                        Create invoice <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                  {activeProposalId && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(['draft', 'sent', 'accepted', 'declined'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          disabled={updatingStatus || activeProposal?.status === status}
                          onClick={() => void updateProposalStatus(status)}
                          className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold capitalize text-muted-foreground disabled:opacity-50"
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <ResultCard title="Executive summary" copyValue={output.executiveSummary}><p className="whitespace-pre-wrap">{output.executiveSummary}</p></ResultCard>
                <ResultCard title="Scope" copyValue={output.scope}><p className="whitespace-pre-wrap">{output.scope}</p></ResultCard>
                <ResultCard title="Deliverables" copyValue={output.deliverables.join('\n')}>
                  <ul className="space-y-2">{output.deliverables.map((item, index) => <li key={String(index) + '-' + item} className="flex gap-2"><CheckCircle2 size={15} className="mt-1 shrink-0 text-primary" /><span>{item}</span></li>)}</ul>
                </ResultCard>
                <ResultCard title="Timeline" copyValue={output.timeline}><p className="whitespace-pre-wrap">{output.timeline}</p></ResultCard>
                <ResultCard title="Pricing" copyValue={output.pricing}><p className="whitespace-pre-wrap">{output.pricing}</p></ResultCard>
                <ResultCard title="Assumptions & clarifications" copyValue={output.assumptions.join('\n')}>
                  <ul className="space-y-2">{output.assumptions.map((item, index) => <li key={String(index) + '-' + item} className="flex gap-2"><span className="mt-1 font-black text-primary">•</span><span>{item}</span></li>)}</ul>
                </ResultCard>
                <ResultCard title="Next step" copyValue={output.nextStep}><p className="whitespace-pre-wrap">{output.nextStep}</p></ResultCard>
                <ResultCard title="Follow-up email" copyValue={output.followUpEmail}><p className="whitespace-pre-wrap">{output.followUpEmail}</p></ResultCard>
              </>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
