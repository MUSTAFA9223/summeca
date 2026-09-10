import type { Metadata } from 'next';
import { AlertTriangle, CheckCircle2, CircleDot } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/server';
import { getPayoneerReadiness } from '@/lib/payment/providers/payoneer';
import { getFastSpringReadiness } from '@/lib/payment/providers/fastspring';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'System status',
  description: 'Current live configuration and service checks for SUMMECA.',
};

type Check = { name: string; ok: boolean; detail: string };

export default async function StatusPage() {
  const supabase = await createClient();
  const { error: dbError } = await supabase.from('products').select('id').limit(1);
  const payoneer = getPayoneerReadiness();
  const fastspring = getFastSpringReadiness();
  const cryptoConfigured = Boolean(
    process.env.NOWPAYMENTS_API_KEY?.trim()
    && process.env.NOWPAYMENTS_IPN_SECRET?.trim()
    && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );

  const checks: Check[] = [
    { name: 'Website & Storefront', ok: true, detail: 'This status page rendered successfully.' },
    { name: 'Database connection', ok: !dbError, detail: dbError ? 'A live database query failed.' : 'A live catalog query succeeded.' },
    { name: 'Payoneer configuration', ok: payoneer.configured && payoneer.environment === 'live', detail: payoneer.configured ? (payoneer.environment === 'live' ? 'Live configuration is present.' : 'Configured in sandbox mode; not offered as production checkout.') : 'Required server configuration is incomplete.' },
    { name: 'Crypto / NOWPayments configuration', ok: cryptoConfigured, detail: cryptoConfigured ? 'Required server configuration is present.' : 'Required server configuration is incomplete.' },
    { name: 'FastSpring configuration', ok: fastspring.configured && fastspring.live, detail: fastspring.configured ? (fastspring.live ? 'Live configuration is present.' : 'Configured in test mode; not offered as production checkout.') : 'Required server configuration is incomplete.' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav />
      <main className="pt-[68px]">
        <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
          <div className="mx-auto max-w-4xl px-6 py-16 text-center lg:px-8 lg:py-20">
            <p className="text-sm font-semibold text-primary">SUMMECA Status</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Current service checks</h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">These checks are generated on request from the current application and server configuration. They do not claim historical uptime or an SLA.</p>
          </div>
        </section>
        <section className="mx-auto max-w-4xl px-6 py-14 lg:px-8 lg:py-16">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <div className="flex gap-3"><AlertTriangle size={19} className="mt-0.5 shrink-0" /><div><h2 className="font-bold">External uptime monitoring</h2><p className="mt-1 text-sm">Independent scheduled monitoring and incident history are not connected yet. Until they are, this page is a live readiness check rather than an uptime-history service.</p></div></div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {checks.map((check) => (
              <div key={check.name} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3"><span className="text-sm font-semibold">{check.name}</span>{check.ok ? <CheckCircle2 size={17} className="shrink-0 text-success" /> : <CircleDot size={17} className="shrink-0 text-amber-500" />}</div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{check.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
