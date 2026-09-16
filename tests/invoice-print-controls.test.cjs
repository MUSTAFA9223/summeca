const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const language = fs.readFileSync('src/components/GlobalLanguageSwitcher.tsx', 'utf8');
const theme = fs.readFileSync('src/components/GlobalThemeSwitcher.tsx', 'utf8');
const assistant = fs.readFileSync('src/components/StoreAssistant.tsx', 'utf8');
const invoice = fs.readFileSync('src/app/invoice/[token]/page.tsx', 'utf8');

test('global controls stay out of invoice print and PDF output', () => {
  assert.match(language, /fixed[^"`]*print:hidden/);
  assert.match(theme, /fixed[^"`]*print:hidden/);
  assert.equal((assistant.match(/print:hidden/g) ?? []).length, 2);
  assert.match(invoice, /print:max-w-none print:border-0 print:shadow-none/);
});
