'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FilePlus2,
  Mail,
  Plus,
  ReceiptText,
  RefreshCw,
  Send,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/app/user-dashboard/components/DashboardLayout';

type Access = { allowed: boolean; planName: string | null; purchasePath: string; limits: { maxClients?: number; maxInvoices?: number } };
type Profile = { business_name: string; legal_name: string; email: string; phone: string; website: string; address: string; logo_url: string; accent_hex: string; currency: string; footer_note: string };
type Client = { id: string; name: string; company: string; email: string; phone: string; address: string; notes: string; created_at: string };
type InvoiceItem = { description: string; quantity: number; rate: number; amount: number };
type Invoice = { id: string; client_id: string; invoice_number: string; issue_date: string; due_date: string | null; status: 'draft' | 'sent' | 'paid' | 'cancelled'; currency: string; items: InvoiceItem[]; subtotal: number; tax_rate: number; tax_amount: number; total: number; notes: string; terms: string; share_token: string; share_enabled: boolean; created_at: string };
type DashboardData = { access: Access; profile: Profile | null; clients: Client[]; invoices: Invoice[]; counts: { clients: number; invoices: number; outstanding: number; paid: number } };
type ProposalHandoff = { proposalId: string; clientName: string; clientCompany: string; clientEmail: string; description: string; amount: number; notes: string };
type Metric = [label: string, value: string | number, icon: LucideIcon];

function formatMoney(value: number, currency = 'USD') {
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value); }
  catch { return `${currency} ${Number(value || 0).toFixed(2)}`; }
}

