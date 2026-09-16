const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const invoiceflow = read('src/app/user-dashboard/invoiceflow/page.tsx');
const leadfollow = read('src/app/user-dashboard/leadfollow/page.tsx');
const sales = read('src/components/catalog/SaasProductSalesExperienceBase.tsx');

test('InvoiceFlow makes the first invoice path explicit and fast', () => {
  assert.match(invoiceflow, /function startInvoice\(\)/);
  assert.match(invoiceflow, /createInvoiceAfterClient/);
  assert.match(invoiceflow, /localDateInDays\(7\)/);
  assert.match(invoiceflow, /invoice builder will open automatically with a 7-day due date/i);
});

test('InvoiceFlow visibly derives overdue state without changing persisted invoice status', () => {
  assert.match(invoiceflow, /function isInvoiceOverdue\(invoice: Invoice\)/);
  assert.match(invoiceflow, /function invoiceDisplayStatus\(invoice: Invoice\)/);
  assert.match(invoiceflow, /\['Overdue', overdueCount, Clock3\]/);
  assert.match(invoiceflow, /bg-destructive\/10 text-destructive/);
});

test('LeadFollow highlights due work and provides quick next actions', () => {
  assert.match(leadfollow, /function isFollowUpDue\(lead: Lead\)/);
  assert.match(leadfollow, /function followUpPreset\(days: number\)/);
  assert.match(leadfollow, /Follow-up due now/);
  assert.match(leadfollow, /Tomorrow/);
  assert.match(leadfollow, /\+3 days/);
  assert.match(leadfollow, /\+7 days/);
});

test('LeadFollow email follow-up action moves the user to the drafting studio', () => {
  assert.match(leadfollow, /function openEmailFollowUp\(lead: Lead\)/);
  assert.match(leadfollow, /id="follow-up-studio"/);
  assert.match(leadfollow, /scrollIntoView\(\{ behavior: 'smooth', block: 'start' \}\)/);
});

test('SaaS sales pages state concrete deliverables and checkout terms before purchase', () => {
  assert.match(sales, /buyerReceives/);
  assert.match(sales, /What you get with your plan/);
  assert.match(sales, /Checkout re-confirms the exact product, selected plan, price, currency and access period before payment/);
  assert.match(sales, /working SaaS workspace, not a downloadable ZIP/);
});
