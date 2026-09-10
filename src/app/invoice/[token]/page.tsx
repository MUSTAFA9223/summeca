import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import AppLogo from '@/components/ui/AppLogo';

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

type Item = { description?: string; quantity?: number; rate?: number; amount?: number };

export default async function SharedInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();

  const service = createServiceClient();
  const { data: invoice } = await service
    .from('invoiceflow_invoices')
    .select('invoice_number, issue_date, due_date, status, currency, items, subtotal, tax_rate, tax_amount, total, notes, terms, user_id, client_id')
    .eq('share_token', token)
    .eq('share_enabled', true)
    .maybeSingle();

  if (!invoice) notFound();

  const [{ data: profile }, { data: client }] = await Promise.all([
    service.from('invoiceflow_profiles').select('business_name, legal_name, email, phone, website, address, logo_url, accent_hex, footer_note').eq('user_id', invoice.user_id).maybeSingle(),
    service.from('invoiceflow_clients').select('name, company, email, phone, address').eq('id', invoice.client_id).eq('user_id', invoice.user_id).maybeSingle(),
  ]);

  if (!client) notFound();
  const items = Array.isArray(invoice.items) ? invoice.items as Item[] : [];
  const accent = /^#[0-9a-fA-F]{6}$/.test(profile?.accent_hex || '') ? profile!.accent_hex : '#0f9f95';

  return (
    <main className="min-h-screen bg-[#f5f7f8] px-4 py-10 text-slate-900 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10 print:max-w-none print:border-0 print:shadow-none">
        <div className="flex flex-col gap-8 border-b border-slate-200 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="Business logo" className="mb-4 h-14 max-w-48 object-contain object-left" />
            ) : (
              <div className="mb-4"><AppLogo variant="wordmark" size={36} /></div>
            )}
            <h1 className="text-2xl font-black">{profile?.business_name || profile?.legal_name || 'Business'}</h1>
            <div className="mt-2 space-y-0.5 whitespace-pre-line text-sm text-slate-500">
              {profile?.address && <p>{profile.address}</p>}
              {profile?.email && <p>{profile.email}</p>}
              {profile?.phone && <p>{profile.phone}</p>}
              {profile?.website && <p>{profile.website}</p>}
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>Invoice</p>
            <p className="mt-2 text-2xl font-black">{invoice.invoice_number}</p>
            <p className="mt-2 text-sm text-slate-500">Issue date: {invoice.issue_date}</p>
            {invoice.due_date && <p className="text-sm text-slate-500">Due date: {invoice.due_date}</p>}
            <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase">{invoice.status}</span>
          </div>
        </div>

        <section className="py-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Bill to</p>
          <h2 className="mt-2 text-lg font-bold">{client.name}</h2>
          {client.company && <p className="text-sm text-slate-600">{client.company}</p>}
          <div className="mt-2 whitespace-pre-line text-sm text-slate-500">
            {client.address && <p>{client.address}</p>}
            {client.email && <p>{client.email}</p>}
            {client.phone && <p>{client.phone}</p>}
          </div>
        </section>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Rate</th><th className="px-4 py-3 text-right">Amount</th></tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.description}-${index}`} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{item.description || 'Item'}</td>
                  <td className="px-4 py-3 text-right">{Number(item.quantity || 0)}</td>
                  <td className="px-4 py-3 text-right">{money(Number(item.rate || 0), invoice.currency)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{money(Number(item.amount || 0), invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ml-auto mt-6 max-w-sm space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{money(Number(invoice.subtotal), invoice.currency)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Tax ({Number(invoice.tax_rate)}%)</span><span>{money(Number(invoice.tax_amount), invoice.currency)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-black"><span>Total</span><span style={{ color: accent }}>{money(Number(invoice.total), invoice.currency)}</span></div>
        </div>

        {(invoice.notes || invoice.terms) && (
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {invoice.notes && <div><h3 className="text-sm font-bold">Notes</h3><p className="mt-1 whitespace-pre-line text-sm text-slate-500">{invoice.notes}</p></div>}
            {invoice.terms && <div><h3 className="text-sm font-bold">Terms</h3><p className="mt-1 whitespace-pre-line text-sm text-slate-500">{invoice.terms}</p></div>}
          </div>
        )}

        <p className="mt-10 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">{profile?.footer_note || 'Thank you for your business.'}</p>
        <p className="mt-2 text-center text-xs text-slate-400 print:hidden">Use your browser Print command to print or save this invoice as PDF.</p>
      </div>
    </main>
  );
}
