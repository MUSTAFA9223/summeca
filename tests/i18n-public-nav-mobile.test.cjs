const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'src/components/PublicNav.tsx'), 'utf8');

test('mobile header is English-only and keeps the menu control', () => {
  assert.doesNotMatch(nav, /LanguageSwitcher/);
  assert.match(nav, /aria-label="Toggle mobile menu"/);
});

test('public account navigation keeps logical edge utilities', () => {
  assert.match(nav, /absolute end-0 top-full/);
  assert.match(nav, /ps-\[23px\]/);
  assert.doesNotMatch(nav, /absolute right-0 top-full/);
  assert.doesNotMatch(nav, /pl-\[23px\]/);
});
