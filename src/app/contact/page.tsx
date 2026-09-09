import type { Metadata } from 'next';
import {
  CreditCard,
  LifeBuoy,
  Mail,
  PackageCheck,
  ShoppingCart,
} from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'Contact | SUMMECA',
  description: 'Contact the right SUMMECA team for general, sales, support, orders, or billing questions.',
};

const contactTeams = [
  {
    icon: Mail,
    title: 'General inquiries',
    email: 'hello@summeca.com',
    description: 'General questions about SUMMECA, partnerships, company information, and anything that does not fit another department.',
    subject: 'General Inquiry',
  },
  {
    icon: ShoppingCart,
    title: 'Sales & pricing',
    email: 'sales@summeca.com',
    description: 'Product questions before purchase, plan selection, pricing, business purchases, and sales inquiries.',
    subject: 'Sales Inquiry',
  },
  {
    icon: LifeBuoy,
    title: 'Customer support',
    email: 'support@summeca.com',
    description: 'Account access, product help, technical issues, downloads, licenses, and general customer support.',
    subject: 'Support Request',
  },
  {
    icon: PackageCheck,
    title: 'Orders & delivery',
    email: 'orders@summeca.com',
    description: 'Order status, purchase confirmation, digital delivery, missing access, and order-specific questions.',
    subject: 'Order Question',
  },
  {
    icon: CreditCard,
    title: 'Billing & payments',
    email: 'billing@summeca.com',
    description: 'Payments, invoices, receipts, subscriptions, billing problems, refunds, and payment-related questions.',
    subject: 'Billing Question',
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="pt-[68px]">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-4xl px-6 py-16 text-center lg:px-8 lg:py-20">
            <p className="text-sm font-semibold text-primary">Contact SUMMECA</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Contact the right team</h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Choose the department that matches your question so your message reaches the right SUMMECA inbox.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14 lg:px-8 lg:py-16">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {contactTeams.map(({ icon: Icon, title, email, description, subject }) => (
              <a
                key={email}
                href={`mailto:${email}?subject=SUMMECA%20${encodeURIComponent(subject)}`}
                className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={21} />
                </div>
                <h2 className="mt-4 text-lg font-bold">{title}</h2>
                <p className="mt-1 text-sm font-semibold text-primary">{email}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
                <p className="mt-5 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">Email this team →</p>
              </a>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-secondary/30 p-5 text-sm leading-6 text-muted-foreground">
            For the fastest response, include your SUMMECA account email and, when relevant, your order number and product name. Never send passwords, verification codes, private keys, or full payment credentials by email.
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
