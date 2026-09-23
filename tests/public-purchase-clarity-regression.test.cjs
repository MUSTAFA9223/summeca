const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const hero = read('src/app/components/HeroSection.tsx');
const pricing = read('src/components/catalog/PricingCatalogView.tsx');
const featured = read('src/app/components/FeaturedProducts.tsx');
const darkHeroCss = read('src/styles/summeca-home-dark.css');
const lightHeroCss = read('src/styles/summeca-light-premium.css');

test('homepage hero keeps a readable filled headline and flagship product CTA hierarchy', () => {
  assert.match(hero, /summeca-hero-headline-line/);
  assert.match(darkHeroCss, /\.summeca-hero-headline-line[\s\S]*?color: #e8fbfa;[\s\S]*?-webkit-text-stroke:/);
  assert.match(lightHeroCss, /html\[data-site-theme='light'\] \.summeca-hero-headline-line[\s\S]*?color: #062b35;[\s\S]*?-webkit-text-stroke:/);
  assert.match(hero, /href="\/user-dashboard\/invoiceflow"[\s\S]*?primary_cta_click/);
  assert.match(hero, /invoiceFlow: 'Try InvoiceFlow free'/);
  assert.match(hero, /invoiceFlow: 'جرّب InvoiceFlow مجانًا'/);
  assert.match(hero, /href="\/products\/summeca-invoiceflow#product-preview"[\s\S]*?secondary_cta_click/);
  assert.match(hero, /leadFollow: 'Watch the real product demo'/);
  assert.match(hero, /leadFollow: 'شاهد معاينة المنتج'/);
  assert.match(hero, /href="\/products"/);
  assert.match(hero, /allProducts: 'View all products'/);
  assert.match(hero, /allProducts: 'عرض كل المنتجات'/);
  assert.match(hero, /Transparent pricing/);
  assert.match(hero, /Protected checkout/);
  assert.match(hero, /Account-based access/);
  assert.match(hero, /Customer support/);
});

test('pricing uses customer-facing product types and explains access before checkout', () => {
  assert.match(pricing, /ai_tool: \{ en: 'AI Workflow'/);
  assert.match(pricing, /template: \{ en: 'Business Template'/);
  assert.match(pricing, /saas_app: \{ en: 'Business SaaS'/);
  assert.match(pricing, /dataset: \{ en: 'Digital Kit'/);
  assert.match(pricing, /categoryLabel\(product\.category, isArabic\)/);
  assert.doesNotMatch(pricing, /product\.category\.replaceAll/);
  assert.match(pricing, /Which payment methods can I use\?/);
  assert.match(pricing, /When do I get access\?/);
  assert.match(pricing, /How is delivery handled\?/);
});

test('featured product cards use the same customer-facing type language', () => {
  assert.match(featured, /ai_tool: 'AI Workflow'/);
  assert.match(featured, /template: 'Business Template'/);
  assert.match(featured, /saas: 'Business SaaS'/);
  assert.match(featured, /other: 'Digital Kit'/);
});