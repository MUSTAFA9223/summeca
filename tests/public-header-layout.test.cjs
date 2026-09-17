const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const banner = read('src/components/LaunchOfferBanner.tsx');
const nav = read('src/components/PublicNav.tsx');
const saasSales = read('src/components/catalog/SaasProductSalesExperience.tsx');

test('launch offer participates in document flow and does not mutate body spacing', () => {
  assert.match(banner, /className="relative z-\[80\]/);
  assert.doesNotMatch(banner, /document\.body\.style\.paddingTop/);
  assert.doesNotMatch(banner, /ResizeObserver/);
  assert.doesNotMatch(banner, /--launch-offer-height/);
});

test('public header sticks naturally below the in-flow offer without overlay bookkeeping', () => {
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
