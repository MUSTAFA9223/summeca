const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (relativePath) => fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');

const layout = read('src/app/layout.tsx');
const accessibilityCss = read('src/styles/accessibility-motion-performance.css');
const skipToContent = read('src/components/SkipToContent.tsx');
const productShowcase = read('src/components/catalog/Product3DShowcase.tsx');
const productVideo = read('src/components/catalog/ProductPageVideoPreview.tsx');
const notFound = read('src/app/not-found.tsx');

test('root layout loads Prompt 11 accessibility and motion guardrails last', () => {
  assert.match(layout, /import '\.\.\/styles\/accessibility-motion-performance\.css';/);
  assert.match(layout, /<LanguageProvider[\s\S]*?<SkipToContent \/>/);
});

test('keyboard focus and reduced motion have site-wide fallbacks', () => {
  assert.match(accessibilityCss, /:focus-visible\s*\{/);
  assert.match(accessibilityCss, /outline:\s*3px solid var\(--ring\)/);
  assert.match(accessibilityCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(accessibilityCss, /animation-duration:\s*0\.01ms !important/);
  assert.match(accessibilityCss, /transition-duration:\s*0\.01ms !important/);
  assert.match(accessibilityCss, /scroll-behavior:\s*auto !important/);
});

test('continuous decorative motion is disabled and entrance motion stays brief', () => {
  assert.match(
    accessibilityCss,
    /\.float-animation,[\s\S]*?\.summeca-hero-word\s*\{[\s\S]*?animation:\s*none !important;/,
  );
  assert.match(
    accessibilityCss,
    /\.fade-in,[\s\S]*?\.summeca-reveal\s*\{[\s\S]*?animation-duration:\s*220ms !important;/,
  );
});

test('Light Premium primary controls use a readable foreground and stronger muted text', () => {
  assert.match(
    accessibilityCss,
    /html\[data-site-theme='light'\][\s\S]*?--primary-foreground:\s*#041014;/,
  );
  assert.match(
    accessibilityCss,
    /html\[data-site-theme='light'\][\s\S]*?--muted-foreground:\s*#52727a;/,
  );
});

test('skip link supports English and Arabic and moves keyboard focus to main content', () => {
  assert.match(skipToContent, /Skip to main content/);
  assert.match(skipToContent, /انتقل إلى المحتوى الرئيسي/);
  assert.match(skipToContent, /document\.querySelector<HTMLElement>\('main'\)/);
  assert.match(skipToContent, /main\.focus\(\{ preventScroll: true \}\)/);
  assert.match(skipToContent, /href="#main-content"/);
});

test('product screenshots reserve intrinsic space and preserve loading priority', () => {
  assert.match(productShowcase, /width=\{1200\}/);
  assert.match(productShowcase, /height=\{675\}/);
  assert.match(productShowcase, /loading=\{hero \? 'eager' : 'lazy'\}/);
  assert.match(productShowcase, /decoding="async"/);
});

test('product video avoids heavy autoplay and reserves a stable aspect ratio', () => {
  assert.match(productVideo, /className="relative aspect-video/);
  assert.match(productVideo, /preload="metadata"/);
  assert.doesNotMatch(productVideo, /\sautoplay(?:\s|=|>)/i);
});

test('404 page uses semantic main heading and a real home link', () => {
  assert.match(notFound, /<main[\s\S]*?aria-labelledby="not-found-title"/);
  assert.match(notFound, /<h1 id="not-found-title"/);
  assert.match(notFound, /<Link\s+[\s\S]*?href="\/"/);
  assert.match(notFound, /aria-hidden="true"[\s\S]*?>404</);
});
