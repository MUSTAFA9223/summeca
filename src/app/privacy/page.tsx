import type { Metadata } from 'next';
import Link from 'next/link';
import { LockKeyhole, ShieldCheck, Database, Cookie, CreditCard, UserRound, Mail, ArrowRight } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'Privacy Policy | SUMMECA',
  description: 'Learn how SUMMECA collects, uses, protects, and manages personal information.',
};

const sections = [
  {
    icon: Database,
    title: 'Information we collect',
    body: 'We may collect information you provide directly, such as your name, email address, account details, support messages, order information, and product usage data needed to provide and improve SUMMECA services.',
  },
  {
    icon: UserRound,
    title: 'How we use information',
    body: 'We use information to create and secure accounts, process orders, deliver digital products, provide customer support, operate subscriptions, improve the platform, prevent abuse, and communicate important service updates.',
  },
  {
    icon: CreditCard,
    title: 'Payments',
    body: 'Payments may be processed by third-party payment providers. SUMMECA does not need to store your full payment card credentials when a payment provider handles the transaction. Payment providers may process data under their own privacy terms.',
  },
  {
    icon: Cookie,
    title: 'Cookies and similar technologies',
    body: 'We may use cookies or similar technologies for authentication, security, preferences, analytics, and core site functionality. You can control browser cookies through your browser settings, although some features may require them to work correctly.',
  },
  {
    icon: ShieldCheck,
    title: 'Security and retention',
    body: 'We use reasonable technical and organizational safeguards to protect personal information. We retain information only for as long as needed for operational, legal, security, accounting, and support purposes.',
  },
  {
    icon: LockKeyhole,
    title: 'Your choices and rights',
    body: 'Depending on your location, you may have rights to request access, correction, deletion, or other controls over your personal information. We may need to verify your identity before completing certain requests.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />

      <main>
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-background to-background">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-12 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-4xl px-6 py-20 text-center lg:px-8 lg:py-28">
            <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary">
              <ShieldCheck size={14} />
              Privacy & Data Protection
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Privacy Policy</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              This policy explains how SUMMECA handles personal information when you use our website, products, account services, and support channels.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">Last updated: September 8, 2026</p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="grid gap-5 md:grid-cols-2">
            {sections.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={19} />
                </div>
                <h2 className="text-lg font-bold">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 space-y-6 rounded-3xl border border-border bg-card p-7 sm:p-9">
            <div>
              <h2 className="text-xl font-bold">Service providers and disclosures</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                We may use trusted service providers for hosting, authentication, analytics, email delivery, payments, infrastructure, and support. We may also disclose information when required by law, to protect users or the platform, to investigate fraud or abuse, or as part of a legitimate business transfer.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold">International data processing</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                SUMMECA may use service providers in different countries. When information is processed internationally, we take reasonable steps to use appropriate safeguards consistent with applicable requirements.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold">Children's privacy</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                SUMMECA services are not intended for children who are not legally able to use the services in their jurisdiction. We do not knowingly seek to collect personal information from children contrary to applicable law.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold">Changes to this policy</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                We may update this Privacy Policy as our services, providers, or legal obligations change. The updated date on this page will reflect the latest revision.
              </p>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-primary/20 bg-primary/5 p-7 sm:flex sm:items-center sm:justify-between sm:gap-8">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Mail size={18} />
                <span className="text-sm font-semibold">Privacy questions</span>
              </div>
              <h2 className="mt-2 text-2xl font-bold">Contact SUMMECA</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                For privacy questions or data requests, contact us and include enough information for us to understand and verify your request. Never send passwords, verification codes, or private keys.
              </p>
            </div>
            <a
              href="mailto:hello@summeca.com?subject=SUMMECA%20Privacy%20Request"
              className="btn-primary mt-6 inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold sm:mt-0"
            >
              Email Privacy Team
              <ArrowRight size={15} />
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <Link href="/support" className="font-semibold text-primary hover:underline">Support Center</Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/" className="font-semibold text-primary hover:underline">Back to SUMMECA</Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
