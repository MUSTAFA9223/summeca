const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const layout = fs.readFileSync(
  path.join(root, 'src/app/user-dashboard/components/DashboardLayout.tsx'),
  'utf8',
);
const wishlist = fs.readFileSync(
  path.join(root, 'src/app/user-dashboard/wishlist/page.tsx'),
  'utf8',
);
const wishlistButton = fs.readFileSync(
  path.join(root, 'src/components/WishlistButton.tsx'),
  'utf8',
);

test('customer dashboard uses theme-aware surfaces instead of a fixed light shell', () => {
  assert.doesNotMatch(layout, /bg-\[#F8FAFB\]/);
  assert.match(layout, /bg-background text-foreground/);
});

test('wishlist accents use the SUMMECA semantic palette', () => {
  assert.doesNotMatch(wishlist, /text-danger.*Heart|Heart.*text-danger/);
  assert.match(wishlist, /text-primary/);
  assert.match(wishlist, /btn-primary inline-flex/);
  assert.doesNotMatch(wishlistButton, /red-50|red-500|red-400|red-100/);
  assert.match(wishlistButton, /fill-current/);
});
