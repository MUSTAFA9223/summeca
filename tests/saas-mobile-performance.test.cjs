const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const invoiceRoute = read('src/app/api/invoiceflow/route.ts');
const leadRoute = read('src/app/api/leadfollow/route.ts');
const authScreen = read('src/app/sign-up-login-screen/components/AuthScreen.tsx');

test('InvoiceFlow dashboard reads only fields used by the workspace', () => {
  assert.match(invoiceRoute, /select\('business_name, legal_name, email, phone, website, address, logo_url, accent_hex, currency, footer_note'\)/);
  assert.match(invoiceRoute, /select\('id, name, company, email, phone, address, notes, created_at', \{ count: 'exact' \}\)/);
  assert.match(invoiceRoute, /select\('id, client_id, invoice_number, issue_date, due_date, status, currency, items, subtotal, tax_rate, tax_amount, total, notes, terms, share_token, share_enabled, created_at', \{ count: 'exact' \}\)/);
});

test('LeadFollow keeps the mobile dashboard payload bounded', () => {
  assert.match(leadRoute, /const LEAD_PAGE_SIZE = 50;/);
  assert.match(leadRoute, /select\('business_name, offer, target_audience, value_proposition, default_tone'\)/);
  assert.match(leadRoute, /select\('id, name, company, email, phone, source, status, notes, next_follow_up_at, last_contacted_at, created_at', \{ count: 'exact' \}\)/);
  assert.match(leadRoute, /select\('id, lead_id, channel, stage, tone, language, output_text, created_at'\)/);
  assert.match(leadRoute, /\.limit\(300\)/);
});

test('auth switching avoids blur filters and uses a lighter mobile backdrop', () => {
  assert.match(authScreen, /backdrop-blur-lg sm:p-8 sm:backdrop-blur-2xl/);
  assert.doesNotMatch(authScreen, /filter:\s*blur\(/);
  assert.doesNotMatch(authScreen, /will-change:\s*transform, opacity, filter/);
});
