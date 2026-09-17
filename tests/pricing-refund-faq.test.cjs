const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pricing = fs.readFileSync(path.join(root, 'src/components/catalog/PricingCatalogView.tsx'), 'utf8');
const refundFaq = fs.readFileSync(path.join(root, 'src/components/catalog/PricingRefundFaq.tsx'), 'utf8');
const refundPolicy = fs.readFileSync(path.join(root, 'src/app/refunds/page.tsx'), 'utf8');

test('pricing FAQ includes the bilingual refund policy card without changing checkout logic', () => {
  assert.match(pricing, /import PricingRefundFaq/);
  assert.match(pricing, /<PricingRefundFaq \/>/);
  assert.match(pricing, /md:grid-cols-2 xl:grid-cols-4/);
  assert.doesNotMatch(pricing, /payment provider credentials|webhook secret/i);
});

test('refund FAQ links to the existing policy and avoids approval promises', () => {
  assert.match(refundFaq, /Can I request a refund\?/);
  assert.match(refundFaq, /هل يمكنني طلب استرداد؟/);
  assert.match(refundFaq, /href="\/refunds"/);
  assert.match(refundFaq, /does not guarantee approval/);
  assert.match(refundFaq, /تقديم الطلب لا يضمن الموافقة عليه/);
});

test('pricing refund wording stays aligned with the existing refund policy', () => {
  assert.match(refundPolicy, /eligibility/i);
  assert.match(refundPolicy, /does not by itself guarantee approval/i);
  assert.match(refundPolicy, /payment method/i);
});
