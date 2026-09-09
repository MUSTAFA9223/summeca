const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadTsModule(path, requireMap = {}) {
  const source = fs.readFileSync(path, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const context = {
    exports: {},
    require(name) {
      if (name in requireMap) return requireMap[name];
      if (name === 'next/server') return { NextRequest: class {}, NextResponse: {} };
      if (name.includes('supabase/server')) return { createClient: async () => ({}) };
      throw new Error(`Unexpected import: ${name}`);
    },
  };
  vm.runInNewContext(compiled, context);
  return context.exports;
}

test('admin CSV export neutralizes spreadsheet formulas without changing numeric negatives', () => {
  const { toCSV } = loadTsModule('src/lib/security/csv.ts');
  assert.equal(typeof toCSV, 'function');

  const csv = toCSV([{
    formula: '=1+1',
    plusFormula: '+SUM(A1:A2)',
    spacedFormula: ' \t@SUM(A1:A2)',
    minusFormula: '-1+1',
    negativeNumber: -42,
    ordinary: 'hello',
    quoted: 'hello,world',
  }]);

  assert.match(csv, /'=1\+1/);
  assert.match(csv, /'\+SUM\(A1:A2\)/);
  assert.match(csv, /' \t@SUM\(A1:A2\)/);
  assert.match(csv, /'-1\+1/);
  assert.match(csv, /,-42,/);
  assert.match(csv, /hello/);
  assert.match(csv, /"hello,world"/);
});

test('marketing delivery uses real audiences, explicit consent and provider-backed status', () => {
  const source = fs.readFileSync('src/app/api/admin/marketing/send/route.ts', 'utf8');
  assert.match(source, /from\('subscriptions'\)/);
  assert.match(source, /subscriptionStatus = segment === 'subscription_users' \? 'active' : 'trialing'/);
  assert.doesNotMatch(source, /subscription_status/);
  assert.match(source, /eq\('email_marketing', true\)/);
  assert.match(source, /missing preference row is not consent/i);
  assert.match(source, /request\.headers\.get\('origin'\) !== new URL\(request\.url\)\.origin/);
  assert.match(source, /upsert\(queueRows, \{ onConflict: 'campaign_id,user_id' \}\)/);
  assert.match(source, /update\(\{ status: 'sending' \}\)/);
  assert.match(source, /functions\.invoke\('send-marketing-email'/);
  assert.match(source, /email_status: status/);
  assert.match(source, /finalStatus = failedIds\.size === 0 \? 'sent' : 'failed'/);

  const worker = fs.readFileSync('supabase/functions/send-marketing-email/index.ts', 'utf8');
  assert.match(worker, /emails\/batch/);
  assert.match(worker, /'Idempotency-Key'/);
  assert.match(worker, /summeca-marketing-\$\{campaignId\}-\$\{offset \/ BATCH_SIZE\}/);
  assert.match(worker, /constantTimeEqual\(bearerToken, SERVICE_ROLE_KEY\)/);
  assert.match(worker, /const BATCH_SIZE = 100/);
  assert.match(worker, /const MAX_RECIPIENTS = 500/);
});

test('generated rich text is reduced to display-safe HTML before admin rendering', () => {
  const { generatedTextToSafeHtml, sanitizeGeneratedContent } = loadTsModule(
    'src/lib/security/sanitizeGeneratedContent.ts',
  );

  const dangerous = '<img src=x onerror="alert(1)"><script>alert(2)</script>Hello<br><a href="javascript:alert(3)">Click</a>';
  const safe = generatedTextToSafeHtml(dangerous);

  assert.doesNotMatch(safe, /<img|<script|<a\s|onerror=|javascript:/i);
  assert.match(safe, /Hello<br \/>Click/);

  const nested = sanitizeGeneratedContent({
    fullDescription: dangerous,
    other: '<b>rendered by React as text</b>',
    child: { emailBody: '<svg onload="alert(4)">Mail</svg>' },
  });
  assert.doesNotMatch(nested.fullDescription, /<img|<script|onerror=/i);
  assert.doesNotMatch(nested.child.emailBody, /<svg|onload=/i);
  assert.equal(nested.other, '<b>rendered by React as text</b>');

  const aiRoute = fs.readFileSync('src/app/api/ai/generate/route.ts', 'utf8');
  const marketingRoute = fs.readFileSync('src/app/api/admin/marketing/generate/route.ts', 'utf8');
  assert.match(aiRoute, /sanitizeGeneratedContent\(parsedOutput\)/);
  assert.match(marketingRoute, /sanitizeGeneratedContent\(parsed\)/);
  assert.match(marketingRoute, /generatedTextToSafeHtml\(result\.text\)/);
});

test('legacy user-dashboard components contain no fabricated customer data or fake success flows', () => {
  const subscriptions = fs.readFileSync('src/app/user-dashboard/components/ActiveSubscriptions.tsx', 'utf8');
  const downloads = fs.readFileSync('src/app/user-dashboard/components/DownloadsPanel.tsx', 'utf8');
  const apiKeys = fs.readFileSync('src/app/user-dashboard/components/ApiKeysPanel.tsx', 'utf8');

  assert.doesNotMatch(subscriptions, /sub-001|AI Content Generator|Business Dashboard|4,350 \/ 5,000/);
  assert.match(subscriptions, /\/user-dashboard\/subscriptions/);

  assert.doesNotMatch(downloads, /dl-001|Teacher Planner 2026|business-templates-v3|setTimeout|toast\.success/);
  assert.match(downloads, /\/user-dashboard\/downloads/);

  assert.doesNotMatch(apiKeys, /smc_live_|smc_test_|setTimeout|toast\.success|HIDDEN_FOR_SECURITY/);
  assert.match(apiKeys, /API-key issuance is not enabled/);
});

test('failed or cancelled unpaid orders release reserved coupon usage atomically', () => {
  const migration = fs.readFileSync(
    'supabase/migrations/20260909191000_release_failed_coupon_reservations.sql',
    'utf8',
  );

  assert.match(migration, /old\.status in \('pending'::public\.order_status, 'pending_payment'::public\.order_status\)/);
  assert.match(migration, /new\.status in \('failed'::public\.order_status, 'cancelled'::public\.order_status\)/);
  assert.match(migration, /coupon_reserved/);
  assert.match(migration, /used_count = greatest\(coalesce\(used_count, 0\) - 1, 0\)/);
  assert.match(migration, /new\.metadata :=/);
  assert.match(migration, /before update of status on public\.orders/);
});
