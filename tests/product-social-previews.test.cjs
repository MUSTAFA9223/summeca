const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const socialCard = read('src/app/products/[slug]/social-card.tsx');
const openGraph = read('src/app/products/[slug]/opengraph-image.tsx');
const twitter = read('src/app/products/[slug]/twitter-image.tsx');

test('flagship product social cards use real product screenshots', () => {
  assert.match(socialCard, /summeca-invoiceflow/);
  assert.match(socialCard, /\/assets\/products\/invoiceflow\.webp/);
  assert.match(socialCard, /summeca-leadfollow-ai/);
  assert.match(socialCard, /\/assets\/products\/leadfollow-ai\.webp/);
  assert.doesNotMatch(socialCard, /invoiceflow\.svg/);
  assert.doesNotMatch(socialCard, /leadfollow-ai\.svg/);
});

test('product routes provide large Open Graph and Twitter image handlers', () => {
  for (const source of [openGraph, twitter]) {
    assert.match(source, /width: 1200, height: 630/);
    assert.match(source, /contentType = 'image\/png'/);
    assert.match(source, /createProductSocialCard\(slug\)/);
  }
});
