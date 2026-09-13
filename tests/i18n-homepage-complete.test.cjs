const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const homepage = fs.readFileSync(path.join(root, 'src/app/page.tsx'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/lib/i18n-homepage.ts'), 'utf8');
const provider = fs.readFileSync(path.join(root, 'src/contexts/LanguageContext.tsx'), 'utf8');
const normalizedHomepage = homepage.replace(/\s+/g, ' ');

const visibleHomepagePhrases = [
  'AI Tool',
  'Digital Kit',
  'SaaS App',
  'Featured products',
  'Start with a real tool for a real business workflow.',
  'View all products',
  'No published products are available right now.',
  'Products appear here only after they have an active production offer.',
  'Choose the type of tool you need.',
  'Focused software for recurring operational workflows such as invoicing and client management.',
  'View SaaS Apps',
  'AI-assisted tools built around practical customer workflows rather than model-name marketing.',
  'Browse AI Tools',
  'Ready-to-use kits, templates, and implementation assets you can apply to real work.',
  'Explore Digital Products',
  'Buy with clarity',
  'Product value first. Trust built into the purchase flow.',
  'Verified checkout',
  'Paid access follows payment-provider confirmation rather than a browser redirect alone.',
  'Account-based access',
  'Orders and eligible product access stay connected to the purchasing account.',
  'Protected digital delivery',
  'Eligible downloads remain behind the protected post-purchase delivery flow.',
  'Payment availability',
  'Checkout only shows payment methods that are currently available for the selected order.',
  'Find your next tool',
  'Choose the product that matches the workflow you want to improve.',
  'Explore Products',
  'Contact Support',
];

test('all explicitly rendered homepage marketing copy has an Arabic translation', () => {
  for (const phrase of visibleHomepagePhrases) {
    assert.ok(normalizedHomepage.includes(phrase), `homepage phrase moved or changed: ${phrase}`);
    assert.ok(translations.includes(`'${phrase}'`) || translations.includes(`\"${phrase}\"`), `missing Arabic homepage translation: ${phrase}`);
  }
});

test('language provider applies the homepage translation layer before shared surface translation', () => {
  assert.match(provider, /translateHomepageText/);
  assert.match(provider, /const homepage = translateHomepageText\(value\)/);
});
