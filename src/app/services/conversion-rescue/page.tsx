import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Clock,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: '24-Hour Conversion Rescue | SUMMECA',
  description:
    'A focused landing-page conversion rescue for service businesses and online stores. Get clearer messaging, stronger CTAs, and a private preview before payment.',
};

const readyToImplement = [
  'Focused audit of one existing page',
  'Hero headline and subheadline rewrite',
  'Primary CTA and section-flow recommendations',
  'Benefit-led copy for the most important sections',
  'FAQ recommendations based on the real offer',
  'Mobile clarity and friction review',
  'Three lead follow-up messages',
  'Private preview before payment',
];

const implementation = [
  ...readyToImplement.slice(0, -1),
  'Implementation on a supported existing platform',
  'Final QA before publish or handoff',
  'Private preview before payment',
];

const requestBody = `Hi SUMMECA Sales,

I would like a private preview for the 24-Hour Conversion Rescue.

Website URL:
Business name:
Main offer/service:
Primary action I want visitors to take:
Preferred package: $250 Ready-to-Implement / $500 Implementation
Anything else you should know:

Thanks.`;

const requestHref = `mailto:sales@summeca.com?subject=${encodeURIComponent(
  '24-Hour Conversion Rescue — Preview Request',
)}&body=${encodeURIComponent(requestBody)}`;

const steps = [
  {
    number: '01',
    title: 'Send the page',
    text: 'Share the page URL, your main offer, and the action you want visitors to take.',
  },
  {
    number: '02',
    title: 'Receive a private preview',
    text: 'We prepare a focused preview so you can judge the direction before paying.',
  },
  {
    number: '03',
    title: 'Approve and pay',
    text: 'If the preview fits, approve the scope and complete payment before the final handoff or publish.',
  },
  {
    number: '04',
    title: 'Get the final delivery',
    text: 'Receive the polished, human-reviewed deliverables for the package you selected.',
  },
];

const faqs = [
  {
    question: 'Do I pay before seeing anything?',
    answer:
      'No. The service is structured around a private preview first. Payment is requested after you approve the direction and before the final editable handoff or publish.',
  },
  {
    question: 'Is this a full website redesign?',
    answer:
      'No. The goal is speed and focus. We work on one existing page and improve the messaging, CTA clarity, and conversion flow without turning it into a long redesign project.',
  },
  {
    question: 'Can you guarantee more sales or a specific conversion rate?',
    answer:
      'No responsible provider can guarantee a specific sales or conversion result. SUMMECA guarantees the agreed deliverables and delivery scope, not a specific commercial outcome.',
  },
  {
    question: 'Which platforms can you implement on?',
    answer:
      'Implementation is offered only when the current platform and access level can be handled safely. We confirm feasibility before accepting the implementation package.',
  },
  {
    question: 'Is AI used?',
    answer:
      'AI may be used to accelerate analysis and drafting, but the final work is reviewed and refined by a human. We do not invent testimonials, statistics, guarantees, certifications, or business facts.',
  },
];