function csvCell(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function localDateInDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function isInvoiceOverdue(invoice: Invoice) {
  return invoice.status === 'sent'
    && Boolean(invoice.due_date)
    && new Date(`${invoice.due_date}T23:59:59`).getTime() < Date.now();
}

function invoiceDisplayStatus(invoice: Invoice) {
  return isInvoiceOverdue(invoice) ? 'overdue' : invoice.status;
}

const emptyProfile: Profile = {
  business_name: '', legal_name: '', email: '', phone: '', website: '', address: '', logo_url: '', accent_hex: '#0f9f95', currency: 'USD', footer_note: 'Thank you for your business.',
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-xs font-semibold text-foreground">{children}</span>;
}

export default function InvoiceFlowPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeAction, setActiveAction] = useState('');
  const [forbidden, setForbidden] = useState<Access | null>(null);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [showClientForm, setShowClientForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [createInvoiceAfterClient, setCreateInvoiceAfterClient] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', company: '', email: '', phone: '', address: '', notes: '' });
  const [invoiceForm, setInvoiceForm] = useState({ clientId: '', dueDate: '', taxRate: '0', notes: '', terms: '' });
  const [items, setItems] = useState([{ description: '', quantity: 1, rate: 0 }]);
  const [proposalHandoff, setProposalHandoff] = useState<ProposalHandoff | null>(null);
  const [handoffApplied, setHandoffApplied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/invoiceflow', { cache: 'no-store' });
      const payload = await response.json();
      if (response.status === 403) {
        setForbidden(payload.access ?? { allowed: false, planName: null, purchasePath: '/products/summeca-invoiceflow', limits: {} });
        setData(null);
        return;
      }
      if (!response.ok) throw new Error(payload.error || 'Unable to load InvoiceFlow.');
      setForbidden(null);
      setData(payload);
      setProfile(payload.profile ? { ...emptyProfile, ...payload.profile } : emptyProfile);
      if (payload.clients?.[0]?.id) {
        setInvoiceForm((current) => current.clientId ? current : { ...current, clientId: payload.clients[0].id });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load InvoiceFlow.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('source') !== 'proposalflow') return;
    const amount = Number(params.get('amount') || 0);
    setProposalHandoff({
      proposalId: params.get('proposalId') || '',
      clientName: params.get('clientName') || '',
      clientCompany: params.get('clientCompany') || '',
      clientEmail: params.get('clientEmail') || '',
      description: params.get('description') || 'Professional services',
      amount: Number.isFinite(amount) && amount >= 0 ? amount : 0,
      notes: params.get('notes') || '',
    });
  }, []);

  useEffect(() => {
    if (!data || !proposalHandoff || handoffApplied) return;

    const email = proposalHandoff.clientEmail.trim().toLowerCase();
    const existingClient = data.clients.find((client) =>
      (email && client.email?.trim().toLowerCase() === email)
      || (
        client.name.trim().toLowerCase() === proposalHandoff.clientName.trim().toLowerCase()
        && client.company.trim().toLowerCase() === proposalHandoff.clientCompany.trim().toLowerCase()
      )
    );

    setItems([{
      description: proposalHandoff.description || 'Professional services',
      quantity: 1,
      rate: proposalHandoff.amount,
    }]);
    setInvoiceForm((current) => ({
      ...current,
      clientId: existingClient?.id || '',
      dueDate: current.dueDate || localDateInDays(7),
      notes: proposalHandoff.notes,
    }));

    if (existingClient) {
      setCreateInvoiceAfterClient(false);
      setShowInvoiceForm(true);
      toast.success('Proposal details loaded into a new invoice.');
    } else {
      setClientForm({
        name: proposalHandoff.clientName,
        company: proposalHandoff.clientCompany,
        email: proposalHandoff.clientEmail,
        phone: '',
        address: '',
        notes: proposalHandoff.proposalId ? `Created from ProposalFlow proposal ${proposalHandoff.proposalId}` : 'Created from ProposalFlow',
      });
      setCreateInvoiceAfterClient(true);
      setShowClientForm(true);
      setShowInvoiceForm(false);
      toast.info('Save this client to continue the ProposalFlow invoice handoff.');
    }
    setHandoffApplied(true);
  }, [data, handoffApplied, proposalHandoff]);

  const clientById = useMemo(() => Object.fromEntries((data?.clients ?? []).map((client) => [client.id, client])), [data?.clients]);
  const overdueCount = useMemo(() => (data?.invoices ?? []).filter(isInvoiceOverdue).length, [data?.invoices]);
  const metrics = useMemo<Metric[]>(() => data ? [
    ['Clients', data.counts.clients, Users],
    ['Invoices', data.counts.invoices, ReceiptText],
    ['Overdue', overdueCount, Clock3],
    ['Outstanding', formatMoney(data.counts.outstanding, profile.currency), BarChart3],
    ['Paid', formatMoney(data.counts.paid, profile.currency), CheckCircle2],
  ] : [], [data, overdueCount, profile.currency]);

  async function post(body: Record<string, unknown>) {
    const response = await fetch('/api/invoiceflow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'InvoiceFlow action failed.');
    return payload;
  }

  function startInvoice() {
    if (!data?.clients.length) {
      setCreateInvoiceAfterClient(true);
      setShowClientForm(true);
      setShowInvoiceForm(false);
      toast.info('Add your first client, then InvoiceFlow will take you straight to the invoice builder.');
      return;
    }
    setCreateInvoiceAfterClient(false);
    setInvoiceForm((current) => ({
      ...current,
      clientId: current.clientId || data.clients[0].id,
      dueDate: current.dueDate || localDateInDays(7),
    }));
    setShowInvoiceForm(true);
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await post({ action: 'save_profile', businessName: profile.business_name, legalName: profile.legal_name, email: profile.email, phone: profile.phone, website: profile.website, address: profile.address, logoUrl: profile.logo_url, accentHex: profile.accent_hex, currency: profile.currency, footerNote: profile.footer_note });
      toast.success('Business profile saved.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function createClient(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = await post({ action: 'create_client', ...clientForm });
      setClientForm({ name: '', company: '', email: '', phone: '', address: '', notes: '' });
      setShowClientForm(false);
      if (createInvoiceAfterClient && payload.client?.id) {
        setInvoiceForm((current) => ({ ...current, clientId: payload.client.id, dueDate: current.dueDate || localDateInDays(7) }));
        setShowInvoiceForm(true);
        setCreateInvoiceAfterClient(false);
        toast.success('Client added. Your invoice is ready to complete.');
      } else {
        toast.success('Client added.');
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to add client.');
    } finally {
      setSaving(false);
    }
  }

  async function createInvoice(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await post({ action: 'create_invoice', clientId: invoiceForm.clientId, dueDate: invoiceForm.dueDate || null, issueDate: new Date().toISOString().slice(0, 10), currency: profile.currency || 'USD', taxRate: Number(invoiceForm.taxRate || 0), notes: invoiceForm.notes, terms: invoiceForm.terms, items });
      setInvoiceForm((current) => ({ ...current, dueDate: '', taxRate: '0', notes: '', terms: '' }));
      setItems([{ description: '', quantity: 1, rate: 0 }]);
      setShowInvoiceForm(false);
      toast.success('Invoice created.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create invoice.');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(invoiceId: string, status: Invoice['status']) {
    const key = `status:${invoiceId}:${status}`;
    if (activeAction) return;
    setActiveAction(key);
    try {
      await post({ action: 'update_status', invoiceId, status });
      toast.success(`Invoice marked ${status}.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update invoice.');
    } finally {
      setActiveAction('');
    }
  }

  async function openShare(invoice: Invoice) {
    const key = `share:${invoice.id}`;
    if (activeAction) return;
    setActiveAction(key);
    try {
      const payload = await post({ action: 'toggle_share', invoiceId: invoice.id, enabled: true });
      const url = payload.shareUrl || `/invoice/${invoice.share_token}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('Secure invoice view opened. You can print or save it as PDF.');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to open invoice view.');
    } finally {
      setActiveAction('');
    }
  }

  function sendReminder(invoice: Invoice) {
    const client = clientById[invoice.client_id];
    if (!client?.email) { toast.error('Add an email address to this client first.'); return; }
    const subject = encodeURIComponent(`Invoice ${invoice.invoice_number} — ${formatMoney(Number(invoice.total), invoice.currency)}`);
    const shareLine = invoice.share_enabled ? `\nInvoice: ${window.location.origin}/invoice/${invoice.share_token}` : '';
    const body = encodeURIComponent(`Hi ${client.name},\n\nA quick reminder about invoice ${invoice.invoice_number} for ${formatMoney(Number(invoice.total), invoice.currency)}${invoice.due_date ? `, due ${invoice.due_date}` : ''}.${shareLine}\n\nPlease let me know if you have any questions.\n\nThank you,\n${profile.business_name || 'Your business'}`);
    window.location.href = `mailto:${encodeURIComponent(client.email)}?subject=${subject}&body=${body}`;
  }

  function exportCsv() {
    if (!data?.invoices.length) { toast.error('There are no invoices to export.'); return; }
    const rows = [['Invoice', 'Client', 'Status', 'Issue date', 'Due date', 'Subtotal', 'Tax', 'Total', 'Currency'], ...data.invoices.map((invoice) => [invoice.invoice_number, clientById[invoice.client_id]?.name || '', invoiceDisplayStatus(invoice), invoice.issue_date, invoice.due_date || '', invoice.subtotal, invoice.tax_amount, invoice.total, invoice.currency])];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `invoiceflow-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading && !data && !forbidden) return (
    <DashboardLayout activeRoute="invoiceflow">
      <div className="space-y-7" aria-busy="true" aria-label="Loading InvoiceFlow">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"><ReceiptText size={15} /> SUMMECA SaaS</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight">InvoiceFlow</h1>
            <p className="mt-2 text-sm text-muted-foreground">Preparing your invoicing workspace…</p>
          </div>
          <div className="h-10 w-40 animate-pulse rounded-xl bg-primary/10" />
        </header>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />)}
        </section>
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
          <div className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
        </section>
        <p className="sr-only" role="status">Loading InvoiceFlow...</p>
      </div>
    </DashboardLayout>
  );

  if (forbidden) return (
    <DashboardLayout activeRoute="invoiceflow">
      <div className="mx-auto max-w-3xl py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ReceiptText size={30} /></div>
        <h1 className="mt-6 text-3xl font-black">InvoiceFlow is ready when you are</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">Purchase a lifetime InvoiceFlow plan once, then create clients and invoices directly from your SUMMECA account.</p>
        <Link href={forbidden.purchasePath || '/products/summeca-invoiceflow'} className="btn-primary mt-7 inline-flex items-center gap-2 px-6 py-3">View InvoiceFlow plans <ExternalLink size={15} /></Link>
      </div>
    </DashboardLayout>
  );

  if (!data) return <DashboardLayout activeRoute="invoiceflow"><div className="p-8 text-center text-muted-foreground">InvoiceFlow could not be loaded.</div></DashboardLayout>;

  return (
    <DashboardLayout activeRoute="invoiceflow">
      <div className="space-y-7" aria-busy={loading}>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary"><ReceiptText size={15} /> SUMMECA SaaS</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight">InvoiceFlow</h1>
            <p className="mt-2 text-sm text-muted-foreground">Create, track, share, print and export professional invoices from one workspace.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-2 text-xs font-bold text-primary">{data.access.planName} · {data.access.planName === 'Free' ? 'Free tier' : 'Lifetime'}</span>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold"><Download size={15} /> Export CSV</button>
            <button onClick={startInvoice} className="btn-primary inline-flex items-center gap-2 px-4 py-2"><FilePlus2 size={15} /> New invoice</button>
          </div>
        </header>

        {proposalHandoff && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <span className="font-bold text-primary">ProposalFlow handoff:</span> client and service details are prefilled below. Review them before creating the invoice.
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map(([label, value, Icon]) => (
            <div key={label} className={`rounded-2xl border bg-card p-5 ${label === 'Overdue' && overdueCount > 0 ? 'border-destructive/30' : 'border-border'}`}>
              <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon size={18} className={label === 'Overdue' && overdueCount > 0 ? 'text-destructive' : 'text-primary'} /></div>
              <div className={`mt-2 text-2xl font-black ${label === 'Overdue' && overdueCount > 0 ? 'text-destructive' : ''}`}>{value}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={saveProfile} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2"><Building2 size={18} className="text-primary" /><h2 className="font-bold">Business profile</h2></div>
            <p className="mt-1 text-xs text-muted-foreground">This information appears on shared invoices.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label><FieldLabel>Business name</FieldLabel><input className="form-input w-full" placeholder="Business name" value={profile.business_name} onChange={(e) => setProfile({ ...profile, business_name: e.target.value })} /></label>
              <label><FieldLabel>Legal name</FieldLabel><input className="form-input w-full" placeholder="Legal name" value={profile.legal_name} onChange={(e) => setProfile({ ...profile, legal_name: e.target.value })} /></label>
              <label><FieldLabel>Billing email</FieldLabel><input className="form-input w-full" type="email" placeholder="Billing email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></label>
              <label><FieldLabel>Phone</FieldLabel><input className="form-input w-full" placeholder="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></label>
              <label className="sm:col-span-2"><FieldLabel>Website</FieldLabel><input className="form-input w-full" placeholder="https://example.com" value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} /></label>
              <label className="sm:col-span-2"><FieldLabel>Business address</FieldLabel><textarea className="form-input w-full" placeholder="Business address" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></label>
              <label className="sm:col-span-2"><FieldLabel>Logo URL (optional)</FieldLabel><input className="form-input w-full" placeholder="Logo URL" value={profile.logo_url} onChange={(e) => setProfile({ ...profile, logo_url: e.target.value })} /></label>
              <label><FieldLabel>Currency</FieldLabel><select className="form-input w-full" value={profile.currency} onChange={(e) => setProfile({ ...profile, currency: e.target.value })}><option>USD</option><option>EUR</option><option>GBP</option><option>AED</option><option>SAR</option></select></label>
              <label><FieldLabel>Invoice accent color</FieldLabel><input className="form-input h-11 w-full" type="color" value={profile.accent_hex} onChange={(e) => setProfile({ ...profile, accent_hex: e.target.value })} /></label>
              <label className="sm:col-span-2"><FieldLabel>Invoice footer note</FieldLabel><input className="form-input w-full" placeholder="Invoice footer note" value={profile.footer_note} onChange={(e) => setProfile({ ...profile, footer_note: e.target.value })} /></label>
            </div>
            <button disabled={saving} className="btn-primary mt-4 px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving…' : 'Save business profile'}</button>
          </form>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="font-bold">Clients</h2><p className="mt-1 text-xs text-muted-foreground">{data.counts.clients} / {data.access.limits.maxClients ?? '—'} plan limit</p></div>
              <button onClick={() => { setCreateInvoiceAfterClient(false); setShowClientForm((value) => !value); }} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-bold"><Plus size={14} /> Add client</button>
            </div>
            {showClientForm && (
              <form onSubmit={createClient} className="mt-4 grid gap-3 rounded-xl bg-secondary/40 p-4 sm:grid-cols-2">
                <label><FieldLabel>Client name</FieldLabel><input required className="form-input w-full" placeholder="Client name" value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} /></label>
                <label><FieldLabel>Company</FieldLabel><input className="form-input w-full" placeholder="Company" value={clientForm.company} onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })} /></label>
                <label><FieldLabel>Email</FieldLabel><input type="email" className="form-input w-full" placeholder="Email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} /></label>
                <label><FieldLabel>Phone</FieldLabel><input className="form-input w-full" placeholder="Phone" value={clientForm.phone} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} /></label>
                <label className="sm:col-span-2"><FieldLabel>Address</FieldLabel><textarea className="form-input w-full" placeholder="Address" value={clientForm.address} onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })} /></label>
                {createInvoiceAfterClient && <p className="sm:col-span-2 text-xs font-semibold text-primary">Quick start: after saving this client, the invoice builder will open automatically with a 7-day due date.</p>}
                <button disabled={saving} className="btn-primary sm:col-span-2 py-2.5 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving client…' : 'Save client'}</button>
              </form>
            )}
            <div className="mt-4 max-h-[410px] space-y-2 overflow-auto">
              {data.clients.length ? data.clients.map((client) => (
                <div key={client.id} className="rounded-xl border border-border p-3"><div className="font-semibold">{client.name}</div><div className="text-xs text-muted-foreground">{client.company || 'No company'}{client.email ? ` · ${client.email}` : ''}</div></div>
              )) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
                  <Users size={26} className="mx-auto text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-bold text-foreground">No clients yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Add a client before creating an invoice.</p>
                  <button type="button" onClick={() => { setCreateInvoiceAfterClient(false); setShowClientForm(true); }} className="btn-primary mt-4 px-4 py-2 text-xs">Add your first client</button>
                </div>
              )}
            </div>
          </div>
        </section>

        {showInvoiceForm && (
          <section className="rounded-2xl border border-primary/25 bg-card p-6">
            <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold">Create invoice</h2><p className="text-xs text-muted-foreground">Client selected, 7-day due date suggested, and totals are verified again on the server before saving.</p></div><button type="button" onClick={() => setShowInvoiceForm(false)} className="text-sm text-muted-foreground hover:text-foreground">Close</button></div>
            <form onSubmit={createInvoice} className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <label><FieldLabel>Client</FieldLabel><select required className="form-input w-full" value={invoiceForm.clientId} onChange={(e) => setInvoiceForm({ ...invoiceForm, clientId: e.target.value })}><option value="">Choose client</option>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.company ? ` — ${client.company}` : ''}</option>)}</select></label>
                <label><FieldLabel>Due date</FieldLabel><input className="form-input w-full" type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} /></label>
                <label><FieldLabel>Tax %</FieldLabel><input className="form-input w-full" type="number" min="0" max="100" step="0.01" placeholder="0" value={invoiceForm.taxRate} onChange={(e) => setInvoiceForm({ ...invoiceForm, taxRate: e.target.value })} /></label>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_110px_140px_40px]">
                    <label><span className="sr-only">Item description</span><input required className="form-input w-full" placeholder="Item description" value={item.description} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, description: e.target.value } : row))} /></label>
                    <label><span className="sr-only">Quantity</span><input required className="form-input w-full" type="number" min="0.01" step="0.01" placeholder="Qty" value={item.quantity} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, quantity: Number(e.target.value) } : row))} /></label>
                    <label><span className="sr-only">Rate</span><input required className="form-input w-full" type="number" min="0" step="0.01" placeholder="Rate" value={item.rate} onChange={(e) => setItems(items.map((row, i) => i === index ? { ...row, rate: Number(e.target.value) } : row))} /></label>
                    <button type="button" aria-label={`Remove line item ${index + 1}`} disabled={items.length === 1} onClick={() => setItems(items.filter((_, i) => i !== index))} className="rounded-lg border border-border text-muted-foreground disabled:opacity-40">×</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setItems([...items, { description: '', quantity: 1, rate: 0 }])} className="inline-flex items-center gap-1 text-xs font-bold text-primary"><Plus size={13} /> Add line item</button>
              <div className="grid gap-3 sm:grid-cols-2">
                <label><FieldLabel>Notes</FieldLabel><textarea className="form-input w-full" placeholder="Notes" value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} /></label>
                <label><FieldLabel>Terms</FieldLabel><textarea className="form-input w-full" placeholder="Terms" value={invoiceForm.terms} onChange={(e) => setInvoiceForm({ ...invoiceForm, terms: e.target.value })} /></label>
              </div>
              <div className="rounded-xl bg-secondary/40 px-4 py-3 text-right text-sm font-bold">Draft total: {formatMoney(items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0) * (1 + (Number(invoiceForm.taxRate) || 0) / 100), profile.currency)}</div>
              <button disabled={saving || !data.clients.length} className="btn-primary px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Creating invoice…' : 'Create invoice'}</button>
            </form>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Invoices</h2><p className="mt-1 text-xs text-muted-foreground">{overdueCount} currently overdue among loaded invoices · {data.counts.invoices} / {data.access.limits.maxInvoices ?? '—'} plan limit</p></div></div>
          {data.invoices.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-muted-foreground"><tr><th className="py-3 pr-4">Invoice</th><th className="py-3 pr-4">Client</th><th className="py-3 pr-4">Due</th><th className="py-3 pr-4">Total</th><th className="py-3 pr-4">Status</th><th className="py-3">Actions</th></tr></thead>
                <tbody>
                  {data.invoices.map((invoice) => {
                    const overdue = isInvoiceOverdue(invoice);
                    const displayStatus = invoiceDisplayStatus(invoice);
                    const rowBusy = activeAction.includes(invoice.id);
                    return (
                      <tr key={invoice.id} className={`border-b border-border/60 ${overdue ? 'bg-destructive/[0.025]' : ''}`}>
                        <td className="py-3 pr-4 font-semibold">{invoice.invoice_number}</td>
                        <td className="py-3 pr-4">{clientById[invoice.client_id]?.name || 'Client'}</td>
                        <td className={`py-3 pr-4 ${overdue ? 'font-bold text-destructive' : ''}`}>{invoice.due_date || '—'}{overdue && <span className="ml-2 text-[10px] uppercase tracking-wide">Overdue</span>}</td>
                        <td className="py-3 pr-4 font-bold">{formatMoney(Number(invoice.total), invoice.currency)}</td>
                        <td className="py-3 pr-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${overdue ? 'bg-destructive/10 text-destructive' : 'bg-secondary'}`}>{displayStatus}</span></td>
                        <td className="py-3"><div className="flex flex-wrap gap-2">
                          <button disabled={Boolean(activeAction)} onClick={() => openShare(invoice)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50">{activeAction === `share:${invoice.id}` ? <RefreshCw size={12} className="animate-spin" /> : <ExternalLink size={12} />} {activeAction === `share:${invoice.id}` ? 'Opening…' : 'View/PDF'}</button>
                          {invoice.status !== 'paid' && <button disabled={rowBusy} onClick={() => sendReminder(invoice)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"><Mail size={12} /> Reminder</button>}
                          {invoice.status === 'draft' && <button disabled={Boolean(activeAction)} onClick={() => updateStatus(invoice.id, 'sent')} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"><Send size={12} /> {activeAction === `status:${invoice.id}:sent` ? 'Updating…' : 'Sent'}</button>}
                          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && <button disabled={Boolean(activeAction)} onClick={() => updateStatus(invoice.id, 'paid')} className="rounded-lg bg-success/10 px-2.5 py-1.5 text-xs font-bold text-success disabled:opacity-50">{activeAction === `status:${invoice.id}:paid` ? 'Updating…' : 'Mark paid'}</button>}
                        </div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-12 text-center">
              <ReceiptText size={28} className="mx-auto text-muted-foreground/50" />
              <p className="mt-3 text-sm font-bold text-foreground">No invoices yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Create an invoice when you are ready to bill your first client.</p>
              <button type="button" onClick={startInvoice} className="btn-primary mt-4 px-4 py-2 text-xs">Create your first invoice</button>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
