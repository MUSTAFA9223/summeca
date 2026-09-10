const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const schema = fs.readFileSync('supabase/migrations/20260910125000_invoiceflow_leadfollow_saas.sql', 'utf8');
const quota = fs.readFileSync('supabase/migrations/20260910125100_leadfollow_ai_quota.sql', 'utf8');
const skipDownloads = fs.readFileSync('supabase/migrations/20260910125200_skip_saas_download_entitlements.sql', 'utf8');
const access = fs.readFileSync('src/lib/saas/access.ts', 'utf8');
const invoiceApi = fs.readFileSync('src/app/api/invoiceflow/route.ts', 'utf8');
const leadApi = fs.readFileSync('src/app/api/leadfollow/route.ts', 'utf8');
const leadGenerate = fs.readFileSync('src/app/api/leadfollow/generate/route.ts', 'utf8');
const sidebar = fs.readFileSync('src/app/user-dashboard/components/DashboardSidebar.tsx', 'utf8');

test('SaaS tables are private to trusted server code', () => {
  for (const table of [
    'invoiceflow_profiles', 'invoiceflow_clients', 'invoiceflow_invoices',
    'leadfollow_profiles', 'leadfollow_leads', 'leadfollow_messages', 'leadfollow_usage',
  ]) {
    assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(schema, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`, 'i'));
    assert.match(schema, new RegExp(`grant all on table public\\.${table} to service_role`, 'i'));
  }
});

test('new SaaS products seed as draft lifetime offers with intended prices', () => {
  assert.match(schema, /'SUMMECA InvoiceFlow'/);
  assert.match(schema, /'summeca-invoiceflow'/);
  assert.match(schema, /'SUMMECA LeadFollow AI'/);
  assert.match(schema, /'summeca-leadfollow-ai'/);
  assert.match(schema, /'draft'::product_status/g);
  assert.match(schema, /'lifetime'::plan_billing_period/);
  for (const price of [49, 89, 149, 59, 99, 129]) {
    assert.match(schema, new RegExp(`${price}::numeric`));
  }
});

test('SaaS application access requires a verified completed order', () => {
  assert.match(access, /from\('orders'\)/);
  assert.match(access, /\.eq\('user_id', userId\)/);
  assert.match(access, /\.eq\('product_id', product\.id\)/);
  assert.match(access, /\.eq\('status', 'completed'\)/);
  assert.match(access, /summeca-invoiceflow/);
  assert.match(access, /summeca-leadfollow-ai/);
});

test('InvoiceFlow API authenticates, checks paid access and enforces plan limits server-side', () => {
  assert.match(invoiceApi, /auth\.getUser\(\)/);
  assert.match(invoiceApi, /getSaasAccess\(user\.id, PRODUCT_SLUG\)/);
  assert.match(invoiceApi, /createServiceClient\(\)/);
  assert.match(invoiceApi, /maxClients/);
  assert.match(invoiceApi, /maxInvoices/);
  assert.match(invoiceApi, /\.eq\('user_id', user\.id\)/);
  assert.match(invoiceApi, /subtotal = Math\.round/);
  assert.match(invoiceApi, /taxAmount = Math\.round/);
});

test('LeadFollow CRM API authenticates and enforces paid lead limits', () => {
  assert.match(leadApi, /auth\.getUser\(\)/);
  assert.match(leadApi, /getSaasAccess\(user\.id, PRODUCT_SLUG\)/);
  assert.match(leadApi, /maxLeads/);
  assert.match(leadApi, /\.eq\('user_id', user\.id\)/);
});

test('LeadFollow AI reserves quota atomically and forbids fabricated sales claims', () => {
  assert.match(quota, /reserve_leadfollow_ai_request/);
  assert.match(quota, /requests_count < p_limit/);
  assert.match(quota, /grant execute on function public\.reserve_leadfollow_ai_request.*service_role/i);
  assert.match(leadGenerate, /reserve_leadfollow_ai_request/);
  assert.match(leadGenerate, /Never invent testimonials, results, discounts, deadlines, guarantees, credentials, relationships, or product facts/);
  assert.match(leadGenerate, /Never claim the recipient visited, opened, clicked, requested, or agreed/);
  assert.match(leadGenerate, /generateText\(/);
});

test('lifetime SaaS does not create a fake blank download entitlement', () => {
  assert.match(skipDownloads, /saas_product/);
  assert.match(skipDownloads, /if coalesce\(v_is_saas, false\) then\s+return null/i);
});

test('customer dashboard exposes both paid SaaS workspaces', () => {
  assert.match(sidebar, /SUMMECA Apps/);
  assert.match(sidebar, /\/user-dashboard\/invoiceflow/);
  assert.match(sidebar, /\/user-dashboard\/leadfollow/);
  assert.ok(fs.existsSync('src/app/user-dashboard/invoiceflow/page.tsx'));
  assert.ok(fs.existsSync('src/app/user-dashboard/leadfollow/page.tsx'));
  assert.ok(fs.existsSync('src/app/invoice/[token]/page.tsx'));
});
