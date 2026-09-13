const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const text = fs.readFileSync(path.join(root, 'src/lib/i18n-readme.ts'), 'utf8');

test('sitewide scope includes public auth checkout customer admin and SaaS surfaces', () => {
  for (const word of ['public', 'auth', 'checkout', 'customer dashboard', 'admin', 'SUMMECA SaaS']) {
    assert.ok(text.includes(word));
  }
});
