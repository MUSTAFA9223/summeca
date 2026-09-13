const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const switcher = fs.readFileSync(path.join(root, 'src/components/LanguageSwitcher.tsx'), 'utf8');

test('top language control visibly offers English and Arabic', () => {
  assert.match(switcher, />\s*EN\s*</);
  assert.match(switcher, />\s*العربية\s*</);
});
