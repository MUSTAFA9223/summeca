const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const provider = read('src/contexts/LanguageContext.tsx');
const rtlStyles = read('src/styles/i18n.css');
const base = read('src/lib/i18n.ts');
const comprehensive = read('src/lib/i18n-comprehensive.ts');

test('technical text and brand-controlled regions stay outside DOM translation', () => {
  assert.match(provider, /\[translate="no"\]/);
  assert.match(provider, /\.notranslate/);
  assert.match(provider, /code/);
  assert.match(provider, /pre/);
  assert.match(base, /looksLikeTechnicalValue/);
  assert.match(comprehensive, /looksTechnical/);
});

test('technical form fields and data-ltr values stay left-to-right under RTL', () => {
  for (const selector of [
    "input[type='email']",
    "input[type='url']",
    "input[type='tel']",
    "input[type='number']",
    '[data-ltr]',
    'code',
    'pre',
  ]) assert.ok(rtlStyles.includes(selector), `missing RTL technical selector: ${selector}`);
  assert.match(rtlStyles, /unicode-bidi: isolate/);
});
