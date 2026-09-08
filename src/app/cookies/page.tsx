import type { Metadata } from 'next';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'Cookie Policy | SUMMECA',
  description: 'How SUMMECA uses cookies and similar browser technologies.',
};

const sections = [
  ['Essential cookies', 'These support core functions such as authentication, session continuity, security, preferences, and checkout behavior.'],
  ['Analytics', 'Where analytics are enabled, measurement technologies may help us understand page usage, product interest, and performance so we can improve SUMMECA.'],
  ['Third-party services', 'Some services used by SUMMECA, such as authentication, payment processing, hosting, or analytics providers, may set or read their own cookies according to their policies.'],
  ['Your choices', 'You can control cookies through your browser settings. Blocking essential cookies may prevent sign-in, checkout, dashboard, or other account features from working correctly.'],
  ['Updates', 'We may update this policy when our services or legal requirements change. The effective date on this page will be updated when that happens.'],
];

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="pt-[68px]">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8 lg:py-20">
            <p className="text-sm font-semibold text-primary">Legal</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Cookie Policy</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">Effective September 8, 2026. This page explains how browser storage and similar technologies may be used on SUMMECA.</p>
          </div>
        </section>
        <section className="mx-auto max-w-4xl px-6 py-14 lg:px-8 lg:py-16">
          <div className="space-y-6">
            {sections.map(([title, body]) => (
              <article key={title} className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-bold">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
