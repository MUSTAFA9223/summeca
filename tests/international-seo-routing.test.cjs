const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const routing = read('src/lib/locale-routing.ts');
const middleware = read('src/middleware.ts');
const layout = read('src/app/layout.tsx');
const sitemap = read('src/app/sitemap.ts');
const productLayout = read('src/app/products/[slug]/layout.tsx');

test('public SEO routing publishes English only and preserves legacy Arabic URLs', () => {
  assert.match(routing, /SEO_LOCALES[^\n]+\['en'\]/);
  assert.doesNotMatch(routing, /SEO_LOCALES[^\n]+\['en', 'ar'\]/);
  assert.match(middleware, /pathLocale === 'ar'/);
  assert.match(middleware, /localizePublicPath\(publicPath, 'en'\)/);
  assert.match(middleware, /NextResponse\.redirect\(englishUrl, 301\)/);
  assert.match(middleware, /Content-Language', 'en'/);
});

test('root metadata emits only English and x-default alternates', () => {
  assert.match(layout, /localizedAlternates\(publicPath\)/);
  assert.match(routing, /languages:\s*\{\s*en,\s*'x-default': en/s);
  assert.doesNotMatch(routing, /languages:\s*\{[^}]*\bar\b/s);
  assert.match(layout, /inLanguage: 'en'/);
});

test('sitemap publishes only the English localized public and product URLs', () => {
  assert.match(sitemap, /for \(const locale of SEO_LOCALES\)/);
  assert.match(sitemap, /\/products\/\$\{encodeURIComponent\(product\.slug\)\}/);
  assert.match(routing, /SEO_LOCALES[^\n]+\['en'\]/);
});

test('root layout is pinned to English instead of a persisted language cookie', () => {
  assert.match(layout, /const language = 'en' as const/);
  assert.match(layout, /const direction = 'ltr' as const/);
  assert.doesNotMatch(layout, /await cookies\(\)/);
  assert.doesNotMatch(layout, /GlobalLanguageSwitcher/);
});

test('product SEO schema uses the English localized canonical URL', () => {
  assert.match(productLayout, /canonicalFor\(slug: string, locale: SeoLocale\)/);
  assert.match(productLayout, /localizedAbsoluteUrl/);
  assert.match(productLayout, /inLanguage: locale/);
});
