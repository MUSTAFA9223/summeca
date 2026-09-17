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

test('homepage keeps four featured production products and stays focused on store outcomes', () => {
  assert.match(home, /\.slice\(0, 4\)/);
  assert.match(home, /summeca-invoiceflow/);
  assert.match(home, /summeca-leadfollow-ai/);
  assert.match(home, /conversion-rescue-kit-pro/);
  assert.match(home, /ecommerce-product-page-conversion-kit/);
  assert.match(home, /SaaS workspace/);
  assert.match(home, /AI-assisted workspace/);
  assert.match(home, /Downloadable digital kit/);
  assert.match(home, /Business Template/);
  assert.match(home, /Solutions for small stores/);
  assert.match(home, /Choose the outcome you need, not a software category/);
  assert.match(home, /Buy with clarity/);
  assert.match(home, /Find your next tool/);
  assert.doesNotMatch(home, /Browse by category/);
});

test('hero is concise, bilingual, store-specific, and shows real product workspace previews', () => {
  assert.match(hero, /min-h-\[580px\]/);
  assert.match(hero, /lg:min-h-\[620px\]/);
  assert.match(hero, /Built for modern small online businesses/);
  assert.match(hero, /Run your online business faster/);
  assert.match(hero, /Explore SUMMECA Tools/);
  assert.match(hero, /Get Started/);
  assert.match(hero, /مصمم للأعمال والمتاجر الرقمية الصغيرة/);
  assert.match(hero, /أدِر عملك الرقمي بسرعة أكبر/);
  assert.match(hero, /استكشف أدوات SUMMECA/);
  assert.match(hero, /dir=\{isArabic \? 'rtl' : 'ltr'\}/);
  assert.match(hero, /WorkspaceOverviewPreview/);
  assert.doesNotMatch(hero, /SplineNexbotScene/);
});

test('homepage motion stays short, static where decorative, and reduced-motion safe', () => {
  assert.match(home, /animation-duration: 200ms/);
  assert.match(home, /summeca-hero-orb \{[\s\S]*animation: none !important/);
  assert.match(home, /prefers-reduced-motion: reduce/);
  assert.match(home, /transition-duration: 200ms/);
  assert.match(hero, /duration-200/);
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
