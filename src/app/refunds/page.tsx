import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'Refund Policy | SUMMECA',
  description: 'Information about refund requests for SUMMECA purchases.',
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="pt-[68px]">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8 lg:py-20">
            <p className="text-sm font-semibold text-primary">Payments</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Refund Policy</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">Effective September 9, 2026.</p>
          </div>
        </section>
        <section className="mx-auto max-w-4xl px-6 py-14 lg:px-8 lg:py-16">
          <div className="space-y-6">
            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">Digital purchases</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Refund eligibility depends on the product, whether digital access has already been delivered,
                the reason for the request, the payment method, and any rights that apply under law. Submitting
                a request does not by itself guarantee approval or a specific processing timeframe.
              </p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">Requesting help</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                For a payment or refund issue, email hello@summeca.com with your account email, order number,
                product name, payment date, and a short description of the issue. You can also submit an eligible
                refund request from your order history while signed in.
              </p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">Subscriptions and access periods</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                SUMMECA currently records paid access periods after a verified payment. A dashboard status change
                alone is not confirmation that an external payment provider has cancelled recurring billing. If a
                provider shows an active recurring agreement, contact SUMMECA support and rely on provider-side
                confirmation before treating future charges as cancelled.
              </p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">Refund completion</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                A refund is treated as completed only after the payment provider confirms the refund and SUMMECA
                records that confirmed state. Review, approval, and provider processing times can vary.
              </p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">Consumer rights</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Nothing on this page is intended to limit rights that apply to you under mandatory consumer
                protection law.
              </p>
            </article>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
