const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

test('all three SUMMECA SaaS apps expose a bounded authenticated free tier', () => {
  const source = fs.readFileSync('src/lib/saas/access.ts', 'utf8');
  assert.match(source, /Free: \{ maxClients: 3, maxInvoices: 5 \}/);
  assert.match(source, /Free: \{ maxLeads: 10, monthlyAi: 5 \}/);
  assert.match(source, /Free: \{ monthlyProposals: 3 \}/);
  assert.match(source, /planName: 'Free'/);
  assert.match(source, /limits: LIMITS\[slug\]\.Free/);
});
