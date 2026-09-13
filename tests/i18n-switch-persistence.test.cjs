const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const provider = fs.readFileSync(path.join(root, 'src/contexts/LanguageContext.tsx'), 'utf8');
const catalog = fs.readFileSync(path.join(root, 'src/lib/i18n.ts'), 'utf8');

test('language preference persists between pages and sessions', () => {
  assert.match(catalog, /summeca\.language/);
  assert.match(catalog, /summeca_language/);
  assert.match(provider, /localStorage\.setItem\(LANGUAGE_STORAGE_KEY/);
  assert.match(provider, /Max-Age=31536000/);
  assert.match(provider, /window\.location\.reload\(\)/);
});
