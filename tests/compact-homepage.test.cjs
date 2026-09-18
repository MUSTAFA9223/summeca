const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const home = read('src/app/page.tsx');
const hero = read('src/app/components/HeroSection.tsx');
const nav = read('src/components/PublicNav.tsx');
const footer = read('src/components/PublicFooter.tsx');

test('homepage keeps three focused AI and SaaS products and stays outcome-led', () => {
  assert.match(home, /\.slice\(0, 3\)/);
  assert.match(home, /summeca-invoiceflow/);
  assert.match(home, /summeca-leadfollow-ai/);
  assert.match(home, /summeca-proposalflow-ai/);
  assert.doesNotMatch(home, /conversion-rescue-kit-pro/);
  assert.match(home, /SaaS workspace/);
  assert.match(home, /AI-assisted workspace/);
  assert.match(home, /AI proposal workspace/);
  assert.match(home, /AI & SaaS workspace/);
  assert.match(home, /One connected business workflow/);
  assert.match(home, /Capture the lead, prepare the proposal, then invoice the work/);
  assert.match(home, /Buy with clarity/);
  assert.match(home, /Build one connected workflow/);
  assert.doesNotMatch(home, /Browse by category/);
});

test('hero is concise, bilingual, product-specific, and shows real product workspace previews', () => {
  assert.match(hero, /min-h-\[580px\]/);
  assert.match(hero, /lg:min-h-\[620px\]/);
  assert.match(hero, /Focused AI & SaaS apps for modern business/);
  assert.match(hero, /Move from lead to proposal to invoice/);
  assert.match(hero, /with focused SUMMECA AI & SaaS apps\./);
  assert.match(hero, /Explore InvoiceFlow/);
  assert.match(hero, /Explore LeadFollow AI/);
  assert.match(hero, /View all products/);
  assert.match(hero, /تطبيقات ذكاء اصطناعي وSaaS للأعمال الحديثة/);
  assert.match(hero, /حوّل العميل إلى عرض ثم فاتورة/);
  assert.match(hero, /باستخدام تطبيقات SUMMECA الذكية\./);
  assert.match(hero, /استكشف InvoiceFlow/);
  assert.match(hero, /استكشف LeadFollow AI/);
  assert.match(hero, /عرض كل المنتجات/);
  assert.match(hero, /dir=\{isArabic \? 'rtl' : 'ltr'\}/);
  assert.match(hero, /WorkspaceOverviewPreview/);
  assert.doesNotMatch(hero, /SplineNexbotScene/);
});

test('homepage motion stays short, static where decorative, and reduced-motion safe', () => {
  assert.match(home, /animation-duration: 200ms/);
  assert.match(home, /summeca-hero-orb \{[\s\S]*animation: none !important/);
  assert.match(home, /prefers-reduced-motion: reduce/);
  assert.match(home, /transition-duration: 200ms/);
  assert.match(hero, /duration-200/);
});

test('public navigation prioritizes customer intent over internal tool categories', () => {
  for (const label of ['For Stores', 'Products', 'Pricing', 'Support']) {
    assert.ok(nav.includes(`label: '${label}'`), `missing primary nav item: ${label}`);
  }
  assert.doesNotMatch(nav, /label: 'SaaS Apps'/);
  assert.doesNotMatch(nav, /productLinks/);
  assert.doesNotMatch(nav, /productsOpen/);
});

test('footer omits duplicate trust and sales bands', () => {
  assert.doesNotMatch(footer, /trustBadges/);
  assert.doesNotMatch(footer, /Need help choosing a SUMMECA product/);
  assert.match(footer, /Digital products, SaaS tools, and AI-focused solutions for modern work/);
});