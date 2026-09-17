const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const homepage = read('src/app/page.tsx');
const guide = read('src/components/home/HomepagePurchaseGuide.tsx');

test('homepage renders the standalone purchase guide after trust messaging', () => {
  assert.match(homepage, /import HomepagePurchaseGuide/);
  assert.match(homepage, /<HomepagePurchaseGuide \/>/);
  assert.match(homepage, /AI-assisted workspace/);
  assert.match(homepage, /Downloadable digital kit/);
  assert.match(homepage, /SaaS workspace/);
  assert.match(homepage, /Business Template/);
});

test('purchase guide explains three-step access flow in English and Arabic', () => {
  assert.match(guide, /Choose a product/);
  assert.match(guide, /Complete verified checkout/);
  assert.match(guide, /Open the product inside your SUMMECA account/);
  assert.match(guide, /اختر المنتج المناسب/);
  assert.match(guide, /أكمل الدفع المؤكد/);
  assert.match(guide, /افتح المنتج داخل حساب SUMMECA/);
});

test('homepage FAQ covers product type, access, billing, delivery, current payment methods and support', () => {
  for (const question of [
    'Is this SaaS or a download?',
    'When do I get access?',
    'Is the price one-time or recurring?',
    'Where do I find the product after purchase?',
    'What payment methods are currently available?',
    'How do I contact support?',
  ]) {
    assert.match(guide, new RegExp(question.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(guide, /InvoiceFlow and LeadFollow AI run inside your SUMMECA account/);
  assert.match(guide, /server-side/);
  assert.match(guide, /payment provider explicitly state/);
  assert.match(guide, /only payment methods that are currently enabled/);
  assert.match(guide, /ما وسائل الدفع المتاحة حاليًا؟/);
  assert.match(guide, /href="\/support"/);
});
