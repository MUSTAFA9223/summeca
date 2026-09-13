const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const api = fs.readFileSync('src/app/api/leadfollow/route.ts', 'utf8');
const page = fs.readFileSync('src/app/user-dashboard/leadfollow/page.tsx', 'utf8');
const generate = fs.readFileSync('src/app/api/leadfollow/generate/route.ts', 'utf8');
const genericWebhook = fs.readFileSync('src/app/api/payment/webhook/route.ts', 'utf8');
const fastSpringWebhook = fs.readFileSync('src/app/api/payment/fastspring-webhook/route.ts', 'utf8');
const releaseMigration = fs.readFileSync('supabase/migrations/20260913101500_leadfollow_ai_quota_release.sql', 'utf8');

test('LeadFollow paginates large lead collections and keeps global counts server-side', () => {
  assert.match(api, /const LEAD_PAGE_SIZE = 100/);
  assert.match(api, /\.range\(from, to\)/);
  assert.match(api, /pagination:\s*\{/);
  assert.match(api, /select\('id', \{ count: 'exact', head: true \}\)/);
  assert.match(api, /\.in\('status', \['new', 'contacted', 'replied'\]\)/);
  assert.match(page, /Page \{data\.pagination\.page\} of \{data\.pagination\.totalPages\}/);
  assert.match(page, /data\.pagination\.hasPrevious/);
  assert.match(page, /data\.pagination\.hasNext/);
});

test('LeadFollow releases reserved AI quota when no usable draft is delivered', () => {
  assert.match(releaseMigration, /create or replace function public\.release_leadfollow_ai_request/);
  assert.match(releaseMigration, /greatest\(requests_count - 1, 0\)/);
  assert.match(releaseMigration, /grant execute on function public\.release_leadfollow_ai_request\(uuid,date\) to service_role/i);
  assert.match(generate, /release_leadfollow_ai_request/);
  const releases = generate.match(/await releaseReservedQuota\(/g) || [];
  assert.ok(releases.length >= 3, 'generation, empty-output and save failures should release quota');
});

test('verified lifetime SaaS payments never enter the download-email flow', () => {
  for (const webhook of [genericWebhook, fastSpringWebhook]) {
    assert.match(webhook, /select\('name, metadata'\)/);
    assert.match(webhook, /const isSaasProduct = productMetadata\.saas_product === true/);
    assert.match(webhook, /!isSaasProduct && \(plan\.billing_period === 'one_time' \|\| plan\.billing_period === 'lifetime'\)/);
  }
});
