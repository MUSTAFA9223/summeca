const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const catalog = fs.readFileSync(path.join(root, 'src/components/catalog/CatalogClient.tsx'), 'utf8');

test('catalog uses customer-facing product labels', () => {
  assert.match(catalog, /ai_tool: 'AI Workflow'/);
  assert.match(catalog, /template: 'Business Template'/);
  assert.match(catalog, /dataset: 'Digital Kit'/);
  assert.match(catalog, /saas_app: 'Business SaaS'/);
});

test('catalog exposes result count and mobile-scrollable filters', () => {
  assert.match(catalog, /visible\.length === 1 \? 'product' : 'products'/);
  assert.match(catalog, /overflow-x-auto/);
  assert.match(catalog, /whitespace-nowrap/);
  assert.match(catalog, /aria-live="polite"/);
});
