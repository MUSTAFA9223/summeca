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
  const { toCSV } = loadTsModule('src/app/api/admin/export/route.ts');
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

test('marketing queue uses real subscription data and requires explicit email consent', () => {
  const source = fs.readFileSync('src/app/api/admin/marketing/send/route.ts', 'utf8');
  assert.match(source, /from\('subscriptions'\)/);
  assert.match(source, /subscriptionStatus = segment === 'subscription_users' \? 'active' : 'trialing'/);
  assert.doesNotMatch(source, /subscription_status/);
  assert.match(source, /eq\('email_marketing', true\)/);
  assert.match(source, /missing preference row is not consent/i);
  assert.match(source, /request\.headers\.get\('origin'\) !== new URL\(request\.url\)\.origin/);
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
