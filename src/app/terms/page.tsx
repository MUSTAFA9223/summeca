import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'Terms of Service | SUMMECA',
  description: 'Terms governing access to and use of SUMMECA products, services, accounts, and purchases.',
};

const sections = [
  {
    title: '1. Using SUMMECA',
    body: 'You may use SUMMECA only for lawful purposes and in accordance with these Terms. You are responsible for the activity on your account and for keeping your sign-in credentials secure.',
  },
  {
    title: '2. Accounts',
    body: 'You must provide accurate information when creating an account. You may not share access in a way that violates a product license, impersonate another person, interfere with the platform, or attempt to bypass security controls.',
  },
  {
    title: '3. Products, plans, and pricing',
    body: 'Product features, availability, plan type, currency, billing period, and price are shown before purchase. We may update future pricing or product availability. A change does not retroactively alter a completed one-time purchase unless required by law or explicitly agreed with you.',
  },
  {
    title: '4. Payments',
    body: 'Payments may be processed by third-party payment providers. A purchase is considered complete only after the payment provider and SUMMECA confirm the transaction. You are responsible for any taxes, bank charges, or provider fees that apply to your transaction where permitted by law.',
  },
  {
    title: '5. Digital delivery and licenses',
    body: 'Digital products, downloads, subscriptions, API access, and lifetime plans may have different license or usage rules. Your purchase gives you the rights stated on the product page or plan at the time of purchase. It does not transfer ownership of SUMMECA intellectual property unless explicitly stated.',
  },
  {
    title: '6. Subscriptions',
    body: 'Recurring plans renew according to the billing period shown at checkout until cancelled. Where recurring billing is available, you can manage eligible subscriptions from your account. Cancellation affects future renewals and does not automatically reverse a completed payment.',
  },
  {
    title: '7. Refunds',
    body: 'Refund eligibility is governed by our Refund Policy and applicable law. Because many SUMMECA products are digital and can be accessed immediately, eligibility may depend on whether access or delivery has already occurred.',
  },
  {
    title: '8. Acceptable use',
    body: 'You may not abuse, reverse engineer where prohibited, disrupt, scrape at harmful scale, resell access without permission, upload malicious code, or use SUMMECA to violate another person’s rights or applicable law.',
  },
  {
    title: '9. Availability and changes',
    body: 'We work to keep SUMMECA available and reliable, but online services can experience maintenance, outages, third-party failures, or feature changes. We may modify or discontinue features when reasonably necessary.',
  },
  {
    title: '10. Limitation of liability',
    body: 'To the maximum extent permitted by applicable law, SUMMECA is not liable for indirect, incidental, special, consequential, or punitive damages arising from use of the service. Nothing in these Terms excludes rights or liabilities that cannot legally be excluded.',
  },
  {
    title: '11. Changes to these Terms',
    body: 'We may update these Terms as SUMMECA evolves or legal requirements change. Material updates will be reflected by a revised effective date, and additional notice may be provided when appropriate.',
  },
  {
    title: '12. Contact',
    body: 'Questions about these Terms can be sent to hello@summeca.com.',
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="pt-[68px]">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8 lg:py-20">
            <p className="text-sm font-semibold text-primary">Legal</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Terms of Service</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">Effective September 8, 2026. These Terms apply to your use of SUMMECA and purchases made through summeca.com.</p>
          </div>
        </section>
        <section className="mx-auto max-w-4xl px-6 py-14 lg:px-8 lg:py-16">
          <div className="space-y-8">
            {sections.map((section) => (
              <article key={section.title} className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-bold">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{section.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-10 text-xs leading-6 text-muted-foreground">These Terms are intended to provide clear platform rules and do not limit mandatory consumer rights that apply under applicable law.</p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