function PackageCard({
  title,
  price,
  description,
  features,
  featured = false,
}: {
  title: string;
  price: string;
  description: string;
  features: string[];
  featured?: boolean;
}) {
  return (
    <div
      className={`relative flex h-full flex-col rounded-3xl border p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
        featured ? 'border-primary/40 bg-primary/[0.035]' : 'border-border bg-card'
      }`}
    >
      {featured ? (
        <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
          Implementation included
        </div>
      ) : null}
      <p className="text-sm font-bold text-primary">{title}</p>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-4xl font-black tracking-tight text-foreground">{price}</span>
        <span className="pb-1 text-sm text-muted-foreground">one-time</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-6 space-y-3">
        {features.map((feature) => (
          <div key={feature} className="flex gap-3 text-sm leading-6 text-foreground">
            <Check size={17} className="mt-1 shrink-0 text-primary" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
      <a
        href={requestHref}
        className={`mt-7 flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition ${
          featured
            ? 'btn-primary'
            : 'border border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5'
        }`}
      >
        Request private preview <ArrowRight size={15} />
      </a>
    </div>
  );
}

export default function ConversionRescuePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="pt-[68px]">
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/[0.07] via-background to-background">
          <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-72 max-w-5xl rounded-full bg-primary/[0.06] blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-bold text-primary">
                <Sparkles size={14} /> SUMMECA Conversion Services
              </div>
              <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Make one important page clearer, stronger, and easier to act on — in 24 hours.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                The 24-Hour Conversion Rescue is a focused service for businesses that already have traffic but need sharper messaging, stronger CTAs, and a cleaner conversion path — without a full redesign.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2">
                  <Clock size={15} className="text-primary" /> 24-hour target turnaround
                </span>
                <span className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2">
                  <ShieldCheck size={15} className="text-primary" /> Private preview before payment
                </span>
                <span className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2">
                  <Sparkles size={15} className="text-primary" /> AI-assisted, human-reviewed
                </span>
              </div>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a href={requestHref} className="btn-primary flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold">
                  Request a private preview <ArrowRight size={16} />
                </a>
                <Link
                  href="#packages"
                  className="rounded-xl border border-border bg-card px-6 py-3.5 text-sm font-bold text-foreground transition hover:border-primary/40 hover:bg-primary/5"
                >
                  See packages
                </Link>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                No guaranteed sales claims. The service guarantees only the agreed scope and deliverables.
              </p>
            </div>
          </div>
        </section>

        <section id="packages" className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold text-primary">Simple pricing</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Choose the level of help you need</h2>
            <p className="mt-4 text-muted-foreground">
              Start with the focused strategy pack or add implementation when the current platform can be handled safely.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <PackageCard
              title="Ready-to-Implement Pack"
              price="$250"
              description="Best when you or your developer can make the changes. You receive a focused conversion plan and polished copy ready to use."
              features={readyToImplement}
            />
            <PackageCard
              title="Implementation Pack"
              price="$500"
              description="Best when you want SUMMECA to prepare the conversion work and implement the approved changes on a supported existing platform."
              features={implementation}
              featured
            />
          </div>
        </section>

        <section className="border-y border-border bg-secondary/25">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold text-primary">How it works</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">Preview first. Pay after approval.</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div key={step.number} className="rounded-2xl border border-border bg-card p-6">
                  <div className="text-xs font-black tracking-[0.16em] text-primary">{step.number}</div>
                  <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-bold text-primary">Best fit</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Built for businesses that need speed, not a months-long redesign</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              This service works best when you already have a live page and a real offer, but the message, CTA, or page flow is too vague or difficult to act on.
            </p>
            <div className="mt-6 space-y-3 text-sm">
              {[
                'Local service businesses such as HVAC, roofing, dental, med spa, and professional services',
                'Consultants, agencies, coaches, and B2B service providers',
                'Online stores with an important product or offer page',
                'Businesses already sending visitors to a page through outreach, referrals, ads, or social traffic',
              ].map((item) => (
                <div key={item} className="flex gap-3">
                  <Check size={17} className="mt-1 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-7 shadow-sm sm:p-8">
            <p className="text-sm font-bold text-primary">What we need from you</p>
            <h3 className="mt-2 text-2xl font-black">Five details are enough to start the preview</h3>
            <div className="mt-6 space-y-4">
              {[
                'The URL of the page you want reviewed',
                'Your main offer or service',
                'The customer you most want that page to attract',
                'The primary action you want visitors to take',
                'Any factual offer details, pricing, proof, or restrictions we must preserve',
              ].map((item, index) => (
                <div key={item} className="flex items-start gap-4 rounded-2xl border border-border bg-background p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-6">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-secondary/20">
          <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8 lg:py-20">
            <div className="text-center">
              <p className="text-sm font-bold text-primary">FAQ</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">Before you request a preview</h2>
            </div>
            <div className="mt-9 space-y-4">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="font-bold">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="rounded-3xl border border-primary/20 bg-primary/[0.045] px-6 py-10 text-center sm:px-10 sm:py-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Mail size={22} />
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight">Send the page. Get a private preview.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              Tell us what page matters most and what you want visitors to do. We will confirm the scope before any payment is requested.
            </p>
            <a href={requestHref} className="btn-primary mx-auto mt-7 inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold">
              Email sales@summeca.com <ArrowRight size={16} />
            </a>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
