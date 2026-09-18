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
const languageContext = read('src/contexts/LanguageContext.tsx');
const productLayout = read('src/app/products/[slug]/layout.tsx');

test('public SEO routing exposes stable English and Arabic URL prefixes', () => {
  assert.match(routing, /SEO_LOCALES[^\n]+\['en', 'ar'\]/);
  assert.match(routing, /localizePublicPath/);
  assert.match(middleware, /NextResponse\.redirect\(localizedUrl, 308\)/);
  assert.match(middleware, /x-summeca-locale/);
  assert.match(middleware, /Content-Language/);
});

test('root metadata emits self canonical and reciprocal hreflang URLs', () => {
  assert.match(layout, /localizedAlternates\(publicPath\)/);
  assert.match(layout, /canonical: alternates\.canonicalByLocale\[locale\]/);
  assert.match(layout, /languages: alternates\.languages/);
});

test('sitemap publishes both localized versions for public and product URLs', () => {
  assert.match(sitemap, /for \(const locale of SEO_LOCALES\)/);
  assert.match(sitemap, /alternates:\s*\{\s*languages: alternates\.languages/s);
  assert.match(sitemap, /\/products\/\$\{encodeURIComponent\(product\.slug\)\}/);
});

test('language switching moves between localized URLs instead of cookie-only reloads', () => {
  assert.match(languageContext, /localizePublicPath\(window\.location\.pathname, nextLanguage\)/);
  assert.match(languageContext, /window\.location\.assign/);
});

test('product SEO schema uses the localized canonical URL', () => {
  assert.match(productLayout, /canonicalFor\(slug: string, locale: SeoLocale\)/);
  assert.match(productLayout, /localizedAbsoluteUrl/);
  assert.match(productLayout, /inLanguage: locale/);
});
