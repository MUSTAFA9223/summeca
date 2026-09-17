const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sitemap = fs.readFileSync(path.join(root, 'src/app/sitemap.ts'), 'utf8');

test('static sitemap routes do not claim a fresh lastModified on every revalidation', () => {
  assert.doesNotMatch(sitemap, /const now = new Date\(\)/);
  assert.doesNotMatch(sitemap, /lastModified:\s*now/);
  assert.match(sitemap, /Static routes intentionally omit lastModified/);
});

test('product sitemap dates come only from valid product updated_at values', () => {
  assert.match(sitemap, /function validDate/);
  assert.match(sitemap, /validDate\(product\.updated_at\)/);
  assert.match(sitemap, /\.\.\.\(lastModified \? \{ lastModified \} : \{\}\)/);
});
