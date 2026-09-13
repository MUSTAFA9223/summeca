const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const provider = fs.readFileSync(path.join(root, 'src/contexts/LanguageContext.tsx'), 'utf8');

test('Arabic sets RTL and English sets LTR through the shared provider', () => {
  assert.match(provider, /language === 'ar' \? 'rtl' : 'ltr'/);
  assert.match(provider, /document\.documentElement\.lang = language/);
});
