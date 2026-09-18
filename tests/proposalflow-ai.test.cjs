const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const access = read('src/lib/saas/access.ts');
const api = read('src/app/api/proposalflow/route.ts');
const workspace = read('src/app/user-dashboard/proposalflow/page.tsx');
const sidebar = read('src/app/user-dashboard/components/DashboardSidebar.tsx');
const productPage = read('src/app/products/[slug]/page.tsx');
const productLayout = read('src/app/products/[slug]/layout.tsx');
const checkout = read('src/app/checkout/page.tsx');
const checkoutSuccess = read('src/app/checkout/success/page.tsx');

test('ProposalFlow is protected by the existing SaaS entitlement model', () => {
  assert.match(access, /summeca-proposalflow-ai/);
  assert.match(access, /monthlyProposals/);
  assert.match(access, /\.eq\('status', 'completed'\)/);
  assert.match(api, /getSaasAccess\(user\.id, PRODUCT_SLUG\)/);
});

test('ProposalFlow generation is authenticated, rate limited and fact-grounded', () => {
  assert.match(api, /Authentication required/);
  assert.match(api, /checkRateLimit/);
  assert.match(api, /Never invent testimonials, results, credentials, deadlines/);
  assert.match(api, /Pricing must use the exact amount or pricing wording supplied by the user/);
  assert.match(api, /not legal advice/);
});

test('ProposalFlow does not store proposal body content in usage logs', () => {
  assert.match(api, /output_text:\s*null/);
  assert.match(api, /metadata:\s*\{ tool: 'proposalflow' \}/);
});

test('ProposalFlow workspace is wired into dashboard and public product handling', () => {
  assert.match(workspace, /Generate proposal package/);
  assert.match(workspace, /Executive summary/);
  assert.match(workspace, /Follow-up email/);
  assert.match(sidebar, /\/user-dashboard\/proposalflow/);
  assert.match(productPage, /Get ProposalFlow AI/);
  assert.match(productLayout, /SUMMECA ProposalFlow AI \| AI Proposal Workspace/);
});
