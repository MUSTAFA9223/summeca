const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const layout = read('src/app/layout.tsx');
const responsiveCss = read('src/styles/mobile-responsive.css');
const checkoutLayout = read('src/app/checkout/layout.tsx');
const catalog = read('src/components/catalog/CatalogClient.tsx');
const invoiceFlow = read('src/app/user-dashboard/invoiceflow/page.tsx');
const leadFollow = read('src/app/user-dashboard/leadfollow/page.tsx');

test('global mobile guardrails are loaded and prevent accidental page overflow', () => {
  assert.match(layout, /mobile-responsive\.css/);
  assert.match(responsiveCss, /overflow-x:\s*clip/);
  assert.match(responsiveCss, /@media \(max-width: 767px\)/);
  assert.match(responsiveCss, /@media \(max-width: 430px\)/);
  assert.match(responsiveCss, /@media \(max-width: 360px\)/);
});

test('touch targets and floating controls respect phone safe areas', () => {
  assert.match(responsiveCss, /min-height:\s*44px/);
  assert.match(responsiveCss, /safe-area-inset-right/);
  assert.match(responsiveCss, /safe-area-inset-bottom/);
  assert.match(responsiveCss, /100dvh/);
});

test('catalog filters and SaaS tables stay inside scroll containers', () => {
  assert.match(catalog, /overflow-x-auto/);
  assert.match(catalog, /min-w-max/);
  assert.match(invoiceFlow, /mt-4 overflow-x-auto/);
  assert.match(invoiceFlow, /min-w-\[850px\]/);
  assert.match(leadFollow, /mt-4 overflow-x-auto/);
  assert.match(leadFollow, /min-w-\[920px\]/);
});

test('checkout uses scoped phone layout protections without changing payment logic', () => {
  assert.match(checkoutLayout, /summeca-checkout-shell/);
  assert.match(responsiveCss, /summeca-checkout-shell \.sticky\.top-24/);
  assert.match(responsiveCss, /position:\s*static/);
  assert.match(responsiveCss, /summeca-checkout-shell \.overflow-hidden > \.p-5\.flex\.gap-4/);
});
