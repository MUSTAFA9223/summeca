const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const catalog = fs.readFileSync(path.resolve(__dirname, '../src/components/catalog/CatalogClient.tsx'), 'utf8');
const catalogContrast = fs.readFileSync(path.resolve(__dirname, '../src/styles/catalog-contrast.css'), 'utf8');

test('catalog sort control uses localized accessible copy', () => {
  assert.match(catalog, /aria-label=\{copy\.sort\}/);
  assert.match(catalog, /sort: 'Sort products'/);
  assert.match(catalog, /sort: 'ترتيب المنتجات'/);
});

test('catalog sort control keeps the selected turquoise surface in English and Arabic', () => {
  assert.match(
    catalogContrast,
    /select\[aria-label='Sort products'\][\s\S]*?background-color:\s*#67e8f9\s*!important;/,
  );
  assert.match(catalogContrast, /select\[aria-label='ترتيب المنتجات'\]/);
  assert.match(
    catalogContrast,
    /select\[aria-label='Sort products'\][\s\S]*?color:\s*#041014\s*!important;/,
  );
  assert.doesNotMatch(
    catalogContrast,
    /select\[aria-label='Sort products'\][^{]*\{[^}]*background-color:\s*#0b1117/i,
  );
});
