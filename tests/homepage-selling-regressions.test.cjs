const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const homepage = read('src/app/page.tsx');
const hero = read('src/app/components/HeroSection.tsx');
const authScreen = read('src/app/sign-up-login-screen/components/AuthScreen.tsx');
const productPreview = read('src/components/catalog/ProductProofPreview.tsx');
const cryptoStatus = read('src/app/api/payment/crypto-status/route.ts');
const publicCatalog = read('src/lib/catalog/publicCatalog.ts');
const pricingCatalog = read('src/components/catalog/PricingCatalogClient.tsx');
const pricingView = read('src/components/catalog/PricingCatalogView.tsx');
const publicHomepageMarketing = `${homepage}\n${hero}`;

test('public homepage marketing never links to admin routes', () => {
  assert.doesNotMatch(publicHomepageMarketing, /href=["'`]\/admin(?:\/|["'`])/i);
  assert.doesNotMatch(publicHomepageMarketing, /\/admin\/ai/i);
});

test('homepage does not make a fixed GPT-4 model claim', () => {
  assert.doesNotMatch(publicHomepageMarketing, /\bGPT[- ]?4(?:\.\d+)?\b/i);
});

test('homepage avoids fake static business metrics and guaranteed outcomes', () => {
  const forbiddenClaims = [
    /\b\d[\d,]*\+?\s+(?:customers|users|businesses|countries)\b/i,
    /\b\d+(?:\.\d+)?%\s+(?:uptime|conversion|growth|increase|revenue)\b/i,
    /\btrusted by\s+\d/i,
    /\b(?:4|5)(?:\.\d)?\s*\/\s*5\b/i,
    /\bguaranteed?\s+(?:results|sales|revenue|growth|conversions?)\b/i,
  ];

  for (const claim of forbiddenClaims) assert.doesNotMatch(publicHomepageMarketing, claim);
});

test('featured homepage products and prices come from active production records', () => {
  assert.match(homepage, /getPublicCatalog/);
  assert.match(publicCatalog, /\/rest\/v1\/products/);
  assert.match(publicCatalog, /product_plans!inner/);
  assert.match(publicCatalog, /status', 'eq\.active'/);
  assert.match(publicCatalog, /plans\.is_active', 'eq\.true'/);
  assert.match(publicCatalog, /revalidate: 300/);
  assert.match(homepage, /getEffectivePrice/);
  assert.match(homepage, /summeca-invoiceflow/);
  assert.match(homepage, /summeca-leadfollow-ai/);
  assert.match(homepage, /summeca-proposalflow-ai/);
  assert.doesNotMatch(homepage, /conversion-rescue-kit-pro/);
  assert.doesNotMatch(homepage, /ecommerce-product-page-conversion-kit/);
  assert.match(publicCatalog, /PUBLIC_PRODUCT_SLUGS/);
  assert.match(homepage, /Starting at/);
  assert.doesNotMatch(homepage, /\$(?:29|39|49|59|79|89|99|129|149)(?:\b|\.)/);
});

test('pricing fetches production catalog server-side and uses the shared effective-price helper', () => {
  assert.match(pricingCatalog, /getPublicCatalog/);
  assert.match(pricingCatalog, /<PricingCatalogView products=\{products\} \/>/);
  assert.match(pricingView, /getEffectivePrice/);
  assert.doesNotMatch(pricingCatalog, /['"]use client['"]/);
  assert.doesNotMatch(pricingCatalog, /createClient/);
  assert.doesNotMatch(pricingCatalog, /useEffect|useState/);
  assert.doesNotMatch(pricingView, /createClient/);
  assert.match(publicCatalog, /description,price,currency,billing_period,features/);
});

test('homepage does not advertise an unavailable payment provider as live', () => {
  assert.doesNotMatch(publicHomepageMarketing, /\bPayoneer payments available\b/i);
  assert.doesNotMatch(publicHomepageMarketing, /\bCrypto payments available\b/i);
  assert.doesNotMatch(publicHomepageMarketing, /\bNOWPayments available\b/i);
  assert.match(homepage, /Checkout only shows payment methods that are currently available/);
  assert.match(cryptoStatus, /const available = Boolean/);
});

test('hero leads with InvoiceFlow free access and keeps the broader product catalog available', () => {
  assert.match(hero, /href="\/products\/summeca-invoiceflow"/);
  assert.match(hero, /Explore InvoiceFlow/);
  assert.match(hero, /destination: 'summeca-invoiceflow'/);
  assert.match(hero, /href="\/products\/summeca-leadfollow-ai"/);
  assert.match(hero, /Explore LeadFollow AI/);
  assert.match(hero, /destination: 'summeca-leadfollow-ai'/);
  assert.match(hero, /ProposalFlow AI/);
  assert.match(hero, /href="\/products"/);
  assert.match(hero, /View all products/);
  assert.match(hero, /homepage_view/);
});

test('homepage and authentication show product evidence instead of a cursor-following robot', () => {
  assert.match(hero, /WorkspaceOverviewPreview/);
  assert.match(authScreen, /WorkspaceOverviewPreview/);
  assert.doesNotMatch(hero, /SplineNexbotScene/);
  assert.doesNotMatch(authScreen, /SplineNexbotScene/);
  assert.match(productPreview, /InvoiceFlow workspace/);
  assert.match(productPreview, /LeadFollow AI workspace/);
  assert.match(productPreview, /Protected ZIP contents/);
  assert.match(productPreview, /SAMPLE DATA/);
});
