import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, Clock, Mail, Sparkles } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'Fast Digital Services | SUMMECA',
  description:
    'Focused SUMMECA services for landing-page conversion, ecommerce product pages, and local-business visibility, designed for fast delivery without long retainers.',
};

function mailto(subject: string, body: string) {
  return `mailto:sales@summeca.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const services = [
  {
    name: '24-Hour Conversion Rescue',
    label: 'Primary offer',
    price: 'From $250',
    description:
      'Improve one important landing page with clearer positioning, stronger CTAs, a cleaner conversion path, and a private preview before payment.',
    features: [
      'One-page conversion audit',
      'Hero, CTA, section flow and FAQ recommendations',
      'Three lead follow-up messages',
      '$250 strategy pack or $500 implementation pack',
    ],
    href: '/services/conversion-rescue',
    requestHref: mailto(
      '24-Hour Conversion Rescue — Preview Request',
      `Hi SUMMECA Sales,\n\nI would like a private preview for the 24-Hour Conversion Rescue.\n\nWebsite URL:\nBusiness name:\nMain offer/service:\nPrimary action I want visitors to take:\nPreferred package: $250 / $500\n\nThanks.`,
    ),
    featured: true,
  },
  {
    name: 'Ecommerce Product Page Rescue',
    label: 'Fast ecommerce pack',
    price: 'From $149',
    description:
      'Turn weak product listings into clearer, benefit-led product pages without rebuilding the store or changing the actual product facts.',
    features: [
      '5 product titles and descriptions',
      'Benefit bullets and CTA recommendations',
      'Meta descriptions and image-alt recommendations',
      '$149 for 5 products or $399 for 20 products',
    ],
    href: null,
    requestHref: mailto(
      'Ecommerce Product Page Rescue — Sample Request',
      `Hi SUMMECA Sales,\n\nI would like a sample for the Ecommerce Product Page Rescue.\n\nStore URL:\nProduct URL:\nBusiness name:\nPreferred package: 5 products for $149 / 20 products for $399\n\nThanks.`,
    ),
    featured: false,
  },
  {
    name: 'Local Visibility Quick Pack',
    label: 'Low-friction quick service',
    price: '$99',
    description:
      'A ready-to-paste local-business content pack for owners who want a stronger Google Business presence without sharing account access.',
    features: [
      'Optimized business and service descriptions',
      '10 professional review responses',
      '5 customer Q&As and 3 Google post drafts',
      'Short profile-gap checklist',
    ],
    href: null,
    requestHref: mailto(
      'Local Visibility Quick Pack — Sample Request',
      `Hi SUMMECA Sales,\n\nI would like a sample for the Local Visibility Quick Pack.\n\nBusiness name:\nGoogle Business/Profile URL:\nCity/Country:\nMain service:\n\nThanks.`,
    ),
    featured: false,
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="pt-[68px]">
        <section className="border-b border-border bg-gradient-to-b from-primary/[0.07] to-background">
          <div className="mx-auto max-w-6xl px-6 py-20 text-center lg:px-8 lg:py-24">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-bold text-primary">
              <Sparkles size={14} /> SUMMECA Services
            </div>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">
              Focused digital work you can evaluate quickly — without a long retainer.
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-muted-foreground">
              Choose the service that matches the problem in front of you. Each offer has a clear scope, a fixed starting price, and a fast delivery target.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2">
                <Clock size={15} className="text-primary" /> Fast-turnaround scopes
              </span>
              <span className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2">
                <Mail size={15} className="text-primary" /> Direct contact with SUMMECA Sales
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="grid gap-6 lg:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.name}
                className={`relative flex h-full flex-col rounded-3xl border p-7 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                  service.featured ? 'border-primary/40 bg-primary/[0.035]' : 'border-border bg-card'
                }`}
              >
                {service.featured ? (
                  <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                    Best place to start
                  </div>
                ) : null}
                <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">{service.label}</p>
                <h2 className="mt-3 text-2xl font-black tracking-tight">{service.name}</h2>
                <div className="mt-3 text-3xl font-black">{service.price}</div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{service.description}</p>
                <div className="mt-6 space-y-3">
                  {service.features.map((feature) => (
                    <div key={feature} className="flex gap-3 text-sm leading-6">
                      <Check size={17} className="mt-1 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto flex flex-col gap-2 pt-7">
                  <a href={service.requestHref} className="btn-primary flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold">
                    Request a sample <ArrowRight size={15} />
                  </a>
                  {service.href ? (
                    <Link
                      href={service.href}
                      className="rounded-xl border border-border bg-background px-5 py-3 text-center text-sm font-bold transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      View full service
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-border bg-secondary/25 p-5 text-sm leading-6 text-muted-foreground">
            SUMMECA does not guarantee a specific number of sales, leads, rankings, or conversion-rate improvement. We guarantee only the agreed scope and deliverables. We also do not invent testimonials, statistics, certifications, guarantees, or business facts.
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
