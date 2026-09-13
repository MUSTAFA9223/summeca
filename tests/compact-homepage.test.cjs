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

test('homepage keeps only three featured products and removes duplicate long-form sections', () => {
  assert.match(home, /\.slice\(0, 3\)/);
  assert.doesNotMatch(home, /Built around outcomes/);
  assert.doesNotMatch(home, /SaaS products/);
  assert.doesNotMatch(home, /AI where it helps/);
  assert.match(home, /Buy with clarity/);
  assert.match(home, /Find your next tool/);
});

test('hero is intentionally shorter while keeping the interactive robot', () => {
  assert.match(hero, /min-h-\[620px\]/);
  assert.match(hero, /SplineNexbotScene/);
  assert.match(hero, /pointerScopeSelector="\.summeca-home-hero"/);
  assert.doesNotMatch(hero, /Interactive 3D/);
});

test('public navigation exposes a small primary link set', () => {
  for (const label of ['Products', 'SaaS Apps', 'Pricing', 'Support']) {
    assert.ok(nav.includes(`label: '${label}'`), `missing primary nav item: ${label}`);
  }
  assert.doesNotMatch(nav, /productLinks/);
  assert.doesNotMatch(nav, /productsOpen/);
});

test('footer omits duplicate trust and sales bands', () => {
  assert.doesNotMatch(footer, /trustBadges/);
  assert.doesNotMatch(footer, /Need help choosing a SUMMECA product/);
  assert.match(footer, /Digital products, SaaS tools, and AI-focused solutions for modern work/);
});
