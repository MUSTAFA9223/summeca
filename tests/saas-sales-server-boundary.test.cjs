const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const base = read('src/components/catalog/SaasProductSalesExperienceBase.tsx');
const wrapper = read('src/components/catalog/SaasProductSalesExperience.tsx');
const preview = read('src/components/catalog/SaasRealProductPreview.tsx');

test('static SaaS sales experience stays server rendered', () => {
  assert.doesNotMatch(base, /['"]use client['"]/);
  assert.doesNotMatch(wrapper, /['"]use client['"]/);
  assert.doesNotMatch(wrapper, /useEffect|useState|createPortal/);
  assert.match(wrapper, /BaseSaasProductSalesExperience/);
  assert.match(wrapper, /SaasRealProductPreview/);
});

test('real product demo remains isolated to the client boundary', () => {
  assert.match(preview, /^'use client';/);
  assert.match(preview, /createPortal/);
  assert.match(preview, /summeca-invoiceflow-6s\.mp4/);
  assert.match(preview, /summeca-leadfollow-ai-6s\.mp4/);
  assert.match(preview, /REAL PRODUCT DEMO/);
});
