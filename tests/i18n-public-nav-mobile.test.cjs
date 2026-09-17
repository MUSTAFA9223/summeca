const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'src/components/PublicNav.tsx'), 'utf8');

test('mobile header keeps the bilingual selector beside the menu control', () => {
  assert.match(nav, /lg:hidden[\s\S]*<LanguageSwitcher compact \/>/);
});

test('public account navigation uses logical edges in LTR and RTL', () => {
  assert.match(nav, /absolute end-0 top-full/);
  assert.match(nav, /ps-\[23px\]/);
  assert.doesNotMatch(nav, /absolute right-0 top-full/);
  assert.doesNotMatch(nav, /pl-\[23px\]/);
});
