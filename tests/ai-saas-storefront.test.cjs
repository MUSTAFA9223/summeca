const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

test('public storefront is limited to the four focused AI and SaaS apps', () => {
  const catalog = read('src/lib/catalog/publicCatalog.ts');
  const home = read('src/app/page.tsx');
  const hero = read('src/app/components/HeroSection.tsx');

  for (const slug of [
    'summeca-siteagent-ai',
    'summeca-leadfollow-ai',
    'summeca-proposalflow-ai',
    'summeca-invoiceflow',
  ]) {
    assert.match(catalog, new RegExp(slug));
    assert.match(home, new RegExp(slug));
  }

  assert.match(catalog, /url\.searchParams\.set\('slug',/);
  assert.doesNotMatch(home, /href="\/products\/conversion-rescue-kit-pro"/);
  assert.match(home, /Turn website visitors into leads, proposals, and invoices with SUMMECA\./);
  assert.match(hero, /Focused AI & SaaS apps for modern business/);
  assert.match(hero, /ProposalFlow AI/);
});
