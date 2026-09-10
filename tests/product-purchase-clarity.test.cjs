const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const productPage = read('src/app/products/[slug]/page.tsx');
const checkout = read('src/app/checkout/page.tsx');

test('public product page keeps product-specific purchase CTAs', () => {
  for (const label of [
    'Get InvoiceFlow',
    'Get LeadFollow AI',
    'Get Starter Kit',
    'Get Pro Kit',
    'Get Ultimate Kit',
  ]) {
    assert.match(productPage, new RegExp(label));
  }
});

test('product page distinguishes SaaS account access from digital ZIP delivery without exposing product metadata', () => {
  assert.match(productPage, /isSaasProduct/);
  assert.match(productPage, /isDigitalProduct/);
  assert.match(productPage, /access is unlocked in your SUMMECA account/i);
  assert.match(productPage, /does not require a downloadable ZIP package/i);
  assert.match(productPage, /protected ZIP package becomes available/i);
  assert.doesNotMatch(productPage, /select\([^)]*metadata/);
});

test('product page only advertises payment methods reported by live readiness endpoints', () => {
  assert.match(productPage, /\/api\/payment\/crypto-status/);
  assert.match(productPage, /\/api\/payment\/payoneer-status/);
  assert.match(productPage, /\/api\/payment\/fastspring-status/);
  assert.match(productPage, /availableProviders/);
  assert.match(productPage, /Payment methods are temporarily unavailable/);
});

test('selected plan remains explicit through the checkout handoff', () => {
  assert.match(productPage, /selectedPlanId/);
  assert.match(productPage, /aria-pressed=\{selected\}/);
  assert.match(productPage, /product_id=\$\{encodeURIComponent\(product\.id\)\}/);
  assert.match(productPage, /plan_id=\$\{encodeURIComponent\(selectedPlan\.id\)\}/);
  assert.match(productPage, /exact product, plan, price and currency are checked again by the protected checkout flow/i);
});

test('mobile purchase bar mirrors selected plan instead of inventing a second price', () => {
  assert.match(productPage, /fixed inset-x-0 bottom-0/);
  assert.match(productPage, /money\(selectedPricing\.finalPrice, selectedPlan\.currency\)/);
  assert.match(productPage, /ctaLabel/);
});

test('checkout still uses server-side quote and provider session routes', () => {
  assert.match(checkout, /\/api\/payment\/quote/);
  assert.match(checkout, /\/api\/payment\/create-crypto-session/);
  assert.match(checkout, /\/api\/payment\/create-payoneer-session/);
  assert.match(checkout, /\/api\/payment\/create-fastspring-session/);
  assert.match(checkout, /checkoutAttemptKey/);
});
