const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/components/GlobalLanguageSwitcher.tsx'), 'utf8');

test('standalone pages get a top-level bilingual selector below the launch banner when no host exists', () => {
  assert.match(source, /hasHostedSwitcher/);
  assert.match(source, /--launch-offer-height/);
  assert.match(source, /safe-area-inset-top/);
  assert.match(source, /LanguageSwitcher/);
});
