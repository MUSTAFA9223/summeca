const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const homepage = fs.readFileSync(path.join(root, 'src/app/page.tsx'), 'utf8');
const hero = fs.readFileSync(path.join(root, 'src/app/components/HeroSection.tsx'), 'utf8');
const nav = fs.readFileSync(path.join(root, 'src/components/PublicNav.tsx'), 'utf8');
const translations = fs.readFileSync(path.join(root, 'src/lib/i18n-homepage.ts'), 'utf8');
const provider = fs.readFileSync(path.join(root, 'src/contexts/LanguageContext.tsx'), 'utf8');
const normalizedMarketing = `${homepage}\n${nav}`.replace(/\s+/g, ' ');

const translatedHomepagePhrases = [
  'AI-assisted workspace',
  'Downloadable digital kit',
  'SaaS workspace',
  'Business Template',
  'For Stores',
  'Products',
  'Pricing',
  'Support',
  'Get Started',
  'Real products, real interfaces',
  'Start with the store workflow slowing you down today.',
  'View all products',
  'No published products are available right now.',
  'Products appear here only after they have an active production offer.',
  'Solutions for small stores',
  'Choose the outcome you need, not a software category.',
  'Keep invoicing organized',
  'Use a focused invoicing workflow instead of piecing together manual records across multiple tools.',
  'Explore InvoiceFlow',
  'Follow up consistently',
  'Keep customer and lead follow-up moving with an AI-assisted workflow built around practical next actions.',
  'Explore LeadFollow',
  'Improve conversion pages',
  'Apply ready-to-use conversion assets and implementation guidance without starting every page from a blank screen.',
  'View Conversion Kit',
  'Buy with clarity',
  'See what you are buying before checkout.',
  'Verified checkout',
  'Paid access follows payment-provider confirmation rather than a browser redirect alone.',
  'Account-based access',
  'Orders and eligible product access stay connected to the purchasing account.',
  'Eligible downloads remain behind the protected post-purchase delivery flow.',
  'Payment availability',
  'Checkout only shows payment methods that are currently available for the selected order.',
  'Find your next tool',
  'Start with one workflow, then add only what your store needs.',
  'Create an account to access your dashboard, or review live production pricing before you decide.',
  'View Pricing',
];

test('all shared homepage marketing copy has an Arabic translation', () => {
  for (const phrase of translatedHomepagePhrases) {
    assert.ok(normalizedMarketing.includes(phrase), `homepage phrase moved or changed: ${phrase}`);
    assert.ok(
      translations.includes(`'${phrase}'`) || translations.includes(`\"${phrase}\"`),
      `missing Arabic homepage translation: ${phrase}`,
    );
  }
});

test('hero owns natural English and Arabic copy and explicit RTL direction', () => {
  for (const phrase of [
    'Practical apps for modern small online businesses',
    'Organize invoices and customer follow-ups',
    'with focused SUMMECA apps.',
    'Explore InvoiceFlow',
    'Explore LeadFollow AI',
    'View all products',
    'Transparent pricing',
    'Protected checkout',
    'Account-based access',
    'Customer support',
    'تطبيقات عملية للأعمال والمتاجر الرقمية الصغيرة',
    'نظّم الفواتير ومتابعة العملاء',
    'بتطبيقات SUMMECA العملية.',
    'استكشف InvoiceFlow',
    'استكشف LeadFollow AI',
    'عرض كل المنتجات',
    'أسعار واضحة',
    'دفع محمي',
    'وصول مرتبط بالحساب',
    'دعم العملاء',
  ]) {
    assert.ok(hero.includes(phrase), `missing bilingual hero copy: ${phrase}`);
  }
  assert.match(hero, /dir=\{isArabic \? 'rtl' : 'ltr'\}/);
});

test('language provider applies the homepage translation layer before shared surface translation', () => {
  assert.match(provider, /translateHomepageText/);
  assert.match(provider, /const homepage = translateHomepageText\(value\)/);
});