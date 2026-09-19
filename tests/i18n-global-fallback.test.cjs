const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const layout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');

test('English-only layout does not mount the legacy global language selector', () => {
  assert.doesNotMatch(layout, /GlobalLanguageSwitcher/);
  assert.match(layout, /<LanguageProvider initialLanguage=\{language\}>/);
  assert.match(layout, /const language = 'en' as const/);
});
