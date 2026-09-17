const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const banner = read('src/components/LaunchOfferBanner.tsx');
const nav = read('src/components/PublicNav.tsx');
const saasSales = read('src/components/catalog/SaasProductSalesExperience.tsx');

test('launch offer stays in document flow and exposes its measured height to floating controls', () => {
  assert.match(banner, /className="relative z-\[80\]/);
  assert.doesNotMatch(banner, /document\.body\.style\.paddingTop/);
  assert.match(banner, /ResizeObserver/);
  assert.match(banner, /--launch-offer-height/);
  assert.match(banner, /getBoundingClientRect\(\)\.height/);
});

test('public header sticks naturally below the in-flow offer without body-spacing bookkeeping', () => {
  assert.match(nav, /className="sticky top-0 z-50 -mb-\[70px\]/);
  assert.doesNotMatch(nav, /--launch-offer-height/);
  assert.match(nav, /absolute inset-x-0 top-full border-t/);
});

test('account label remains compact and direction-safe', () => {
  assert.match(nav, /firstDisplayName\.length > 16/);
  assert.match(nav, /dir="auto" className="min-w-0 flex-1 truncate text-start"/);
});

test('saas product hero uses compact natural spacing after the public header', () => {
  assert.match(saasSales, /padding-top: 1rem;/);
  assert.match(saasSales, /padding-top: 1\.5rem;/);
});
