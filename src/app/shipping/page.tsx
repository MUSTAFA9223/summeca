import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'Delivery Policy | SUMMECA',
  description: 'How SUMMECA delivers digital products and software access without physical shipping.',
};

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="pt-[68px]">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8 lg:py-20">
            <p className="text-sm font-semibold text-primary">Digital delivery</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Delivery Policy</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">Effective September 16, 2026.</p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-14 lg:px-8 lg:py-16">
          <div className="space-y-6">
            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">No physical shipping</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                SUMMECA currently sells digital products and software access. We do not ship physical goods,
                so there are no physical shipping charges, carriers, tracking numbers, or delivery addresses
                for these products.
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">How delivery works</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                After an eligible order or free checkout is confirmed, access is provided electronically through
                the customer account, product workspace, or the digital download flow shown for that product.
                Availability can depend on the product type and successful confirmation of any required payment.
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">Delivery help</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                If your confirmed order does not appear in your account or you cannot access the purchased digital
                product, email hello@summeca.com with your account email, order number, and product name so we can
                investigate the delivery issue.
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold">Refunds</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Refund eligibility is handled separately under the SUMMECA Refund Policy and may depend on the
                product, delivery status, payment method, reason for the request, and applicable consumer rights.
              </p>
            </article>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
