import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export default function PricingSection() {
  return (
    <section className="bg-gradient-section py-24" id="pricing">
      <div className="mx-auto max-w-screen-xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck size={22} />
          </div>
          <h2 className="mt-5 text-3xl font-extrabold text-foreground">Pricing comes from published product plans</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            SUMMECA does not advertise placeholder Free, Pro, or Business tiers. The pricing page shows only active production offers using the same plan data used by checkout.
          </p>
          <Link href="/pricing" className="btn-primary mt-7 inline-flex items-center gap-2 px-6 py-3 text-sm">
            View published pricing <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
