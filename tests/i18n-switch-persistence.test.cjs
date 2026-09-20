const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const layout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');
const middleware = fs.readFileSync(path.join(root, 'src/middleware.ts'), 'utf8');

test('persisted legacy language preferences no longer control the rendered site language', () => {
  assert.match(layout, /const language = 'en' as const/);
  assert.doesNotMatch(layout, /LANGUAGE_COOKIE_KEY|cookieLanguage|requestedLanguage/);
  assert.match(middleware, /pathLocale && isPublicSeoPath/);
  assert.match(middleware, /canonicalUrl\.pathname = stripLocalePrefix\(path\)/);
  assert.match(middleware, /NextResponse\.redirect\(canonicalUrl, 308\)/);
});
