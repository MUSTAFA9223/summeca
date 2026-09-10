'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  UsersRound,
} from 'lucide-react';
import PublicFooter from '@/components/PublicFooter';
import PublicNav from '@/components/PublicNav';
import WishlistButton from '@/components/WishlistButton';
import { getEffectivePrice } from '@/lib/pricing';

export type BillingPeriod = 'one_time' | 'monthly' | 'yearly' | 'lifetime';

export interface SaasSalesPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_period: BillingPeriod;
  features: string[] | null;
  is_active: boolean;
  sort_order: number;
  sale_price: number | null;
  sale_discount_type: 'percentage' | 'fixed_amount' | null;
  sale_discount_value: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
}

export interface SaasSalesProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_desc: string | null;
  category: string;
  thumbnail_url: string | null;
  tags: string[] | null;
}

type SalesSlug = 'summeca-invoiceflow' | 'summeca-leadfollow-ai';

type ProductStory = {
  eyebrow: string;
  headline: string;
  supportingCopy: string;
  finalHeadline: string;
  primaryCta: string;
  previewLabel: string;
  steps: Array<{ title: string; text: string }>;
  audiences: Array<{ title: string; text: string; icon: LucideIcon }>;
  features: Array<{ title: string; text: string; icon: LucideIcon }>;
};

const STORIES: Record<SalesSlug, ProductStory> = {
  'summeca-invoiceflow': {
    eyebrow: 'Invoice workspace',
    headline: 'Create professional invoices in minutes, not spreadsheets.',
    supportingCopy:
      'Manage clients, create invoices, track billing and keep your invoice workflow organized from one workspace.',
    finalHeadline: 'Start building better invoices with SUMMECA InvoiceFlow.',
    primaryCta: 'Choose an InvoiceFlow plan',
    previewLabel: 'InvoiceFlow sample workspace',
    steps: [
      {
        title: 'Add your client',
        text: 'Keep the client details you need for billing in one place.',
      },
      {
        title: 'Create the invoice',
        text: 'Add line items, dates, tax, notes and terms in a focused builder.',
      },
      {
        title: 'Manage and send your workflow',
        text: 'Update status, enable a share link, print or save the invoice as PDF.',
      },
    ],
    audiences: [
      {
        title: 'Freelancers',
        text: 'Create and track invoices without maintaining a spreadsheet.',
        icon: UserRound,
      },
      {
        title: 'Consultants',
        text: 'Keep client billing details and invoice status organized.',
        icon: BriefcaseBusiness,
      },
      {
        title: 'Agencies',
        text: 'Handle higher client and invoice volumes with plan-based limits.',
        icon: UsersRound,
      },
      {
        title: 'Small businesses',
        text: 'Use one workspace for clients, invoices and billing summaries.',
        icon: Building2,
      },
    ],
    features: [
      {
        title: 'Client records',
        text: 'Store client contact and billing details in your private account workspace.',
        icon: UsersRound,
      },
      {
        title: 'Invoice builder',
        text: 'Create itemized invoices with dates, tax, notes, terms and automatic totals.',
        icon: ReceiptText,
      },
      {
        title: 'Status tracking',
        text: 'Move invoices through draft, sent, paid or cancelled states.',
        icon: FileCheck2,
      },
      {
        title: 'Billing overview',
        text: 'See paid, outstanding and overdue summaries from your invoice data.',
        icon: LayoutDashboard,
      },
      {
        title: 'Share and PDF workflow',
        text: 'Enable a protected invoice link, then print or save the invoice as PDF.',
        icon: FileText,
      },
      {
        title: 'Exports and reminders',
        text: 'Eligible plans include CSV export and ready-to-send payment reminder text.',
        icon: CircleDollarSign,
      },
    ],
  },
  'summeca-leadfollow-ai': {
    eyebrow: 'Lead follow-up workspace',
    headline: 'Turn new leads into better follow-ups, faster.',
    supportingCopy:
      'Organize leads, prepare follow-up messages and keep sales conversations moving from one workspace.',
    finalHeadline: 'Organize your leads and move every follow-up forward.',
    primaryCta: 'Choose a LeadFollow AI plan',
    previewLabel: 'LeadFollow AI sample workspace',
    steps: [
      {
        title: 'Add a lead',
        text: 'Record the contact details, source and factual notes you already know.',
      },
      {
        title: 'Organize the opportunity',
        text: 'Set its pipeline status and schedule the next follow-up.',
      },
      {
        title: 'Prepare the next follow-up',
        text: 'Generate a grounded draft, review it, edit it and send it through your own channel.',
      },
    ],
    audiences: [
      {
        title: 'Freelancers',
        text: 'Keep prospects and next actions visible in one workflow.',
        icon: UserRound,
      },
      {
        title: 'Agencies',
        text: 'Organize larger lead lists with plan-based limits.',
        icon: UsersRound,
      },
      {
        title: 'Service businesses',
        text: 'Prepare consistent follow-ups using your real offer and context.',
        icon: BriefcaseBusiness,
      },
      {
        title: 'Small sales teams',
        text: 'Track pipeline status, due follow-ups and saved draft history.',
        icon: Building2,
      },
    ],
    features: [
      {
        title: 'Lead pipeline',
        text: 'Track new, contacted, replied, won and lost opportunities.',
        icon: Target,
      },
      {
        title: 'Follow-up scheduling',
        text: 'Save the next follow-up time and see which opportunities are due.',
        icon: Clock3,
      },
      {
        title: 'AI-assisted drafts',
        text: 'Prepare editable messages grounded in the business and lead context you provide.',
        icon: Sparkles,
      },
      {
        title: 'Channel controls',
        text: 'Create drafts for email, LinkedIn, WhatsApp, SMS or a generic channel.',
        icon: MessageSquareText,
      },
      {
        title: 'Tone and language controls',
        text: 'Choose the stage, tone and supported output language for each draft.',
        icon: Bot,
      },
      {
        title: 'Message history',
        text: 'Keep generated drafts attached to the relevant lead for later review and copying.',
        icon: FileText,
      },
    ],
  },
};

