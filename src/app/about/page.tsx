import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BrainCircuit,
  Boxes,
  ExternalLink,
  LifeBuoy,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'About SUMMECA',
  description:
    'Learn how SUMMECA builds and publishes practical AI tools, SaaS applications, and digital products with clear product information, protected access, and customer support.',
  openGraph: {
    type: 'website',
    url: 'https://summeca.com/about',
    title: 'About SUMMECA',
    description:
      'Practical AI tools, SaaS applications, and digital products built around real business workflows.',
    siteName: 'SUMMECA',
  },
};

const pillars = [
  {
    icon: BrainCircuit,
    title: 'Useful AI',
    text: 'AI features should solve real workflow problems and remain clear about what they do and do not automate.',
  },
  {
    icon: Boxes,
    title: 'Practical products',
    text: 'We focus on software, templates, digital resources, and workflow tools that can be applied to real work.',
  },
  {
    icon: ShieldCheck,
    title: 'Protected access',
    text: 'Account access, payment confirmation, customer data, and post-purchase delivery are treated as core product responsibilities.',
  },
  {
    icon: Sparkles,
    title: 'Clear experience',
    text: 'Product pages are designed to make pricing, included features, access, and next steps easier to understand before purchase.',
  },
];

const transparency = [
  {
    title: 'Product details before purchase',
    text: 'Published product pages show the current product description, plan information, and available purchase options before checkout.',
  },
  {
    title: 'Payment confirmation before paid access',
    text: 'Paid access follows verified payment-provider confirmation rather than relying on a browser redirect alone.',
  },
  {
    title: 'Dedicated customer contact routes',
    text: 'SUMMECA provides separate contact routes for general, sales, support, order, and billing questions.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="pt-[68px]">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-5xl px-6 py-20 text-center lg:px-8 lg:py-24">
            <p className="text-sm font-semibold text-primary">About SUMMECA</p>
            <h1 className="mx-auto mt-2 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Practical digital tools for real modern-work workflows
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
              SUMMECA is an independent digital-product and software platform focused on AI tools,
              SaaS applications, and ready-to-use digital products. The goal is simple: make useful
              technology easier to understand, purchase, and use.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/products"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
              >
                Explore products <ArrowRight size={15} />
              </Link>
              <a
                href="https://www.producthunt.com/products/summeca"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold transition hover:border-primary/30 hover:text-primary"
              >
                SUMMECA on Product Hunt <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="grid gap-5 md:grid-cols-2">
            {pillars.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={21} />
                </div>
                <h2 className="mt-5 text-lg font-bold">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>

          <div className="mt-14">
            <p className="text-sm font-semibold text-primary">How SUMMECA operates</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Trust should come from verifiable details, not marketing claims.
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {transparency.map((item) => (
                <article key={item.title} className="rounded-2xl border border-border bg-secondary/20 p-5">
                  <ShieldCheck size={18} className="text-primary" />
                  <h3 className="mt-3 text-sm font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-primary/20 bg-primary/5 p-7">
              <LifeBuoy size={20} className="text-primary" />
              <h2 className="mt-4 text-xl font-bold">Need help or want to verify something?</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                The contact page lists dedicated SUMMECA addresses for general, sales, customer
                support, orders, and billing questions.
              </p>
              <Link href="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                Contact SUMMECA <ArrowRight size={14} />
              </Link>
            </div>

            <div className="rounded-3xl border border-border bg-card p-7">
              <ShieldCheck size={20} className="text-primary" />
              <h2 className="mt-4 text-xl font-bold">Policies are public</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Refund, privacy, terms, cookie, and support information is available publicly so
                customers can review important conditions before purchasing.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm font-bold text-primary">
                <Link href="/refunds" className="hover:underline">Refunds</Link>
                <Link href="/privacy" className="hover:underline">Privacy</Link>
                <Link href="/terms" className="hover:underline">Terms</Link>
                <Link href="/support" className="hover:underline">Support</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
