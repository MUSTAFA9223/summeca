import type { Metadata } from 'next';
import { ArrowRight, Check, Clock3, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'Same-Day Landing Page Sprint — $75 | SUMMECA',
  description:
    'Get a focused landing-page conversion sprint from SUMMECA: revised hero, CTA hierarchy, five concrete page improvements, and same-day delivery for $75.',
  openGraph: {
    type: 'website',
    url: '/services/landing-page-sprint',
    title: 'Same-Day Landing Page Sprint — $75 | SUMMECA',
    description:
      'A focused same-day conversion sprint for SaaS and digital-product landing pages.',
    siteName: 'SUMMECA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Same-Day Landing Page Sprint — $75 | SUMMECA',
    description:
      'Revised hero, CTA hierarchy, five actionable improvements, and same-day delivery.',
  },
};

const deliverables = [
  'A rewritten hero headline and supporting subhead',
  'A clearer primary CTA and CTA hierarchy',
  'Five specific conversion improvements for your page',
  'A fast mobile-first messaging and friction review',
  'One revision round after delivery',
];

export default function LandingPageSprintPage() {
  const subject = encodeURIComponent('Start the $75 Same-Day Landing Page Sprint');
  const body = encodeURIComponent(
    'Hi SUMMECA,\n\nI want the $75 Same-Day Landing Page Sprint.\n\nWebsite: \nMain goal: \nTarget customer: \n\nPlease send the secure payment link and next steps.',
  );
  const mailto = `mailto:hello@summeca.com?subject=${subject}&body=${body}`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <main className="pt-[68px]">
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/10 via-background to-background">
          <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                <Clock3 size={16} />
                Same-day delivery
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Fix the message on your landing page
                <span className="block text-primary">today — for $75</span>
              </h1>

              <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
                A focused conversion sprint for SaaS founders and digital-product teams who need a clearer
                hero, stronger CTA, and practical page improvements without starting a long redesign project.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href={mailto}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
                >
                  Start the $75 sprint
                  <ArrowRight size={17} />
                </a>
                <a
                  href="mailto:hello@summeca.com"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold transition hover:border-primary/30"
                >
                  <Mail size={17} />
                  Ask a question
                </a>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Secure payment link is provided before work begins. No subscription or long-term contract.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-border bg-card p-7 sm:p-9">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles size={21} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">What you get</p>
                  <h2 className="text-2xl font-black">A practical conversion package</h2>
                </div>
              </div>

              <div className="mt-7 space-y-4">
                {deliverables.map((item) => (
                  <div key={item} className="flex gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check size={15} />
                    </div>
                    <p className="leading-6 text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-primary/25 bg-primary/[0.06] p-7 sm:p-9">
              <p className="text-sm font-semibold text-primary">Simple process</p>
              <h2 className="mt-2 text-2xl font-black">From URL to deliverable</h2>

              <div className="mt-7 space-y-6">
                <div>
                  <p className="font-bold">1. Send your page</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Share the URL, your main conversion goal, and the customer you want to attract.
                  </p>
                </div>
                <div>
                  <p className="font-bold">2. Confirm the sprint</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    We send a secure payment link for the fixed $75 project price.
                  </p>
                </div>
                <div>
                  <p className="font-bold">3. Receive the changes</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    The first version is delivered within one hour of the agreed start time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-secondary/20">
          <div className="mx-auto grid max-w-6xl gap-5 px-6 py-12 md:grid-cols-3 lg:px-8">
            <div className="rounded-2xl border border-border bg-background p-6">
              <Clock3 className="text-primary" size={22} />
              <h3 className="mt-4 font-bold">Fast scope</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Built for a single landing page, not a weeks-long redesign.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-6">
              <ShieldCheck className="text-primary" size={22} />
              <h3 className="mt-4 font-bold">Fixed price</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                $75 for the defined sprint, with one revision included.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-6">
              <Sparkles className="text-primary" size={22} />
              <h3 className="mt-4 font-bold">Actionable output</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                You receive wording and concrete edits you can ship immediately.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-16 text-center lg:px-8 lg:py-20">
          <p className="text-sm font-semibold text-primary">Ready when you are</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">Send the page. Get the sprint started.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            If your page already exists and you want a sharper message today, this is the fastest way to start.
          </p>
          <a
            href={mailto}
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
          >
            Start for $75
            <ArrowRight size={17} />
          </a>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
