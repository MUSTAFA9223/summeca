const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const catalog = fs.readFileSync(path.resolve(__dirname, '../src/components/catalog/CatalogClient.tsx'), 'utf8');

test('catalog sort control uses the same neutral pill surface as inactive category filters', () => {
  assert.match(
    catalog,
    /<select[\s\S]*?className="rounded-lg border border-white\/10 bg-white\/\[0\.035\][^"]*text-slate-400/,
  );
  assert.doesNotMatch(
    catalog,
    /<select[\s\S]*?className="[^"]*bg-\[#0b1117\][^"]*"/,
  );
});
