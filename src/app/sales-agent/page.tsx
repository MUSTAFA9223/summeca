import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileText,
  Mail,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'SUMMECA Sales Agent — AI-Assisted Sales Workflow',
  description:
    'Turn website interest into organized follow-up and proposals with SUMMECA SiteAgent AI, LeadFollow AI, and ProposalFlow AI.',
  alternates: {
    canonical: 'https://summeca.com/sales-agent',
  },
  openGraph: {
    type: 'website',
    url: 'https://summeca.com/sales-agent',
    siteName: 'SUMMECA',
    title: 'SUMMECA Sales Agent — AI-Assisted Sales Workflow',
    description:
      'Capture interest, organize leads, draft follow-ups, and prepare proposals with a connected SUMMECA sales workflow.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SUMMECA Sales Agent — AI-Assisted Sales Workflow',
    description:
      'Capture interest, organize leads, draft follow-ups, and prepare proposals with a connected SUMMECA sales workflow.',
  },
};

const workflow = [
  {
    title: 'Capture interest',
    description:
      'Use SiteAgent AI on your website to answer visitors and turn useful conversations into sales opportunities.',
    icon: MousePointerClick,
  },
  {
    title: 'Organize leads',
    description:
      'Keep lead details, status, follow-up timing, notes, and pipeline progress together inside LeadFollow AI.',
    icon: Users,
  },
  {
    title: 'Draft follow-ups',
    description:
      'Generate context-aware follow-up drafts, review them, and send approved email through supported mailbox connections.',
    icon: Mail,
  },
  {
    title: 'Prepare proposals',
    description:
      'Move qualified leads into ProposalFlow AI with client context already carried into the proposal workflow.',
    icon: FileText,
  },
];

const guardrails = [
  'Human review stays in control before outbound email is sent.',
  'Existing SUMMECA product access, checkout, and account permissions stay unchanged.',
  'LeadFollow AI and ProposalFlow AI remain available through their current product URLs.',
];

export default function SalesAgentPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="pt-[70px]">
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.14),transparent_32%),radial-gradient(circle_at_80%_10%,hsl(var(--accent)/0.10),transparent_30%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-800 uppercase tracking-[0.16em] text-primary">
                <Sparkles size={14} />
                SUMMECA Sales Agent
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-900 tracking-tight sm:text-5xl lg:text-6xl">
                Turn leads into a repeatable sales workflow.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                SUMMECA Sales Agent brings SiteAgent AI, LeadFollow AI, and ProposalFlow AI into one practical flow:
                capture interest, organize leads, draft follow-ups, and prepare proposals without replacing the tools
                you already use.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/products/summeca-leadfollow-ai"
                  className="btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-3 text-sm font-800"
                >
                  Start with LeadFollow AI <ArrowRight size={15} />
                </Link>
                <Link
                  href="/products/summeca-proposalflow-ai"
                  className="btn-secondary inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-3 text-sm font-800"
                >
                  Explore ProposalFlow AI
                </Link>
              </div>

              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Phase 1 is AI-assisted and human-approved. Existing product URLs, pricing, checkout, and entitlements
                remain intact.
              </p>
            </div>

            <div className="rounded-[28px] border border-primary/15 bg-card/90 p-5 shadow-2xl shadow-primary/5 backdrop-blur sm:p-7">
              <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                  <p className="text-xs font-800 uppercase tracking-[0.16em] text-primary">Live workflow</p>
                  <h2 className="mt-1 text-xl font-900">Sales workspace</h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Bot size={24} />
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {workflow.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="flex gap-4 rounded-2xl border border-border bg-background/70 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-800 uppercase tracking-[0.15em] text-muted-foreground">
                            Step {index + 1}
                          </span>
                          <CheckCircle2 size={13} className="text-primary" />
                        </div>
                        <h3 className="mt-1 font-800">{step.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
          <div className="grid gap-6 lg:grid-cols-3">
            <article className="rounded-3xl border border-border bg-card p-6">
              <p className="text-xs font-800 uppercase tracking-[0.16em] text-primary">Capture</p>
              <h2 className="mt-3 text-2xl font-900">SiteAgent AI</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Keep the website agent as the front door for visitor questions and qualified interest.
              </p>
              <Link
                href="/products/summeca-siteagent-ai"
                className="mt-6 inline-flex items-center gap-2 text-sm font-800 text-primary hover:underline"
              >
                View SiteAgent AI <ArrowRight size={14} />
              </Link>
            </article>

            <article className="rounded-3xl border border-primary/25 bg-card p-6 shadow-lg shadow-primary/5">
              <p className="text-xs font-800 uppercase tracking-[0.16em] text-primary">Follow-up</p>
              <h2 className="mt-3 text-2xl font-900">LeadFollow AI</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                This remains the core sales workspace for leads, pipeline status, follow-up timing, AI drafts, and
                approved email delivery.
              </p>
              <Link
                href="/products/summeca-leadfollow-ai"
                className="mt-6 inline-flex items-center gap-2 text-sm font-800 text-primary hover:underline"
              >
                View LeadFollow AI <ArrowRight size={14} />
              </Link>
            </article>

            <article className="rounded-3xl border border-border bg-card p-6">
              <p className="text-xs font-800 uppercase tracking-[0.16em] text-primary">Close</p>
              <h2 className="mt-3 text-2xl font-900">ProposalFlow AI</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Qualified leads can move directly into a proposal workflow with client context carried forward.
              </p>
              <Link
                href="/products/summeca-proposalflow-ai"
                className="mt-6 inline-flex items-center gap-2 text-sm font-800 text-primary hover:underline"
              >
                View ProposalFlow AI <ArrowRight size={14} />
              </Link>
            </article>
          </div>
        </section>

        <section className="border-y border-border bg-card/40">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ShieldCheck size={24} />
              </div>
              <h2 className="mt-5 text-3xl font-900 tracking-tight">Built as an upgrade, not a reset.</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                The first Sales Agent phase reuses SUMMECA's current production capabilities instead of introducing
                a second payment system, a new database project, or duplicate product logic.
              </p>
            </div>
            <div className="space-y-3">
              {guardrails.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-border bg-background p-4">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
                  <p className="text-sm leading-6 text-secondary-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16 text-center sm:py-20">
          <p className="text-xs font-800 uppercase tracking-[0.16em] text-primary">Start with the existing core</p>
          <h2 className="mt-3 text-3xl font-900 tracking-tight sm:text-4xl">
            Build the sales workflow around LeadFollow AI first.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            This keeps the rollout real and measurable while the deeper agent automation is added in later phases.
          </p>
          <Link
            href="/products/summeca-leadfollow-ai"
            className="btn-primary mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl px-6 py-3 text-sm font-800"
          >
            Explore LeadFollow AI <ArrowRight size={15} />
          </Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
