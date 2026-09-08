import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CreditCard,
  Download,
  LifeBuoy,
  LockKeyhole,
  Mail,
  MessageCircleQuestion,
  PackageCheck,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'Support Center | SUMMECA',
  description: 'Get help with your SUMMECA account, purchases, downloads, payments, and digital products.',
};

const helpTopics = [
  {
    icon: UserRound,
    title: 'Account & Sign In',
    description: 'Help with signing in, password recovery, profile access, and account settings.',
    href: '/sign-up-login-screen',
    action: 'Manage account',
  },
  {
    icon: CreditCard,
    title: 'Payments & Orders',
    description: 'Understand checkout, payment status, receipts, failed payments, and order history.',
    href: '/user-dashboard/orders',
    action: 'View orders',
  },
  {
    icon: Download,
    title: 'Downloads & Access',
    description: 'Find purchased files, product access, licenses, and download availability.',
    href: '/user-dashboard/downloads',
    action: 'Open downloads',
  },
  {
    icon: PackageCheck,
    title: 'Products & Plans',
    description: 'Get help choosing a product, understanding plans, subscriptions, and lifetime access.',
    href: '/products',
    action: 'Browse products',
  },
  {
    icon: ShieldCheck,
    title: 'Security & Privacy',
    description: 'Learn how SUMMECA protects accounts, purchases, and personal information.',
    href: '/privacy',
    action: 'Privacy policy',
  },
  {
    icon: MessageCircleQuestion,
    title: 'Something Else',
    description: 'Can’t find what you need? Contact the SUMMECA support team directly.',
    href: 'mailto:hello@summeca.com?subject=SUMMECA%20Support%20Request',
    action: 'Contact support',
  },
];

const faqs = [
  {
    q: 'Where can I find my purchased products?',
    a: 'After a successful purchase, your available products and files appear in your SUMMECA user dashboard under Downloads and Orders.',
  },
  {
    q: 'What should I do if a payment is pending?',
    a: 'Keep the checkout confirmation and wait for the payment provider to finish processing. If the order remains pending, contact support and include your order details.',
  },
  {
    q: 'I forgot my password. How do I reset it?',
    a: 'Open the sign-in page, choose the forgot-password option, and follow the reset link sent to your email address.',
  },
  {
    q: 'Can I get help with a product before buying?',
    a: 'Yes. Contact support with the product name and your question, and we’ll help you understand the product, plan, or access type before purchase.',
  },
  {
    q: 'What information should I include in a support request?',
    a: 'Include your SUMMECA account email, order number when relevant, the product name, and a short description of the issue. Never send passwords or private security codes.',
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <main>
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-5xl px-6 py-20 text-center lg:px-8 lg:py-28">
            <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary">
              <LifeBuoy size={14} />
              SUMMECA Support Center
            </div>

            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              How can we help?
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Get quick help with your account, payments, purchases, downloads, and SUMMECA products.
            </p>

            <div className="mx-auto mt-8 flex max-w-2xl items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
              <Search size={18} className="shrink-0 text-muted-foreground" />
              <span className="text-left text-sm text-muted-foreground">
                Choose a help topic below or contact our support team directly.
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-screen-xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="mb-9">
            <p className="text-sm font-semibold text-primary">Help topics</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Find the right help faster</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {helpTopics.map(({ icon: Icon, title, description, href, action }) => {
              const external = href.startsWith('mailto:');
              const card = (
                <div className="group h-full rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={21} />
                  </div>
                  <h3 className="text-base font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                  <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-primary">
                    {action}
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );

              return external ? (
                <a key={title} href={href} className="block h-full">
                  {card}
                </a>
              ) : (
                <Link key={title} href={href} className="block h-full">
                  {card}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="border-y border-border bg-secondary/25">
          <div className="mx-auto grid max-w-screen-xl gap-10 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-20">
            <div>
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen size={19} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">Common questions</p>
                  <h2 className="text-2xl font-bold">Quick answers</h2>
                </div>
              </div>

              <div className="space-y-3">
                {faqs.map((item) => (
                  <details key={item.q} className="group rounded-2xl border border-border bg-card px-5 py-4 open:shadow-sm">
                    <summary className="cursor-pointer list-none pr-6 text-sm font-semibold marker:hidden">
                      {item.q}
                    </summary>
                    <p className="mt-3 border-t border-border pt-3 text-sm leading-6 text-muted-foreground">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>

            <aside className="lg:pt-4">
              <div className="sticky top-24 rounded-3xl border border-primary/20 bg-card p-7 shadow-sm">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Mail size={21} />
                </div>
                <h2 className="text-2xl font-bold">Still need help?</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Send us a support request and include your account email, product name, and order number when applicable.
                </p>

                <a
                  href="mailto:hello@summeca.com?subject=SUMMECA%20Support%20Request"
                  className="btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
                >
                  Email Support
                  <ArrowRight size={15} />
                </a>

                <div className="mt-5 space-y-3 border-t border-border pt-5 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <LockKeyhole size={14} className="mt-0.5 shrink-0 text-primary" />
                    <span>Never send passwords, verification codes, or private keys.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail size={14} className="mt-0.5 shrink-0 text-primary" />
                    <span>Support email: hello@summeca.com</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
