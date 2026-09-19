const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/catalog/ProductPageEnhancements.tsx', 'utf8');

test('mobile sticky checkout CTA respects device bottom safe area', () => {
  assert.match(source, /env\(safe-area-inset-bottom\)/);
  assert.match(source, /max\(0\.75rem, env\(safe-area-inset-bottom\)\)/);
  assert.match(source, /className="fixed inset-x-3 z-\[105\]/);
  assert.match(source, /min-h-12/);
});
