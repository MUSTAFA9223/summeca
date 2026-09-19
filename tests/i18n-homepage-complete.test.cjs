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
  'AI website agent',
  'AI-assisted workspace',
  'AI proposal workspace',
  'SaaS workspace',
  'AI & SaaS workspace',
  'For Stores',
  'Products',
  'Pricing',
  'Support',
  'Get Started',
  'Focused AI & SaaS products',
  'Turn website visitors into leads, proposals, and invoices with SUMMECA.',
  'View all products',
  'No published products are available right now.',
  'Products appear here only after they have an active production offer.',
  'One connected business workflow',
  'Capture the visitor, qualify the lead, prepare the proposal, then invoice the work.',
  'Keep invoicing organized',
  'Use a focused invoicing workflow instead of piecing together manual records across multiple tools.',
  'Explore InvoiceFlow',
  'Follow up consistently',
  'Keep customer and lead follow-up moving with an AI-assisted workflow built around practical next actions.',
  'Explore LeadFollow',
  'Turn a brief into a proposal',
  'Generate a structured client proposal, scope, deliverables, pricing wording and follow-up in one AI-assisted workspace.',
  'Explore ProposalFlow',
  'Buy with clarity',
  'See what you are buying before checkout.',
  'Verified checkout',
  'Paid access follows payment-provider confirmation rather than a browser redirect alone.',
  'Account-based access',
  'Orders and eligible product access stay connected to the purchasing account.',
  'Eligible downloads remain behind the protected post-purchase delivery flow.',
  'Payment availability',
  'Checkout only shows payment methods that are currently available for the selected order.',
  'Build one connected workflow',
  'Follow up leads, create proposals, and invoice clients from focused SUMMECA apps.',
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
    'Focused AI & SaaS apps for modern business',
    'Move from lead to proposal to invoice',
    'with focused SUMMECA AI & SaaS apps.',
    'Explore InvoiceFlow',
    'Explore LeadFollow AI',
    'View all products',
    'Transparent pricing',
    'Protected checkout',
    'Account-based access',
    'Customer support',
    'تطبيقات ذكاء اصطناعي وSaaS للأعمال الحديثة',
    'حوّل العميل إلى عرض ثم فاتورة',
    'باستخدام تطبيقات SUMMECA الذكية.',
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