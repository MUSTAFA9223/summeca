const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const layout = read('src/app/user-dashboard/components/DashboardLayout.tsx');
const overview = read('src/app/user-dashboard/components/DashboardOverview.tsx');
const invoiceflow = read('src/app/user-dashboard/invoiceflow/page.tsx');
const leadfollow = read('src/app/user-dashboard/leadfollow/page.tsx');

test('dashboard keeps a meaningful shell visible during loading', () => {
  assert.match(layout, /function DashboardShellSkeleton\(\)/);
  assert.match(layout, /aria-busy="true"/);
  assert.match(overview, /function OverviewSkeleton\(\)/);
  assert.match(overview, /Loading your account data/);
});

test('InvoiceFlow uses actionable empty states and clear busy labels', () => {
  assert.match(invoiceflow, /No clients yet/);
  assert.match(invoiceflow, /Add your first client/);
  assert.match(invoiceflow, /No invoices yet/);
  assert.match(invoiceflow, /Create your first invoice/);
  assert.match(invoiceflow, /Saving client…/);
  assert.match(invoiceflow, /Creating invoice…/);
  assert.match(invoiceflow, /activeAction/);
});

test('InvoiceFlow preserves overdue as a display-only derived state', () => {
  assert.match(invoiceflow, /function isInvoiceOverdue\(invoice: Invoice\)/);
  assert.match(invoiceflow, /function invoiceDisplayStatus\(invoice: Invoice\)/);
  assert.match(invoiceflow, /return isInvoiceOverdue\(invoice\) \? 'overdue' : invoice\.status/);
});

test('LeadFollow provides skeletons and required empty states', () => {
  assert.match(leadfollow, /function LeadFollowSkeleton\(\)/);
  assert.match(leadfollow, /No leads yet/);
  assert.match(leadfollow, /Add your first lead/);
  assert.match(leadfollow, /No AI drafts yet/);
  assert.match(leadfollow, /Select a lead and generate a draft/);
});

test('LeadFollow separates draft generation from real email sending', () => {
  assert.match(leadfollow, /Generate draft/);
  assert.match(leadfollow, /emailReviewConfirmed/);
  assert.match(leadfollow, /I reviewed the recipient, subject and email body and want to send this draft/);
  assert.match(leadfollow, /I confirm I have permission or a lawful basis to email this lead/);
  assert.match(leadfollow, /Sending is a separate action from generating/);
  assert.match(leadfollow, /bg-foreground/);
  assert.match(leadfollow, /'Send email'/);
});
