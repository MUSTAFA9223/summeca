const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const surfaces = read('src/lib/i18n-surfaces.ts');
const comprehensive = read('src/lib/i18n-comprehensive.ts');
const products = read('src/lib/i18n-products.ts');

test('Arabic catalog covers all public shopping categories and pricing', () => {
  for (const phrase of [
    'Published digital products',
    'AI products published by SUMMECA',
    'Software offers ready for customers',
    'Digital resources ready for delivery',
    'Published Pricing',
    'Search published products',
    'Price: low to high',
    'No published offers yet',
  ]) assert.ok(surfaces.includes(`'${phrase}'`), `missing catalog translation: ${phrase}`);
});

test('Arabic app coverage includes checkout and both customer SaaS workspaces', () => {
  for (const phrase of [
    'Secure Checkout',
    'Payment Method',
    'Order Summary',
    'InvoiceFlow is ready when you are',
    'Create invoice',
    'Unlock LeadFollow AI',
    'AI follow-up studio',
  ]) assert.ok(comprehensive.includes(`'${phrase}'`), `missing app translation: ${phrase}`);
});

test('published product descriptions are represented in the Arabic product catalog', () => {
  for (const phrase of [
    'Freelancer Client Management Kit',
    'Ecommerce Product Page Conversion Kit',
    'AI Social Media Content Kit',
    'SUMMECA LeadFollow AI',
    'SUMMECA InvoiceFlow',
    'SUMMECA Conversion Rescue Kit — Starter',
    'SUMMECA Conversion Rescue Kit — Pro',
    'SUMMECA Conversion Rescue Kit — Ultimate',
  ]) assert.ok(products.includes(`'${phrase}'`), `missing product translation: ${phrase}`);
});
