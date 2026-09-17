const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const catalog = fs.readFileSync(path.join(root, 'src/components/catalog/CatalogClient.tsx'), 'utf8');

test('catalog uses customer-facing product labels without changing stored category values', () => {
  assert.match(catalog, /ai_tool: 'AI Workflow'/);
  assert.match(catalog, /template: 'Business Template'/);
  assert.match(catalog, /dataset: 'Digital Kit'/);
  assert.match(catalog, /saas_app: 'Business SaaS'/);
  assert.match(catalog, /category\.trim\(\)\.toLowerCase\(\)/);
});

test('catalog featured order prioritizes InvoiceFlow, LeadFollow, digital kits, then templates', () => {
  assert.match(catalog, /product\.slug === 'summeca-invoiceflow'\) return 0/);
  assert.match(catalog, /product\.slug === 'summeca-leadfollow-ai'\) return 1/);
  assert.match(catalog, /DIGITAL_KIT_CATEGORIES\.includes\(category\)\) return 2/);
  assert.match(catalog, /TEMPLATE_CATEGORIES\.includes\(category\)\) return 3/);
  assert.match(catalog, /catalogPriority\(a\) - catalogPriority\(b\)/);
});

test('catalog exposes result count and mobile-scrollable accessible filters', () => {
  assert.match(catalog, /visible\.length === 1 \? 'product' : 'products'/);
  assert.match(catalog, /overflow-x-auto/);
  assert.match(catalog, /whitespace-nowrap/);
  assert.match(catalog, /aria-live="polite"/);
  assert.match(catalog, /aria-pressed=\{selected\}/);
  assert.match(catalog, /<Check size=\{13\}/);
});

test('catalog search and empty state can be cleared without losing filter behavior', () => {
  assert.match(catalog, /placeholder=\{localize\('Search products'\)\}/);
  assert.match(catalog, /No products match your search\./);
  assert.match(catalog, /Clear search and filters/);
  assert.match(catalog, /setQuery\(''\)/);
  assert.match(catalog, /if \(kind === 'all'\) setFilter\('all'\)/);
});

test('catalog supports Arabic RTL presentation and reduced motion', () => {
  assert.match(catalog, /dir=\{isArabic \? 'rtl' : 'ltr'\}/);
  assert.match(catalog, /CATALOG_AR/);
  assert.match(catalog, /prefers-reduced-motion: reduce/);
  assert.match(catalog, /motion-reduce:transform-none/);
});
