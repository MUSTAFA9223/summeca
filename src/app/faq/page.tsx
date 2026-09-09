import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about SUMMECA accounts, products, payments, downloads, plan access, and support.',
};

const faqs = [
  ['What is SUMMECA?', 'SUMMECA is a platform for digital products, AI tools, SaaS applications, templates, datasets, and related digital services.'],
  ['Do I need an account to buy?', 'Checkout and delivery flows can require a SUMMECA account so purchases, downloads, plan access, and support can be linked securely to you.'],
  ['Where do I find my purchases?', 'After an order is completed, open your user dashboard and check Orders. Eligible product files appear under Downloads when the product includes a configured download entitlement.'],
  ['What payment methods are available?', 'The checkout page shows the methods that are configured and available for production at that moment. A test or unconfigured processor is not presented as an available production method.'],
  ['Do monthly or yearly plans automatically renew?', 'Not necessarily. Monthly and yearly labels describe the plan period. Automatic renewal exists only when checkout and the payment provider explicitly state that a recurring billing agreement is being created.'],
  ['When is paid access granted?', 'Paid orders stay pending until the payment provider confirms the transaction through server-side verification. Returning to the site from a payment page is not enough by itself to grant access.'],
  ['How do I reset my password?', 'Use the Forgot Password option on the sign-in page and follow the recovery link sent to your email.'],
  ['Can I request a refund?', 'Refund requests are reviewed according to the published Refund Policy, product delivery status, transaction circumstances, provider capabilities, and applicable law. A request does not by itself guarantee approval or a payout timeframe.'],
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
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Answers based on SUMMECA&apos;s current production checkout and account behavior.</p>
          </div>
        </section>
        <section className="mx-auto max-w-4xl px-6 py-14 lg:px-8 lg:py-16">
          <div className="space-y-3">
            {faqs.map(([question, answer]) => (
              <details key={question} className="rounded-2xl border border-border bg-card px-5 py-4 open:shadow-sm">
                <summary className="cursor-pointer list-none pr-6 text-sm font-semibold">{question}</summary>
                <p className="mt-3 border-t border-border pt-3 text-sm leading-7 text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
