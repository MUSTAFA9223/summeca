const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const hero = read('src/app/components/HeroSection.tsx');
const pricing = read('src/components/catalog/PricingCatalogClient.tsx');
const featured = read('src/app/components/FeaturedProducts.tsx');

test('homepage hero keeps a readable filled headline and product-first CTA hierarchy', () => {
  assert.match(hero, /color: isLight \? '#062b35' : '#e8fbfa'/);
  assert.match(hero, /WebkitTextStroke/);
  assert.match(hero, /href="\/products"[\s\S]*?primary_cta_click/);
  assert.match(hero, /primary: 'Explore SUMMECA Tools'/);
  assert.match(hero, /primary: 'استكشف أدوات SUMMECA'/);
  assert.match(hero, /Transparent pricing/);
  assert.match(hero, /Protected checkout/);
  assert.match(hero, /Account-based access/);
  assert.match(hero, /Customer support/);
});

test('pricing uses customer-facing product types and explains access before checkout', () => {
  assert.match(pricing, /ai_tool: 'AI Workflow'/);
  assert.match(pricing, /template: 'Business Template'/);
  assert.match(pricing, /saas_app: 'Business SaaS'/);
  assert.match(pricing, /dataset: 'Digital Kit'/);
  assert.match(pricing, /categoryLabel\(product\.category\)/);
  assert.doesNotMatch(pricing, /product\.category\.replaceAll/);
  assert.match(pricing, /Which payment methods can I use\?/);
  assert.match(pricing, /When do I get access\?/);
  assert.match(pricing, /Where can I check delivery details\?/);
});

test('featured product cards use the same customer-facing type language', () => {
  assert.match(featured, /ai_tool: 'AI Workflow'/);
  assert.match(featured, /template: 'Business Template'/);
  assert.match(featured, /saas: 'Business SaaS'/);
  assert.match(featured, /other: 'Digital Kit'/);
});
