import type { Metadata } from 'next';
import { CheckCircle2, CircleDot } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export const metadata: Metadata = {
  title: 'System Status | SUMMECA',
  description: 'Current operational status information for SUMMECA services.',
};

const services = [
  'Website & Storefront',
  'Account & Authentication',
  'User Dashboard',
  'Product Delivery',
  'Checkout & Payments',
  'Support Center',
];

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="pt-[68px]">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-4xl px-6 py-16 text-center lg:px-8 lg:py-20">
            <p className="text-sm font-semibold text-primary">SUMMECA Status</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Service status</h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">This page provides a simple public view of SUMMECA service availability.</p>
          </div>
        </section>
        <section className="mx-auto max-w-4xl px-6 py-14 lg:px-8 lg:py-16">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-3">
              <CircleDot className="text-primary" size={20} />
              <div>
                <h2 className="font-bold">Status information</h2>
                <p className="mt-1 text-sm text-muted-foreground">Automated incident monitoring is not yet connected. If you experience a problem, contact support so we can investigate it.</p>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {services.map((service) => (
              <div key={service} className="flex items-center justify-between rounded-2xl border border-border bg-card p-5">
                <span className="text-sm font-semibold">{service}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CheckCircle2 size={14} className="text-primary" />
                  Check via support
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
