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
            <p className="mt-4 max-w-2xl text-muted-foreground">Effective September 8, 2026.</p>
          </div>
        </section>
        <section className="mx-auto max-w-4xl px-6 py-14 lg:px-8 lg:py-16">
          <div className="space-y-6">
            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">Digital purchases</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">Refund eligibility can depend on the product, whether digital access has already been delivered, the reason for the request, and applicable law.</p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">Requesting help</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">For a payment or refund issue, email hello@summeca.com with your account email, order number, product name, payment date, and a short description of the issue.</p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">Subscriptions</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">Cancelling an eligible subscription stops future renewals. Requests relating to a completed payment are reviewed separately.</p>
            </article>
            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">Consumer rights</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">Nothing on this page is intended to limit rights that apply to you under mandatory consumer protection law.</p>
            </article>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
