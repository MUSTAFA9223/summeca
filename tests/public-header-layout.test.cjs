const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const banner = read('src/components/LaunchOfferBanner.tsx');
const nav = read('src/components/PublicNav.tsx');
const siteTheme = read('src/styles/site-theme.css');
const catalog = read('src/components/catalog/CatalogClient.tsx');
const pricing = read('src/components/catalog/PricingCatalogClient.tsx');
const hero = read('src/app/components/HeroSection.tsx');
const saasSales = read('src/components/catalog/SaasProductSalesExperience.tsx');

test('launch offer stays in document flow and preserves dismissal state', () => {
  assert.match(banner, /className="relative z-\[80\]/);
  assert.match(banner, /window\.localStorage\.getItem\(STORAGE_KEY\)/);
  assert.match(banner, /window\.localStorage\.setItem\(STORAGE_KEY, '1'\)/);
  assert.doesNotMatch(banner, /document\.body\.style\.paddingTop/);
  assert.doesNotMatch(banner, /ResizeObserver/);
});

test('public header owns its real layout height with a readable light glass surface', () => {
  assert.match(nav, /className="sticky top-0 z-50 -mb-\[70px\]/);
  assert.match(siteTheme, /\[data-public-nav='true'\] \{[\s\S]*?margin-bottom: 0 !important;/);
  assert.match(siteTheme, /background-color: color-mix\(in srgb, var\(--background\) 95%, transparent\) !important;/);
  assert.match(siteTheme, /backdrop-filter: blur\(10px\) !important;/);
  assert.doesNotMatch(nav, /--launch-offer-height/);
  assert.match(nav, /absolute inset-x-0 top-full border-t/);
});

test('legacy top padding is neutralized only for public-header compensation paths', () => {
  assert.match(catalog, /pt-\[68px\]/);
  assert.match(pricing, /pt-\[68px\]/);
  assert.match(hero, /pt-\[70px\]/);
  assert.match(saasSales, /padding-top: 70px !important;/);
  assert.match(siteTheme, /\[data-public-nav='true'\] \+ main\[class\*='pt-\[68px\]'\][\s\S]*?padding-top: 0 !important;/);
  assert.match(siteTheme, /\[data-public-nav='true'\] \+ \.summeca-home-hero[\s\S]*?padding-top: 0 !important;/);
  assert.match(siteTheme, /html \.summeca-saas-sales-shell main \{[\s\S]*?padding-top: 0 !important;/);
});

test('account label remains compact, truncates safely, and menu is RTL-safe', () => {
  assert.match(nav, /firstDisplayName\.length > 16/);
  assert.match(nav, /max-w-\[150px\]/);
  assert.match(nav, /dir="auto" className="min-w-0 flex-1 truncate text-start"/);
  assert.match(siteTheme, /button\[aria-haspopup='menu'\][\s\S]*?max-width: 9\.375rem;/);
  assert.match(siteTheme, /html\[dir='rtl'\] \[data-public-nav='true'\] \.glass-card-premium\[role='menu'\][\s\S]*?right: auto;[\s\S]*?left: 0;/);
});
