const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/components/GlobalLanguageSwitcher.tsx'), 'utf8');

test('standalone pages get a top-level bilingual selector when no host exists', () => {
  assert.match(source, /hasHostedSwitcher/);
  assert.match(source, /top-4/);
  assert.match(source, /LanguageSwitcher/);
});
