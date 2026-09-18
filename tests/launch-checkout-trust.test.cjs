const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const publicNav = read('src/components/PublicNav.tsx');
const checkout = read('src/app/checkout/page.tsx');
const cryptoRoute = read('src/app/api/payment/create-crypto-session/route.ts');

test('public theme control is hosted in the navigation instead of floating over purchase UI', () => {
  assert.match(publicNav, /data-theme-switcher-host="true"/);
  assert.match(publicNav, /ThemeSwitcher compact/);
});

test('checkout states verified delivery and exposes support and refund policy links', () => {
  assert.match(checkout, /After verified payment, access appears in your SUMMECA dashboard/);
  assert.match(checkout, /After verified payment, the protected file appears in your SUMMECA downloads/);
  assert.match(checkout, /href="\/support"/);
  assert.match(checkout, /href="\/refunds"/);
  assert.match(checkout, /Paid access is granted only after provider confirmation/);
});

test('crypto minimum guidance only advertises live checkout choices', () => {
  assert.match(cryptoRoute, /Try another available crypto option\./);
  assert.doesNotMatch(cryptoRoute, /Try another available crypto option or Payoneer/);
});
