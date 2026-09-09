import Link from 'next/link';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

const steps = [
  {
    num: '01',
    title: 'Choose a published product',
    desc: 'Browse products that have passed SUMMECA publishing checks and have an active production offer.',
    cta: { label: 'Browse products', href: '/products' },
  },
  {
    num: '02',
    title: 'Complete verified checkout',
    desc: 'Choose an available payment method. Paid orders remain pending until the provider confirms the transaction; free offers use the protected free-order flow.',
    cta: { label: 'View published pricing', href: '/pricing' },
  },
  {
    num: '03',
    title: 'Use your account access',
    desc: 'Open your dashboard to see completed orders, eligible downloads, plan access, notifications, and customer support in one place.',
    cta: { label: 'Open account', href: '/user-dashboard' },
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-screen-xl px-6 lg:px-8">
        <div className="mb-14 text-center">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-3 py-1">
            <Sparkles size={11} className="text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">How It Works</span>
          </div>
          <h2 className="text-3xl font-extrabold text-foreground">A checkout flow built around verification</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-secondary-foreground">The storefront does not grant paid access from a browser redirect alone. The server verifies the order state first.</p>
        </div>

        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="absolute left-[calc(33.33%+24px)] right-[calc(33.33%+24px)] top-12 hidden h-px bg-gradient-to-r from-primary/30 via-primary/60 to-primary/30 md:block" />
          {steps.map((step, index) => (
            <div key={step.num} className={`relative rounded-2xl border border-border bg-white p-7 card-hover fade-in stagger-${index + 1}`}>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-teal shadow-sm"><span className="text-xs font-extrabold text-white">{step.num}</span></div>
                <CheckCircle2 size={16} className="text-primary/40" />
              </div>
              <h3 className="text-base font-bold text-foreground">{step.title}</h3>
              <p className="mb-5 mt-2 text-sm leading-relaxed text-secondary-foreground">{step.desc}</p>
              <Link href={step.cta.href} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all">{step.cta.label} <ArrowRight size={13} /></Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
