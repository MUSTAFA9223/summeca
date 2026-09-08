import type { Metadata } from 'next';
import { Mail, LifeBuoy, ShieldCheck } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'Contact | SUMMECA',
  description: 'Contact SUMMECA for product, account, payment, and support questions.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="pt-[68px]">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-4xl px-6 py-16 text-center lg:px-8 lg:py-20">
            <p className="text-sm font-semibold text-primary">Contact SUMMECA</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">We’re here to help</h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">For product questions, account help, payment issues, or general inquiries, use the options below.</p>
          </div>
        </section>
        <section className="mx-auto grid max-w-5xl gap-5 px-6 py-14 md:grid-cols-3 lg:px-8 lg:py-16">
          <a href="mailto:hello@summeca.com" className="rounded-2xl border border-border bg-card p-6 transition hover:border-primary/30 hover:shadow-lg">
            <Mail className="text-primary" size={22} />
            <h2 className="mt-4 text-lg font-bold">Email</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">hello@summeca.com</p>
          </a>
          <a href="/support" className="rounded-2xl border border-border bg-card p-6 transition hover:border-primary/30 hover:shadow-lg">
            <LifeBuoy className="text-primary" size={22} />
            <h2 className="mt-4 text-lg font-bold">Support Center</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Get help with accounts, payments, downloads, and products.</p>
          </a>
          <div className="rounded-2xl border border-border bg-card p-6">
            <ShieldCheck className="text-primary" size={22} />
            <h2 className="mt-4 text-lg font-bold">Security note</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Never send passwords, verification codes, private keys, or full payment credentials by email.</p>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
