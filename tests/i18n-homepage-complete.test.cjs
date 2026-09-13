const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const homepage = fs.readFileSync(path.join(root, 'src/app/page.tsx'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/lib/i18n-homepage.ts'), 'utf8');
const provider = fs.readFileSync(path.join(root, 'src/contexts/LanguageContext.tsx'), 'utf8');

const visibleHomepagePhrases = [
  'Featured products',
  'Start with a real tool for a real business workflow.',
  'Explore current SUMMECA products with pricing pulled from the same active production plans used by the catalog.',
  'View all products',
  'Choose the type of tool you need.',
  'Focused software for recurring operational workflows such as invoicing and client management.',
  'AI-assisted tools built around practical customer workflows rather than model-name marketing.',
  'Ready-to-use kits, templates, and implementation assets you can apply to real work.',
  'Built around outcomes',
  'Spend less time wrestling with the workflow.',
  'Organize billing',
  'Keep follow-ups moving',
  'Improve landing pages',
  'SaaS products',
  'Software you can put to work.',
  'Buy with clarity',
  'Product value first. Trust built into the purchase flow.',
  'The storefront keeps purchase and access protections in place without turning backend implementation into marketing copy.',
  'Verified checkout',
  'Paid access follows payment-provider confirmation rather than a browser redirect alone.',
  'Account-based access',
  'Orders and eligible product access stay connected to the purchasing account.',
  'Protected digital delivery',
  'Eligible downloads remain behind the protected post-purchase delivery flow.',
  'Payment availability',
  'Checkout only shows payment methods that are currently available for the selected order.',
  'AI where it helps',
  'Practical AI assistance inside a customer workflow.',
  'Lead follow-up without autopilot claims',
  'Organize leads and keep the next follow-up action visible.',
  'Generate focused drafts for supported outreach channels using the facts you provide.',
  'Find your next tool',
  'Choose the product that matches the workflow you want to improve.',
  'Compare current offers, review the product details, and continue only when the fit and pricing make sense for you.',
  'Contact Support',
];

test('all explicitly rendered homepage marketing copy has an Arabic translation', () => {
  for (const phrase of visibleHomepagePhrases) {
    assert.ok(homepage.includes(phrase), `homepage phrase moved or changed: ${phrase}`);
    assert.ok(translations.includes(`'${phrase}'`) || translations.includes(`\"${phrase}\"`), `missing Arabic homepage translation: ${phrase}`);
  }
});

test('language provider applies the homepage translation layer before shared surface translation', () => {
  assert.match(provider, /translateHomepageText/);
  assert.match(provider, /const homepage = translateHomepageText\(value\)/);
});
