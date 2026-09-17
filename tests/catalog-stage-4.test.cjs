const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const catalog = fs.readFileSync(path.join(root, 'src/components/catalog/CatalogClient.tsx'), 'utf8');

test('catalog uses customer-facing bilingual product labels without changing stored category values', () => {
  assert.match(catalog, /ai_tool:\s*\{ en: 'AI Workflow', ar:/);
  assert.match(catalog, /template:\s*\{ en: 'Business Template', ar:/);
  assert.match(catalog, /dataset:\s*\{ en: 'Digital Kit', ar:/);
  assert.match(catalog, /saas_app:\s*\{ en: 'Business SaaS', ar:/);
  assert.match(catalog, /function normalizeCategory\(category: string\)/);
  assert.match(catalog, /function productTypeLabel\(/);
  assert.match(catalog, /saasWorkspace: 'SaaS workspace'/);
  assert.match(catalog, /aiWorkspace: 'AI-assisted workspace'/);
  assert.match(catalog, /digitalKit: 'Downloadable digital kit'/);
  assert.match(catalog, /businessTemplate: 'Business template'/);
});

test('catalog exposes result count, actionable empty state, and mobile-scrollable filters', () => {
  assert.match(catalog, /visible\.length === 1 \? copy\.product : copy\.products/);
  assert.match(catalog, /overflow-x-auto/);
  assert.match(catalog, /whitespace-nowrap/);
  assert.match(catalog, /aria-live="polite"/);
  assert.match(catalog, /No products match your search\./);
  assert.match(catalog, /clearSearchAndFilters/);
  assert.match(catalog, /aria-pressed=\{selected\}/);
});

test('recommended catalog order prioritizes flagship products and keeps templates after other products', () => {
  assert.match(catalog, /slug\.includes\('invoiceflow'\)\) return 0/);
  assert.match(catalog, /slug\.includes\('leadfollow'\)\) return 1/);
  assert.match(catalog, /category === 'template'\) return 3/);
  assert.match(catalog, /const priorityDelta = catalogPriority\(a\) - catalogPriority\(b\)/);
});

test('catalog includes Arabic copy and RTL-aware controls', () => {
  assert.match(catalog, /emptyTitle: 'لا توجد منتجات تطابق بحثك\.'/);
  assert.match(catalog, /rtl:left-auto rtl:right-3\.5/);
  assert.match(catalog, /rtl:rotate-180/);
});
