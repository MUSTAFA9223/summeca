const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const layout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');
const provider = fs.readFileSync(path.join(root, 'src/contexts/LanguageContext.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src/styles/i18n.css'), 'utf8');

test('document language and direction are derived from the persisted language on the server', () => {
  assert.match(layout, /await cookies\(\)/);
  assert.match(layout, /cookieStore\.get\(LANGUAGE_COOKIE_KEY\)/);
  assert.match(layout, /language === 'ar' \? 'rtl' : 'ltr'/);
  assert.match(layout, /lang=\{language\}/);
  assert.match(layout, /dir=\{direction\}/);
  assert.match(layout, /data-language=\{language\}/);
  assert.match(layout, /<LanguageProvider initialLanguage=\{language\}>/);
});

test('client localization starts from the server language without mutating root direction after hydration', () => {
  assert.match(provider, /initialLanguage = 'en'/);
  assert.match(provider, /useState<AppLanguage>\(initialLanguage\)/);
  assert.doesNotMatch(provider, /document\.documentElement\.lang\s*=/);
  assert.doesNotMatch(provider, /document\.documentElement\.dir\s*=/);
});

test('Arabic typography avoids forced tracking and broken word wrapping', () => {
  assert.match(styles, /line-height:\s*1\.7/);
  assert.match(styles, /word-break:\s*normal/);
  assert.match(styles, /overflow-wrap:\s*break-word/);
  assert.match(styles, /\[class\*='tracking-'\][\s\S]*letter-spacing:\s*normal\s*!important/);
});
