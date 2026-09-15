const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const home = read('src/app/page.tsx');
const hero = read('src/app/components/HeroSection.tsx');
const nav = read('src/components/PublicNav.tsx');
const footer = read('src/components/PublicFooter.tsx');

test('homepage keeps only three featured products and stays focused on store outcomes', () => {
  assert.match(home, /\.slice\(0, 3\)/);
  assert.match(home, /Solutions for small stores/);
  assert.match(home, /Choose the outcome you need, not a software category/);
  assert.match(home, /Buy with clarity/);
  assert.match(home, /Find your next tool/);
  assert.doesNotMatch(home, /Browse by category/);
});

test('hero is concise, store-specific, and shows real product workspace previews', () => {
  assert.match(hero, /min-h-\[620px\]/);
  assert.match(hero, /Built for small e-commerce stores/);
  assert.match(hero, /Run your store faster/);
  assert.match(hero, /Get Started/);
  assert.match(hero, /WorkspaceOverviewPreview/);
  assert.doesNotMatch(hero, /SplineNexbotScene/);
});

test('public navigation prioritizes customer intent over internal tool categories', () => {
  for (const label of ['For Stores', 'Products', 'Pricing', 'Support']) {
    assert.ok(nav.includes(`label: '${label}'`), `missing primary nav item: ${label}`);
  }
  assert.doesNotMatch(nav, /label: 'SaaS Apps'/);
  assert.doesNotMatch(nav, /productLinks/);
  assert.doesNotMatch(nav, /productsOpen/);
});

test('footer omits duplicate trust and sales bands', () => {
  assert.doesNotMatch(footer, /trustBadges/);
  assert.doesNotMatch(footer, /Need help choosing a SUMMECA product/);
  assert.match(footer, /Digital products, SaaS tools, and AI-focused solutions for modern work/);
});
