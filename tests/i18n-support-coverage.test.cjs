const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const support = fs.readFileSync(path.join(root, 'src/lib/i18n-support.ts'), 'utf8');
const provider = fs.readFileSync(path.join(root, 'src/contexts/LanguageContext.tsx'), 'utf8');

const required = [
  'Can’t find what you need? Contact the SUMMECA support team directly.',
  'Where can I find my purchased products?',
  'What should I do if a payment is pending?',
  'I forgot my password. How do I reset it?',
  'Can I get help with a product before buying?',
  'What information should I include in a support request?',
  'Send us a support request and include your account email, product name, and order number when applicable.',
  'Never send passwords, verification codes, or private keys.',
  'Customer support:',
  'Order & delivery help:',
  'Billing & payment help:',
];

test('support center English copy has Arabic translations', () => {
  for (const phrase of required) {
    assert.ok(support.includes(phrase), `missing Arabic support translation for: ${phrase}`);
  }
});

test('sitewide language provider applies support translations', () => {
  assert.match(provider, /translateSupportText/);
  assert.match(provider, /const support = translateSupportText\(homepage\)/);
});
