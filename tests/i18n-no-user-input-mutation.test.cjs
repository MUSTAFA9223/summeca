const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const provider = fs.readFileSync(path.join(root, 'src/contexts/LanguageContext.tsx'), 'utf8');

test('localizer only watches presentation attributes and text nodes, not input values', () => {
  assert.match(provider, /TRANSLATABLE_ATTRIBUTES/);
  assert.match(provider, /'placeholder'/);
  assert.doesNotMatch(provider, /attributeFilter:[\s\S]*'value'/);
});
