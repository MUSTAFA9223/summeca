const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const layout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');
const provider = fs.readFileSync(path.join(root, 'src/contexts/LanguageContext.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src/styles/i18n.css'), 'utf8');

test('document language and direction are fixed to English LTR', () => {
  assert.match(layout, /const language = 'en' as const/);
  assert.match(layout, /const direction = 'ltr' as const/);
  assert.match(layout, /cookieStore\.get\('summeca:theme'\)/);
  assert.doesNotMatch(layout, /cookieStore\.get\(['"](?:language|locale|summeca:language)['"]\)/);
  assert.match(layout, /lang=\{language\}/);
  assert.match(layout, /dir=\{direction\}/);
  assert.match(layout, /data-language=\{language\}/);
  assert.match(layout, /<LanguageProvider initialLanguage=\{language\}>/);
});

test('legacy translation machinery cannot alter root direction after hydration', () => {
  assert.match(provider, /initialLanguage = 'en'/);
  assert.match(provider, /useState<AppLanguage>\(initialLanguage\)/);
  assert.doesNotMatch(provider, /document\.documentElement\.lang\s*=/);
  assert.doesNotMatch(provider, /document\.documentElement\.dir\s*=/);
});

test('legacy RTL styles remain non-destructive for internal compatibility', () => {
  assert.match(styles, /line-height:\s*1\.7/);
  assert.match(styles, /word-break:\s*normal/);
  assert.match(styles, /overflow-wrap:\s*break-word/);
});
