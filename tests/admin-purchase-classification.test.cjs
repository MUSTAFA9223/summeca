const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('admin dashboard keeps real and test purchases separate', () => {
  const page = read('src/app/admin/page.tsx');
  assert.match(page, /eq\('purchase_kind', 'real'\)/);
  assert.match(page, /eq\('purchase_kind', 'test'\)/);
  assert.match(page, /Real Purchases This Month/);
  assert.match(page, /Test Purchases This Month/);
});

test('admin orders can filter and label purchase type', () => {
  const page = read('src/app/admin/orders/page.tsx');
  assert.match(page, /purchaseKindFilter/);
  assert.match(page, /eq\('purchase_kind', purchaseKindFilter\)/);
  assert.match(page, /Real Purchase/);
  assert.match(page, /Test Purchase/);
  assert.match(page, /order\.status === 'completed' && order\.purchase_kind === 'real'/);
});

test('admin reports exclude test purchases from business metrics', () => {
  const page = read('src/app/admin/reports/page.tsx');
  assert.match(page, /Real Orders/);
  assert.match(page, /Test Orders/);
  assert.match(page, /Test Completed/);
  assert.match(page, /eq\('status', 'completed'\)\.eq\('purchase_kind', 'real'\)/);
});
