const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const salesExperience = fs.readFileSync(
  'src/components/catalog/SaasProductSalesExperience.tsx',
  'utf8',
);
const deployWorkflow = fs.readFileSync(
  '.github/workflows/deploy-cloudflare.yml',
  'utf8',
);

test('SaaS sales pages are ready for verified real product demo videos', () => {
  assert.match(salesExperience, /DEMO_VIDEO_BY_SLUG/);
  assert.match(salesExperience, /summeca-invoiceflow/);
  assert.match(salesExperience, /summeca-leadfollow-ai/);
  assert.match(salesExperience, /<video/);
  assert.match(salesExperience, /preload="metadata"/);
  assert.match(salesExperience, /REAL PRODUCT DEMO/);
  assert.match(salesExperience, /6-second real product walkthrough/);
  assert.match(salesExperience, /0:06/);
  assert.match(salesExperience, /aria-label=\{`Play \$\{product\.name\} 6-second demo`\}/);
  assert.match(salesExperience, /videoFailed/);
  assert.match(salesExperience, /ACTUAL PRODUCT/);
  assert.doesNotMatch(salesExperience, /autoPlay/);
});

test('SaaS sales shell aligns first-screen content with the 70px public navigation', () => {
  assert.match(salesExperience, /padding-top: 70px !important/);
  assert.match(salesExperience, /@media \(max-width: 639px\)/);
  assert.match(salesExperience, /padding-top: 1\.5rem/);
});

test('production deployment waits for successful main CI and checks out that validated SHA', () => {
  assert.match(deployWorkflow, /workflow_run:/);
  assert.match(deployWorkflow, /workflows:\s*\n\s*- CI/);
  assert.match(deployWorkflow, /workflow_run\.conclusion == 'success'/);
  assert.match(deployWorkflow, /workflow_run\.event == 'push'/);
  assert.match(deployWorkflow, /workflow_run\.head_branch == 'main'/);
  assert.match(deployWorkflow, /TARGET_SHA:/);
  assert.match(deployWorkflow, /ref: \$\{\{ env\.TARGET_SHA \}\}/);
  assert.match(deployWorkflow, /Semantic lint/);
});
