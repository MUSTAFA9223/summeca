const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

test('business workspace connects LeadFollow to ProposalFlow to InvoiceFlow', () => {
  const workspace = read('src/app/user-dashboard/workspace/page.tsx');
  assert.match(workspace, /Lead → Proposal → Invoice/);
  assert.match(workspace, /\/user-dashboard\/proposalflow\?/);
  assert.match(workspace, /leadId/);
  assert.match(workspace, /clientEmail/);
});

test('ProposalFlow saves proposals, supports templates, and hands accepted work to invoicing', () => {
  const api = read('src/app/api/proposalflow/route.ts');
  const page = read('src/app/user-dashboard/proposalflow/page.tsx');
  assert.match(api, /proposalflow_proposals/);
  assert.match(api, /freelancer/);
  assert.match(api, /web-development/);
  assert.match(api, /proposal_sent/);
  assert.match(page, /Saved proposals/);
  assert.match(page, /Export PDF/);
  assert.match(page, /Create invoice/);
  assert.match(page, /source: 'proposalflow'/);
});

test('LeadFollow includes proposal stage and direct proposal action', () => {
  const api = read('src/app/api/leadfollow/route.ts');
  const page = read('src/app/user-dashboard/leadfollow/page.tsx');
  assert.match(api, /proposal_sent/);
  assert.match(page, /Proposal sent/);
  assert.match(page, /Create proposal/);
  assert.match(page, /proposalHref/);
});

test('InvoiceFlow accepts ProposalFlow handoff without replacing existing workflow', () => {
  const page = read('src/app/user-dashboard/invoiceflow/page.tsx');
  assert.match(page, /ProposalHandoff/);
  assert.match(page, /source.*proposalflow/);
  assert.match(page, /ProposalFlow handoff/);
  assert.match(page, /existingClient/);
});

test('first-party funnel captures the requested conversion stages and exposes admin metrics', () => {
  const endpoint = read('src/app/api/analytics/funnel/route.ts');
  const helper = read('src/lib/funnelAnalytics.ts');
  const admin = read('src/app/admin/page.tsx');
  for (const event of [
    'product_view',
    'buy_click',
    'trial_started',
    'checkout_started',
    'payment_method_selected',
    'payment_failed',
    'payment_completed',
  ]) {
    assert.match(endpoint, new RegExp(event));
    assert.match(helper, new RegExp(event));
  }
  assert.match(admin, /Sales funnel · This month/);
  assert.match(admin, /Payment selected → completed/);
});

test('public SaaS pages expose a free trial entry point', () => {
  const base = read('src/components/catalog/SaasProductSalesExperienceBase.tsx');
  const product = read('src/app/products/[slug]/page.tsx');
  assert.match(base, /Try free/);
  assert.match(base, /trial_started/);
  assert.match(product, /freeWorkspaceHref/);
  assert.match(product, /Try free/);
});
