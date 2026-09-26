const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('Sales Agent phase 1 reuses current SUMMECA product routes', () => {
  const page = fs.readFileSync(path.join(root, 'src/app/sales-agent/page.tsx'), 'utf8');

  assert.match(page, /SUMMECA Sales Agent/);
  assert.match(page, /AI-assisted and human-approved/);
  assert.match(page, /\/products\/summeca-leadfollow-ai/);
  assert.match(page, /\/products\/summeca-proposalflow-ai/);
  assert.match(page, /\/products\/summeca-siteagent-ai/);
  assert.doesNotMatch(page, /\/products\/summeca-sales-agent/);
});

test('Sales Agent is included in the public sitemap', () => {
  const sitemap = fs.readFileSync(path.join(root, 'src/app/sitemap.ts'), 'utf8');
  assert.match(sitemap, /path: '\/sales-agent'/);
});
