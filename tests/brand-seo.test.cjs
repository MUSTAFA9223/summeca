const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const layout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');
const home = fs.readFileSync(path.join(root, 'src/app/page.tsx'), 'utf8');

test('homepage keeps brand-focused canonical metadata and schema', () => {
  assert.match(layout, /SUMMECA — AI & SaaS Tools for Modern Business/);
  assert.match(layout, /'@id': 'https:\/\/summeca\.com\/#webpage'/);
  assert.match(layout, /SUMMECA provides focused AI and SaaS tools/);
  assert.match(home, /canonical: 'https:\/\/summeca\.com\/'/);
  assert.match(home, /siteName: 'SUMMECA'/);
  assert.match(home, /'max-image-preview': 'large'/);
});
