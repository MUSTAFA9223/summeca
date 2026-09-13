const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const scope = fs.readFileSync(path.join(root, 'src/lib/i18n-readme.ts'), 'utf8');

test('bilingual implementation declares sitewide English Arabic scope', () => {
  assert.match(scope, /en-ar-sitewide/);
});
