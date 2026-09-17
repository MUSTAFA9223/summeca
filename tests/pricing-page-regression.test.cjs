const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const loader = fs.readFileSync(path.join(root, 'src/components/catalog/PricingCatalogClient.tsx'), 'utf8');
const view = fs.readFileSync(path.join(root, 'src/components/catalog/PricingCatalogView.tsx'), 'utf8');
const payments = fs.readFileSync(path.join(root, 'src/components/catalog/PricingPaymentMethods.tsx'), 'utf8');

test('pricing remains driven by the active production catalog and effective pricing helper', () => {
  assert.match(loader, /getPublicCatalog\(\)/);
  assert.match(view, /getEffectivePrice\(plan\)/);
  assert.match(view, /pricing\.regularPrice/);
  assert.match(view, /pricing\.finalPrice/);
  assert.match(view, /pricing\.discountAmount/);
  assert.match(view, /plan\.currency/);
});

test('pricing never relabels one-time purchases as lifetime access', () => {
  assert.match(view, /period === 'lifetime'.*'Lifetime'/s);
  assert.match(view, /period === 'one_time' \|\| period === 'lifetime'/);
  assert.match(view, /Not specified in plan data/);
});

test('single and multi-plan layouts use balanced responsive widths', () => {
  assert.match(view, /max-w-3xl grid-cols-1/);
  assert.match(view, /max-w-5xl md:grid-cols-2/);
  assert.match(view, /md:grid-cols-2 xl:grid-cols-3/);
  assert.match(view, /overflow-x-clip/);
});

test('every plan has direct checkout navigation plus product details', () => {
  assert.match(view, /\/checkout\?product_id=\$\{encodeURIComponent\(product\.id\)\}&plan_id=\$\{encodeURIComponent\(plan\.id\)\}/);
  assert.match(view, /href=\{checkoutHref\}/);
  assert.match(view, /href=\{`\/products\/\$\{product\.slug\}`\}/);
  assert.match(view, /Continue with/);
});

test('pricing payment badges are sourced from existing production status endpoints only', () => {
  assert.match(payments, /\/api\/payment\/payoneer-status/);
  assert.match(payments, /\/api\/payment\/crypto-status/);
  assert.match(payments, /\/api\/payment\/fastspring-status/);
  assert.match(payments, /data\.available === true/);
  assert.doesNotMatch(payments, /stripe/i);
});

test('pricing UI contains explicit Arabic copy and inherits RTL without changing global auth or checkout logic', () => {
  assert.match(view, /أسعار واضحة/);
  assert.match(view, /مدة الوصول/);
  assert.match(view, /الأسئلة الشائعة عن الأسعار/);
  assert.match(view, /rtl:rotate-180/);
});
