const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'src/styles/i18n.css'), 'utf8');

test('RTL mirrors both customer and admin app sidebars', () => {
  assert.match(css, /data-dashboard-sidebar/);
  assert.match(css, /data-admin-sidebar/);
  assert.match(css, /margin-right: 15rem/);
  assert.match(css, /margin-right: 16rem/);
});
