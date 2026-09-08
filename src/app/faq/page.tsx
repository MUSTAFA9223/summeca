import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'FAQ | SUMMECA',
  description: 'Frequently asked questions about SUMMECA accounts, products, payments, downloads, subscriptions, and support.',
};

const faqs = [
  ['What is SUMMECA?', 'SUMMECA is a platform for digital products, AI tools, SaaS applications, templates, and related digital services.'],
  ['Do I need an account to buy?', 'Some checkout and delivery flows require a SUMMECA account so purchases, downloads, subscriptions, and support can be linked securely to you.'],
  ['Where do I find my purchases?', 'After a completed purchase, open your user dashboard and check Orders and Downloads.'],
  ['What payment methods are available?', 'Available payment methods are shown at checkout and can vary depending on configuration and availability.'],
  ['How do subscriptions work?', 'Recurring plans renew according to the billing period shown at checkout until cancelled, where recurring billing is available.'],
  ['How do I reset my password?', 'Use the Forgot Password option on the sign-in page and follow the recovery link sent to your email.'],
  ['Can I request a refund?', 'Refund requests are reviewed according to the Refund Policy, product delivery status, transaction circumstances, and applicable law.'],
  ['How do I contact support?', 'Visit the Support Center or email hello@summeca.com with your account email, order number when relevant, and a short description of the issue.'],
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="pt-[68px]">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-4xl px-6 py-16 text-center lg:px-8 lg:py-20">
            <p className="text-sm font-semibold text-primary">Help</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Frequently Asked Questions</h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Quick answers to common questions about SUMMECA.</p>
          </div>
        </section>
        <section className="mx-auto max-w-4xl px-6 py-14 lg:px-8 lg:py-16">
          <div className="space-y-3">
            {faqs.map(([q, a]) => (
              <details key={q} className="rounded-2xl border border-border bg-card px-5 py-4 open:shadow-sm">
                <summary className="cursor-pointer list-none pr-6 text-sm font-semibold">{q}</summary>
                <p className="mt-3 border-t border-border pt-3 text-sm leading-7 text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
