const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const provider = fs.readFileSync(path.join(root, 'src/contexts/LanguageContext.tsx'), 'utf8');

test('brand opt-out hooks are honored by the localization observer', () => {
  assert.match(provider, /\[translate="no"\]/);
  assert.match(provider, /\.notranslate/);
});