export function isSaasSalesSlug(slug: string): slug is SalesSlug {
  return slug === 'summeca-invoiceflow' || slug === 'summeca-leadfollow-ai';
}

function priceFor(plan: SaasSalesPlan) {
  try {
    return getEffectivePrice(plan);
  } catch {
    const regularPrice = Number(plan.price) || 0;
    return { regularPrice, finalPrice: regularPrice, discountPercent: 0, onSale: false };
  }
}

function lowestPlan(plans: SaasSalesPlan[]) {
  return plans.reduce<SaasSalesPlan | null>((lowest, plan) => {
    if (!plan.is_active) return lowest;
    if (!lowest) return plan;
    return priceFor(plan).finalPrice < priceFor(lowest).finalPrice ? plan : lowest;
  }, null);
}

function money(value: number, currency: string) {
  if (value === 0) return 'Free';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency || 'USD'} ${value % 1 === 0 ? value : value.toFixed(2)}`;
  }
}

function accessPeriod(period: BillingPeriod) {
  if (period === 'monthly') return 'Monthly access period';
  if (period === 'yearly') return 'Yearly access period';
  if (period === 'lifetime') return 'Lifetime access';
  return 'One-time access';
}

function InvoicePreview() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-border/80 bg-card shadow-2xl shadow-primary/10">
      <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="text-xs font-bold text-foreground">InvoiceFlow</span>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
          SAMPLE DATA
        </span>
      </div>
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[11px] text-muted-foreground">Outstanding</p>
              <p className="mt-1 text-lg font-black text-foreground">$1,240</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[11px] text-muted-foreground">Paid</p>
              <p className="mt-1 text-lg font-black text-primary">$3,860</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">Clients</p>
              <span className="text-[11px] text-muted-foreground">2 sample</span>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-secondary/40 p-2">
                <span>Sample Client</span>
                <span className="text-muted-foreground">2 invoices</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-secondary/40 p-2">
                <span>Demo Project</span>
                <span className="text-muted-foreground">1 invoice</span>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Sample invoice
              </p>
              <p className="mt-1 text-lg font-black">INV-DEMO-024</p>
            </div>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700">
              Sent
            </span>
          </div>
          <div className="mt-5 grid grid-cols-[1fr_auto_auto] gap-3 border-b border-border pb-2 text-[11px] font-bold uppercase text-muted-foreground">
            <span>Item</span>
            <span>Qty</span>
            <span>Total</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 py-3 text-xs">
            <span>Website workflow setup</span>
            <span>1</span>
            <span>$1,200</span>
          </div>
          <div className="mt-3 ml-auto w-44 space-y-2 border-t border-border pt-3 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span>$40</span>
            </div>
            <div className="flex justify-between font-black">
              <span>Total</span>
              <span>$1,240</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadPreview() {
  return (
    <div className="overflow-hidden rounded-[24px] border border-border/80 bg-card shadow-2xl shadow-primary/10">
      <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-primary" />
          <span className="text-xs font-bold text-foreground">LeadFollow AI</span>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
          SAMPLE DATA
        </span>
      </div>
      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold">Lead pipeline</p>
            <span className="text-[11px] text-muted-foreground">2 sample leads</span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold">Sample Lead</p>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                  REPLIED
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Demo Studio · Referral</p>
              <p className="mt-3 text-[11px] font-semibold">Next follow-up: Tomorrow, 10:00</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold">Demo Inquiry</p>
                <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold">
                  NEW
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Website form</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.05] to-background p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-primary" />
              <p className="text-xs font-bold">AI follow-up studio</p>
            </div>
            <span className="text-[11px] text-muted-foreground">Email · Professional</span>
          </div>
          <div className="mt-4 rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              AI draft example — review before sending
            </p>
            <p className="mt-3 text-xs leading-6 text-secondary-foreground">
              Hi Sample Lead, I’m following up on the website automation notes we discussed. Would
              Tuesday or Wednesday work for a short next-step call?
            </p>
          </div>
          <div className="mt-3 flex justify-end">
            <span className="rounded-lg border border-border bg-background px-3 py-2 text-[11px] font-bold text-primary">
              Copy draft
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SaasProductSalesExperience({
  product,
  plans,
}: {
  product: SaasSalesProduct;
  plans: SaasSalesPlan[];
}) {
  if (!isSaasSalesSlug(product.slug)) return null;
  const story = STORIES[product.slug];
  const activePlans = plans
    .filter((plan) => plan.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const startingPlan = lowestPlan(activePlans);
  const startingPrice = startingPlan ? priceFor(startingPlan) : null;
  const primaryHref = startingPlan
    ? `/checkout?product_id=${encodeURIComponent(product.id)}&plan_id=${encodeURIComponent(startingPlan.id)}`
    : '#plans';
  const isInvoice = product.slug === 'summeca-invoiceflow';

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="overflow-hidden pt-[68px]">
        <section className="relative border-b border-border bg-gradient-to-b from-primary/[0.08] via-background to-background">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-80 w-[44rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
          />
          <div className="relative mx-auto grid max-w-screen-xl items-center gap-12 px-6 py-14 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-20">
            <div>
              <Link
                href="/saas"
                className="text-xs font-bold uppercase tracking-[0.18em] text-primary hover:underline"
              >
                SUMMECA SaaS
              </Link>
              <p className="mt-5 text-sm font-bold text-foreground">{product.name}</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.08] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-6xl">
                {story.headline}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                {story.supportingCopy}
              </p>
              <div className="mt-6 flex flex-wrap items-end gap-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Current starting price
                  </p>
                  {startingPlan && startingPrice ? (
                    <p className="mt-1 text-3xl font-black text-foreground">
                      {money(startingPrice.finalPrice, startingPlan.currency)}{' '}
                      <span className="text-sm font-semibold text-muted-foreground">
                        {startingPlan.currency || 'USD'} ·{' '}
                        {accessPeriod(startingPlan.billing_period)}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      No active plan is currently available.
                    </p>
                  )}
                </div>
                <WishlistButton productId={product.id} productName={product.name} size="sm" />
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={primaryHref}
                  className="btn-primary inline-flex min-h-12 items-center justify-center gap-2 px-6 text-sm"
                >
                  {story.primaryCta} <ArrowRight size={15} />
                </Link>
                <Link
                  href="#product-preview"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-bold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  See the product preview
                </Link>
              </div>
              <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-primary" />
                After verified payment, access is unlocked in your SUMMECA account.
              </p>
            </div>
            <div
              id="product-preview"
              aria-label={story.previewLabel}
              className="scroll-mt-24 transition-transform duration-500 motion-reduce:transition-none lg:hover:-translate-y-1"
            >
              {isInvoice ? <InvoicePreview /> : <LeadPreview />}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-screen-xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              How it works
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">
              From setup to the next action in three steps
            </h2>
          </div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {story.steps.map((step, index) => (
              <article key={step.title} className="rounded-2xl border border-border bg-card p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-black text-white">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-secondary/20">
          <div className="mx-auto max-w-screen-xl px-6 py-14 lg:px-8 lg:py-18">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Who it is for
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">
                A focused workspace for hands-on operators
              </h2>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {story.audiences.map(({ title, text, icon: Icon }) => (
                <article key={title} className="rounded-2xl border border-border bg-card p-5">
                  <Icon size={20} className="text-primary" />
                  <h3 className="mt-4 font-bold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-screen-xl px-6 py-14 lg:px-8 lg:py-18">
          <div className="grid gap-9 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Real product capabilities
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">
                What you can do in {product.name}
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                These capabilities reflect the current SUMMECA workspace. Limits and availability
                vary by the active plan shown below.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {story.features.map(({ title, text, icon: Icon }) => (
                <article key={title} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={19} />
                  </div>
                  <h3 className="mt-4 font-bold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="plans"
          className="scroll-mt-20 border-y border-border bg-gradient-to-b from-primary/[0.045] to-background"
        >
          <div className="mx-auto max-w-screen-xl px-6 py-14 lg:px-8 lg:py-18">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Plans and limits
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-foreground">
                Choose the access level that fits your workflow
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Prices, currencies, access periods and included limits below come from the active
                plans used by SUMMECA checkout.
              </p>
            </div>
            {activePlans.length === 0 ? (
              <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-border bg-card p-8 text-center">
                <p className="font-bold text-foreground">No active plan is available right now.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Checkout remains unavailable until a production plan is published.
                </p>
              </div>
            ) : (
              <div className="mt-9 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {activePlans.map((plan, index) => {
                  const price = priceFor(plan);
                  return (
                    <article
                      key={plan.id}
                      className={`flex h-full flex-col rounded-2xl border bg-card p-6 shadow-sm ${index === 1 ? 'border-primary/40 shadow-primary/10' : 'border-border'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-black text-foreground">{plan.name}</h3>
                          <p className="mt-1 text-xs font-semibold text-muted-foreground">
                            {accessPeriod(plan.billing_period)} · {plan.currency || 'USD'}
                          </p>
                        </div>
                        {price.onSale && price.discountPercent > 0 && (
                          <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold text-success">
                            Save {price.discountPercent}%
                          </span>
                        )}
                      </div>
                      <div className="mt-5">
                        {price.onSale && (
                          <p className="text-xs text-muted-foreground line-through">
                            {money(price.regularPrice, plan.currency)}
                          </p>
                        )}
                        <p className="text-4xl font-black tracking-tight text-foreground">
                          {money(price.finalPrice, plan.currency)}
                        </p>
                      </div>
                      {plan.description && (
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {plan.description}
                        </p>
                      )}
                      {(plan.features?.length ?? 0) > 0 && (
                        <ul className="mt-5 space-y-3">
                          {(plan.features ?? []).map((feature) => (
                            <li
                              key={feature}
                              className="flex items-start gap-2 text-sm leading-5 text-secondary-foreground"
                            >
                              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-primary" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Link
                        href={`/checkout?product_id=${encodeURIComponent(product.id)}&plan_id=${encodeURIComponent(plan.id)}`}
                        className="btn-primary mt-auto flex min-h-11 items-center justify-center gap-2 px-4 pt-3 text-sm"
                      >
                        Choose {plan.name} <ArrowRight size={14} />
                      </Link>
                    </article>
                  );
                })}
              </div>
            )}
            <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-primary/20 bg-card p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck size={20} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <h3 className="font-bold text-foreground">Account access after payment</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    After verified payment, access is unlocked in your SUMMECA account. Access
                    belongs to the account used at checkout and unlocks only after the payment is
                    confirmed. This SaaS product is used inside your dashboard; it is not delivered
                    as a downloadable ZIP.
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Monthly and yearly labels, when present, describe the access period. Recurring
                    billing applies only if checkout explicitly says a recurring agreement is being
                    created.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-screen-xl px-6 py-16 lg:px-8 lg:py-24">
          <div className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-foreground px-6 py-12 text-center text-background sm:px-10">
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl"
            />
            <div className="relative mx-auto max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                {story.eyebrow}
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                {story.finalHeadline}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-background/70">
                Select an active plan, complete checkout, and open the workspace from your SUMMECA
                account after payment verification.
              </p>
              <Link
                href={primaryHref}
                className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-black text-white transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none"
              >
                {story.primaryCta} <ArrowRight size={15} />
              </Link>
              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-background/60">
                <Check size={14} className="text-primary" />
                Verified account access · plan limits enforced
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
