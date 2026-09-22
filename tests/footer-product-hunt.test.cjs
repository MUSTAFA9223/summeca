const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const footer = fs.readFileSync(path.join(root, 'src/components/PublicFooter.tsx'), 'utf8');

test('Product Hunt remains a local text link without a fragile or fake badge asset', () => {
  assert.match(footer, /View SUMMECA on Product Hunt/);
  assert.match(
    footer,
    /https:\/\/www\.producthunt\.com\/products\/summeca\?utm_source=other&utm_medium=social/
  );
  assert.match(footer, /target="_blank"/);
  assert.match(footer, /rel="noopener noreferrer"/);
  assert.doesNotMatch(footer, /api\.producthunt\.com/i);
  assert.doesNotMatch(footer, /ProductHuntIcon/);
  assert.doesNotMatch(footer, /Featured on Product Hunt/i);
  assert.doesNotMatch(footer, /<img[^>]+producthunt/i);
});

test('footer exposes the exact tools.cafe verification badge required by the free listing', () => {
  assert.match(footer, /href=\{TOOLS_CAFE_URL\}/);
  assert.match(footer, /src="https:\/\/tools\.cafe\/b\/light\.svg"/);
  assert.match(footer, /alt="Featured on tools\.cafe"/);
  assert.match(footer, /width="256"/);
  assert.match(footer, /height="80"/);
});

test('footer exposes the exact Launchstag verification badge required by the free listing', () => {
  assert.match(footer, /href=\{LAUNCHSTAG_URL\}/);
  assert.match(footer, /https:\/\/launchstag\.com\/p\/summeca/);
  assert.match(footer, /src="https:\/\/launchstag\.com\/badge-light\.svg"/);
  assert.match(footer, /alt="Featured on Launchstag"/);
  assert.match(footer, /width="198"/);
  assert.match(footer, /height="62"/);
});

test('footer exposes the SellWithBoost backlink and official badge for the free listing', () => {
  assert.match(footer, /href=\{SELLWITHBOOST_URL\}/);
  assert.match(footer, /https:\/\/sellwithboost\.com/);
  assert.match(footer, /src="https:\/\/sellwithboost\.com\/badge\/listing-dark\.svg"/);
  assert.match(footer, /alt="Listed on Sell With boost"/);
  assert.match(footer, /width="160"/);
  assert.match(footer, /height="40"/);
});

test('footer exposes the verified social, contact, support and legal destinations', () => {
  for (const destination of [
    'https://x.com/summeca_',
    'hello@summeca.com',
    '/contact',
    '/support',
    '/faq',
    '/privacy',
    '/terms',
    '/refunds',
    '/shipping',
    '/cookies',
  ]) {
    assert.ok(footer.includes(destination), `missing footer destination: ${destination}`);
  }
});

test('footer keeps mobile touch targets, grouped navigation, and explicit bilingual direction support', () => {
  assert.match(footer, /useLanguage/);
  assert.match(footer, /dir=\{isArabic \? 'rtl' : 'ltr'\}/);
  assert.match(footer, /sm:grid-cols-2/);
  assert.match(footer, /lg:grid-cols-\[1\.55fr_repeat\(4,minmax\(0,1fr\)\)\]/);
  assert.match(footer, /min-h-11/);
  assert.match(footer, /min-h-12/);
  assert.match(footer, /عرض SUMMECA على Product Hunt/);
  assert.match(footer, /سياسة الخصوصية/);
  assert.match(footer, /شروط الخدمة/);
});

test('footer preserves the official local SUMMECA logo component and high-contrast dark surface', () => {
  assert.match(footer, /<AppLogo variant="wordmark" tone="light" size=\{52\} \/>/);
  assert.match(footer, /bg-\[#0A0F1E\] text-white/);
  const footerWithoutDirectoryBadges = footer
    .replace('src="https://tools.cafe/b/light.svg"', 'src="/tools-cafe-badge.svg"')
    .replace('src="https://launchstag.com/badge-light.svg"', 'src="/launchstag-badge.svg"')
    .replace('src="https://sellwithboost.com/badge/listing-dark.svg"', 'src="/sellwithboost-badge.svg"');
  assert.doesNotMatch(footerWithoutDirectoryBadges, /src="https?:\/\//i);
});
