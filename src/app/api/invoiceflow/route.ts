import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit, getRequestIdentity } from '@/lib/security/rateLimit';
import { getSaasAccess } from '@/lib/saas/access';

const PRODUCT_SLUG = 'summeca-invoiceflow' as const;
const MAX_TEXT = 4000;

type InvoiceItem = {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
};

function text(value: unknown, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function money(value: unknown, max = 1_000_000_000) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > max) return 0;
  return Math.round(number * 100) / 100;
}

function dateOnly(value: unknown): string | null {
  const valueText = text(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(valueText) ? valueText : null;
}

function normalizeCurrency(value: unknown) {
  const currency = text(value, 3).toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
}

function normalizeItems(value: unknown): InvoiceItem[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) return null;
  const items: InvoiceItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const description = text(record.description, 220);
    const quantity = money(record.quantity, 100_000);
    const rate = money(record.rate, 100_000_000);
    if (!description || quantity <= 0) return null;
    items.push({
      description,
      quantity,
      rate,
      amount: Math.round(quantity * rate * 100) / 100,
    });
  }
  return items;
}

async function sessionUser() {
  const session = await createClient();
  const { data: { user }, error } = await session.auth.getUser();
  return error ? null : user;
}

export async function GET(request: NextRequest) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const access = await getSaasAccess(user.id, PRODUCT_SLUG);
  if (!access.allowed) {
    return NextResponse.json({ error: 'InvoiceFlow purchase required.', access }, { status: 403 });
  }

  const service = createServiceClient();
  const [profileResult, clientsResult, invoicesResult, clientCountResult, invoiceCountResult] = await Promise.all([
    service.from('invoiceflow_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    service.from('invoiceflow_clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(300),
    service.from('invoiceflow_invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(300),
    service.from('invoiceflow_clients').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    service.from('invoiceflow_invoices').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);

  const firstError = profileResult.error || clientsResult.error || invoicesResult.error || clientCountResult.error || invoiceCountResult.error;
  if (firstError) {
    console.error('[invoiceflow] dashboard load failed:', firstError.message);
    return NextResponse.json({ error: 'Unable to load InvoiceFlow.' }, { status: 500 });
  }

  const invoices = invoicesResult.data ?? [];
  const outstanding = invoices
    .filter((invoice) => invoice.status === 'sent')
    .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const paid = invoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);

  return NextResponse.json({
    access,
    profile: profileResult.data,
    clients: clientsResult.data ?? [],
    invoices,
    counts: {
      clients: clientCountResult.count ?? 0,
      invoices: invoiceCountResult.count ?? 0,
      outstanding: Math.round(outstanding * 100) / 100,
      paid: Math.round(paid * 100) / 100,
    },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: NextRequest) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const access = await getSaasAccess(user.id, PRODUCT_SLUG);
  if (!access.allowed) {
    return NextResponse.json({ error: 'InvoiceFlow purchase required.', access }, { status: 403 });
  }

  const burst = await checkRateLimit(`invoiceflow:${getRequestIdentity(request, user.id)}`, {
    limit: 60,
    windowMs: 60_000,
  });
  if (!burst.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 100_000) return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const action = text(body.action, 40);
  const service = createServiceClient();

  if (action === 'save_profile') {
    const accent = text(body.accentHex, 7);
    const payload = {
      user_id: user.id,
      business_name: text(body.businessName, 160),
      legal_name: text(body.legalName, 160),
      email: text(body.email, 240),
      phone: text(body.phone, 80),
      website: text(body.website, 300),
      address: text(body.address, 800),
      logo_url: text(body.logoUrl, 1000),
      accent_hex: /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#0f9f95',
      currency: normalizeCurrency(body.currency),
      footer_note: text(body.footerNote, 500) || 'Thank you for your business.',
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await service.from('invoiceflow_profiles').upsert(payload, { onConflict: 'user_id' }).select('*').single();
    if (error) {
      console.error('[invoiceflow] profile save failed:', error.message);
      return NextResponse.json({ error: 'Unable to save business profile.' }, { status: 500 });
    }
    return NextResponse.json({ profile: data });
  }

  if (action === 'create_client') {
    const name = text(body.name, 160);
    if (!name) return NextResponse.json({ error: 'Client name is required.' }, { status: 400 });

    const { count, error: countError } = await service
      .from('invoiceflow_clients')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    if (countError) return NextResponse.json({ error: 'Unable to validate plan limits.' }, { status: 500 });
    if ((count ?? 0) >= (access.limits.maxClients ?? 0)) {
      return NextResponse.json({ error: `Your ${access.planName} plan client limit has been reached.` }, { status: 403 });
    }

    const { data, error } = await service.from('invoiceflow_clients').insert({
      user_id: user.id,
      name,
      company: text(body.company, 160),
      email: text(body.email, 240),
      phone: text(body.phone, 80),
      address: text(body.address, 800),
      notes: text(body.notes, MAX_TEXT),
    }).select('*').single();
    if (error) {
      console.error('[invoiceflow] client create failed:', error.message);
      return NextResponse.json({ error: 'Unable to create client.' }, { status: 500 });
    }
    return NextResponse.json({ client: data });
  }

  if (action === 'create_invoice') {
    const clientId = text(body.clientId, 60);
    const items = normalizeItems(body.items);
    if (!clientId || !items) return NextResponse.json({ error: 'A valid client and at least one invoice item are required.' }, { status: 400 });

    const [{ data: client }, invoiceCountResult] = await Promise.all([
      service.from('invoiceflow_clients').select('id').eq('id', clientId).eq('user_id', user.id).maybeSingle(),
      service.from('invoiceflow_invoices').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);
    if (!client) return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    if (invoiceCountResult.error) return NextResponse.json({ error: 'Unable to validate plan limits.' }, { status: 500 });
    if ((invoiceCountResult.count ?? 0) >= (access.limits.maxInvoices ?? 0)) {
      return NextResponse.json({ error: `Your ${access.planName} plan invoice limit has been reached.` }, { status: 403 });
    }

    const taxRate = Math.min(100, money(body.taxRate, 100));
    const subtotal = Math.round(items.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;
    const invoiceNumber = `INV-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const { data, error } = await service.from('invoiceflow_invoices').insert({
      user_id: user.id,
      client_id: clientId,
      invoice_number: invoiceNumber,
      issue_date: dateOnly(body.issueDate) || new Date().toISOString().slice(0, 10),
      due_date: dateOnly(body.dueDate),
      currency: normalizeCurrency(body.currency),
      items,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      notes: text(body.notes, MAX_TEXT),
      terms: text(body.terms, MAX_TEXT),
    }).select('*').single();
    if (error) {
      console.error('[invoiceflow] invoice create failed:', error.message);
      return NextResponse.json({ error: 'Unable to create invoice.' }, { status: 500 });
    }
    return NextResponse.json({ invoice: data });
  }

  if (action === 'update_status') {
    const invoiceId = text(body.invoiceId, 60);
    const status = text(body.status, 20);
    if (!['draft', 'sent', 'paid', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid invoice status.' }, { status: 400 });
    }
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status, updated_at: now };
    if (status === 'sent') patch.sent_at = now;
    if (status === 'paid') patch.paid_at = now;
    const { data, error } = await service.from('invoiceflow_invoices')
      .update(patch)
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .select('*')
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Invoice not found or could not be updated.' }, { status: 404 });
    return NextResponse.json({ invoice: data });
  }

  if (action === 'toggle_share') {
    const invoiceId = text(body.invoiceId, 60);
    const enabled = body.enabled === true;
    const { data, error } = await service.from('invoiceflow_invoices')
      .update({ share_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .select('id, share_token, share_enabled')
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    return NextResponse.json({ invoice: data, shareUrl: enabled ? `/invoice/${data.share_token}` : null });
  }

  return NextResponse.json({ error: 'Unknown InvoiceFlow action.' }, { status: 400 });
}
