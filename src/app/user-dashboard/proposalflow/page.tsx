'use client';

import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  BriefcaseBusiness,
  CheckCircle2,
  Clipboard,
  FileText,
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
};

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
  const [access, setAccess] = useState<Access | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [output, setOutput] = useState<ProposalOutput | null>(null);

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

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (generating) return;
    setGenerating(true);

    try {
      const response = await fetch('/api/proposalflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Proposal generation failed.');
      setOutput(payload.output);
      setUsage(payload.usage);
      toast.success('Proposal package generated.');
      requestAnimationFrame(() => {
        document.getElementById('proposalflow-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Proposal generation failed.');
    } finally {
      setGenerating(false);
    }
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
          <Link
            href={access.purchasePath || '/products/summeca-proposalflow-ai'}
            className="btn-primary mt-7 inline-flex min-h-11 items-center gap-2 px-6"
          >
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
              Turn verified client facts into a proposal package you can review, edit, and send.
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
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <form onSubmit={generate} className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <h2 className="text-lg font-black text-foreground">Client brief</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              ProposalFlow uses only the facts you enter. Review the result before sending it to a client.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-foreground">
                Client name *
                <input
                  value={form.clientName}
                  onChange={(event) => patch('clientName', event.target.value)}
                  required
                  maxLength={160}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="Alex Morgan"
                />
              </label>
              <label className="text-xs font-semibold text-foreground">
                Company
                <input
                  value={form.clientCompany}
                  onChange={(event) => patch('clientCompany', event.target.value)}
                  maxLength={160}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="Example Studio"
                />
              </label>
            </div>

            <label className="mt-4 block text-xs font-semibold text-foreground">
              What does the client need? *
              <textarea
                value={form.project}
                onChange={(event) => patch('project', event.target.value)}
                required
                maxLength={1200}
                rows={5}
                className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none focus:border-primary"
                placeholder="Describe the problem, requested outcome, and any confirmed requirements."
              />
            </label>

            <label className="mt-4 block text-xs font-semibold text-foreground">
              Deliverables you will provide *
              <textarea
                value={form.deliverables}
                onChange={(event) => patch('deliverables', event.target.value)}
                required
                maxLength={1800}
                rows={4}
                className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none focus:border-primary"
                placeholder="Landing page redesign, responsive build, analytics setup..."
              />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-foreground">
                Timeline
                <input
                  value={form.timeline}
                  onChange={(event) => patch('timeline', event.target.value)}
                  maxLength={300}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="2 weeks after approval"
                />
              </label>
              <label className="text-xs font-semibold text-foreground">
                Price / pricing structure *
                <input
                  value={form.price}
                  onChange={(event) => patch('price', event.target.value)}
                  required
                  maxLength={240}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="$1,500 fixed project fee"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-foreground">
                Language
                <select
                  value={form.language}
                  onChange={(event) => patch('language', event.target.value as FormState['language'])}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option>English</option>
                  <option>Arabic</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-foreground">
                Tone
                <select
                  value={form.tone}
                  onChange={(event) => patch('tone', event.target.value as FormState['tone'])}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="concise">Concise</option>
                  <option value="consultative">Consultative</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block text-xs font-semibold text-foreground">
              Extra confirmed context
              <textarea
                value={form.extraContext}
                onChange={(event) => patch('extraContext', event.target.value)}
                maxLength={1800}
                rows={3}
                className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none focus:border-primary"
                placeholder="Optional constraints, exclusions, decision criteria, or facts the client already confirmed."
              />
            </label>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={generating}
                className="btn-primary inline-flex min-h-11 flex-1 items-center justify-center gap-2 px-5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {generating ? 'Generating proposal…' : 'Generate proposal package'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setOutput(null);
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-bold text-foreground transition hover:border-primary/35 hover:text-primary"
              >
                Clear
              </button>
            </div>
          </form>

          <section id="proposalflow-results" className="scroll-mt-24 space-y-4">
            {!output ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/20 p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <BriefcaseBusiness size={26} />
                </div>
                <h2 className="mt-5 text-xl font-black text-foreground">Your proposal package appears here</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  One generation creates the client-facing summary, scope, deliverables, timeline, pricing wording, assumptions, next step, and follow-up email.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-foreground">
                  <CheckCircle2 size={17} className="text-primary" />
                  Draft generated. Review every section before sending.
                </div>

                <ResultCard title="Executive summary" copyValue={output.executiveSummary}>
                  <p className="whitespace-pre-wrap">{output.executiveSummary}</p>
                </ResultCard>

                <ResultCard title="Scope" copyValue={output.scope}>
                  <p className="whitespace-pre-wrap">{output.scope}</p>
                </ResultCard>

                <ResultCard title="Deliverables" copyValue={output.deliverables.join('\n')}>
                  <ul className="space-y-2">
                    {output.deliverables.map((item, index) => (
                      <li key={String(index) + '-' + item} className="flex gap-2">
                        <CheckCircle2 size={15} className="mt-1 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </ResultCard>

                <ResultCard title="Timeline" copyValue={output.timeline}>
                  <p className="whitespace-pre-wrap">{output.timeline}</p>
                </ResultCard>

                <ResultCard title="Pricing" copyValue={output.pricing}>
                  <p className="whitespace-pre-wrap">{output.pricing}</p>
                </ResultCard>

                <ResultCard title="Assumptions & clarifications" copyValue={output.assumptions.join('\n')}>
                  <ul className="space-y-2">
                    {output.assumptions.map((item, index) => (
                      <li key={String(index) + '-' + item} className="flex gap-2">
                        <span className="mt-1 font-black text-primary">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </ResultCard>

                <ResultCard title="Next step" copyValue={output.nextStep}>
                  <p className="whitespace-pre-wrap">{output.nextStep}</p>
                </ResultCard>

                <ResultCard title="Follow-up email" copyValue={output.followUpEmail}>
                  <p className="whitespace-pre-wrap">{output.followUpEmail}</p>
                </ResultCard>
              </>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
