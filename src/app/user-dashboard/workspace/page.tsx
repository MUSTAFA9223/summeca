'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, ReceiptText, Sparkles, Users, Workflow } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';

type AppAccess = {
  allowed: boolean;
  planName: string | null;
  purchasePath: string;
};

type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  source: string;
  status: string;
  notes: string;
  next_follow_up_at: string | null;
};

type WorkspaceData = {
  access: {
    leadfollow: AppAccess;
    proposalflow: AppAccess;
    invoiceflow: AppAccess;
  };
  counts: { leads: number; proposals: number; invoices: number };
  leads: Lead[];
};

function planLabel(access: AppAccess) {
  if (!access.allowed) return 'Locked';
  return access.planName === 'Free' ? 'Free tier' : `${access.planName ?? 'Active'} plan`;
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

export default function BusinessWorkspacePage() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState('');

  useEffect(() => {
    let alive = true;
    void fetch('/api/business-workspace', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Unable to load workspace.');
        if (!alive) return;
        setData(payload);
        setSelectedLeadId(payload.leads?.[0]?.id ?? '');
      })
      .catch((error) => {
        if (alive) toast.error(error instanceof Error ? error.message : 'Unable to load workspace.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const selectedLead = useMemo(
    () => data?.leads.find((lead) => lead.id === selectedLeadId) ?? null,
    [data?.leads, selectedLeadId],
  );

  if (loading) {
    return (
      <DashboardLayout activeRoute="workspace">
        <div className="space-y-6" aria-busy="true">
          <div className="h-10 w-72 animate-pulse rounded-xl bg-primary/10" />
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-44 animate-pulse rounded-2xl border border-border bg-card" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeRoute="workspace">
      <div className="space-y-7">
        <header>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            <Workflow size={15} /> SUMMECA Business Workspace
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Lead → Proposal → Invoice</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Move client information through the three SUMMECA apps without retyping the same details.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <Users className="text-primary" size={22} />
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{planLabel(data!.access.leadfollow)}</span>
            </div>
            <h2 className="mt-4 text-lg font-black">1. LeadFollow AI</h2>
            <p className="mt-1 text-sm text-muted-foreground">{data!.counts.leads} leads in your pipeline.</p>
            <Link href="/user-dashboard/leadfollow" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
              Manage leads <ArrowRight size={15} />
            </Link>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <Sparkles className="text-primary" size={22} />
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{planLabel(data!.access.proposalflow)}</span>
            </div>
            <h2 className="mt-4 text-lg font-black">2. ProposalFlow AI</h2>
            <p className="mt-1 text-sm text-muted-foreground">{data!.counts.proposals} saved proposals.</p>
            <Link href="/user-dashboard/proposalflow" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
              Create proposal <ArrowRight size={15} />
            </Link>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <ReceiptText className="text-primary" size={22} />
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{planLabel(data!.access.invoiceflow)}</span>
            </div>
            <h2 className="mt-4 text-lg font-black">3. InvoiceFlow</h2>
            <p className="mt-1 text-sm text-muted-foreground">{data!.counts.invoices} invoices created.</p>
            <Link href="/user-dashboard/invoiceflow" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
              Manage invoices <ArrowRight size={15} />
            </Link>
          </article>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2">
            <FileText className="text-primary" size={19} />
            <h2 className="text-lg font-black">Start from an existing lead</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Select a lead and SUMMECA will carry the confirmed client details into ProposalFlow.
          </p>

          {data!.leads.length ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <label className="text-xs font-semibold text-foreground">
                Lead
                <select
                  value={selectedLeadId}
                  onChange={(event) => setSelectedLeadId(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  {data!.leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name}{lead.company ? ` — ${lead.company}` : ''} · {lead.status.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
              {selectedLead && (
                <Link href={proposalHref(selectedLead)} className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-5">
                  Build proposal <ArrowRight size={16} />
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
              Add your first lead in LeadFollow AI, then return here to move it into ProposalFlow.
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
