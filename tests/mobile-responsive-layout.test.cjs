const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const layout = read('src/app/layout.tsx');
const responsiveCss = read('src/styles/mobile-responsive.css');
const themeSwitcher = read('src/components/GlobalThemeSwitcher.tsx');
const catalog = read('src/components/catalog/CatalogClient.tsx');
const invoiceFlow = read('src/app/user-dashboard/invoiceflow/page.tsx');
const leadFollow = read('src/app/user-dashboard/leadfollow/page.tsx');
const checkout = read('src/app/checkout/page.tsx');

test('global mobile guardrails are loaded and cover narrow phone widths', () => {
  assert.match(layout, /accessibility-motion-performance\.css[\s\S]*mobile-responsive\.css/);
  assert.match(responsiveCss, /overflow-x:\s*clip/);
  assert.match(responsiveCss, /@media \(max-width: 767px\)/);
  assert.match(responsiveCss, /@media \(max-width: 430px\)/);
  assert.match(responsiveCss, /@media \(max-width: 360px\)/);
});

test('touch targets and floating controls respect phone safe areas without covering auth forms', () => {
  assert.match(responsiveCss, /min-height:\s*44px/);
  assert.match(responsiveCss, /safe-area-inset-right/);
  assert.match(themeSwitcher, /safe-area-inset-left/);
  assert.match(responsiveCss, /safe-area-inset-bottom/);
  assert.match(responsiveCss, /100dvh/);
  assert.match(themeSwitcher, /isAuthSurface/);
  assert.match(themeSwitcher, /sign-up-login-screen/);
  assert.match(themeSwitcher, /hasHostedSwitcher !== false \|\| isAuthSurface/);
});

test('catalog filters and SaaS tables stay inside scroll containers', () => {
  assert.match(catalog, /overflow-x-auto/);
  assert.match(catalog, /min-w-max/);
  assert.match(invoiceFlow, /mt-4 overflow-x-auto/);
  assert.match(invoiceFlow, /min-w-\[850px\]/);
  assert.match(leadFollow, /mt-4 overflow-x-auto/);
  assert.match(leadFollow, /min-w-\[920px\]/);
});

test('latest checkout remains mobile-first while summary becomes sticky only on desktop', () => {
  assert.match(checkout, /grid grid-cols-1 lg:grid-cols-5/);
  assert.match(checkout, /lg:sticky lg:top-24/);
  assert.match(checkout, /min-w-0/);
  assert.match(checkout, /safe-area-inset-bottom/);
});
