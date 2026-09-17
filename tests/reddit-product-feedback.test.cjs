const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (file) => fs.readFileSync(file, 'utf8');
const banner = read('src/components/LaunchOfferBanner.tsx');
const nav = read('src/components/PublicNav.tsx');
const catalog = read('src/components/catalog/CatalogClient.tsx');
const preview = read('src/components/catalog/ProductProofPreview.tsx');

test('launch offer stays in document flow and can be dismissed while exposing its measured height to floating controls', () => {
  assert.match(banner, /ResizeObserver/);
  assert.match(banner, /--launch-offer-height/);
  assert.doesNotMatch(banner, /document\.body\.style\.paddingTop/);
  assert.match(banner, /Dismiss launch offer/);
  assert.match(nav, /sticky top-0/);
  assert.doesNotMatch(nav, /var\(--launch-offer-height, 0px\)/);
});

test('catalog uses factual product previews instead of generic 3D cover art', () => {
  assert.match(catalog, /Actual product previews/);
  assert.doesNotMatch(catalog, /Deep 3D product previews/);
  assert.match(preview, /data-product-proof-preview="true"/);
  assert.match(preview, /SAMPLE DATA/);
  assert.match(preview, /Delivered after verified purchase/);
});
