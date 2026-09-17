const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const signup = read('src/app/sign-up-login-screen/components/SignupForm.tsx');
const quickStart = read('src/app/user-dashboard/components/DashboardQuickStart.tsx');
const dashboardPage = read('src/app/user-dashboard/page.tsx');
const pricing = read('src/components/catalog/PricingCatalogView.tsx');
const translations = read('src/lib/i18n-homepage.ts');

test('email signup records funnel milestones without sending identity fields to analytics', () => {
  assert.match(signup, /trackEvent\('signup_started'/);
  assert.match(signup, /trackEvent\('signup_completed'/);
  assert.match(signup, /method: 'email'/);
  assert.match(signup, /confirmation_required/);

  const analyticsCalls = signup.match(/trackEvent\([\s\S]*?\n\s*\}\);/g) ?? [];
  const analyticsSource = analyticsCalls.join('\n');
  assert.doesNotMatch(analyticsSource, /data\.email/);
  assert.doesNotMatch(analyticsSource, /data\.fullName/);
  assert.doesNotMatch(analyticsSource, /data\.password/);
});

test('signup confirmation state does not falsely promise an email for an existing account', () => {
  assert.match(signup, /If confirmation is required, check the inbox for/);
  assert.match(signup, /Already have an account\? No new confirmation email is sent/);
  assert.doesNotMatch(signup, /We sent a confirmation link to/);
});

test('dashboard includes a dismissible three-step quick start instead of a dead empty state', () => {
  assert.match(dashboardPage, /DashboardQuickStart/);
  assert.match(quickStart, /Get to your first useful workflow in three clear steps/);
  assert.match(quickStart, /Browse products/);
  assert.match(quickStart, /View pricing/);
  assert.match(quickStart, /Get help/);
  assert.match(quickStart, /localStorage/);
});

test('pricing keeps explicit English and Arabic conversion copy in the pricing surface', () => {
  assert.match(pricing, /useLanguage/);
  const requiredPairs = [
    ['Transparent Pricing', 'أسعار واضحة'],
    ['Pick the tool you need. See the price first.', 'اختر الأداة المناسبة وشاهد السعر أولًا.'],
    ['Pricing is temporarily unavailable', 'الأسعار غير متاحة مؤقتًا'],
    ['Product details', 'تفاصيل المنتج'],
  ];

  for (const [english, arabic] of requiredPairs) {
    assert.ok(pricing.includes(english), `pricing phrase moved or changed: ${english}`);
    assert.ok(pricing.includes(arabic), `missing Arabic pricing copy: ${english}`);
  }
});

test('quick-start copy stays covered by shared Arabic localization', () => {
  const required = [
    'Quick start',
    'Get to your first useful workflow in three clear steps.',
    'Choose one workflow',
    'Browse products',
    'Review the real offer',
    'View pricing',
    'Use your account dashboard',
    'Get help',
    'Dismiss quick start',
  ];

  for (const phrase of required) {
    assert.ok(quickStart.includes(phrase), `quick-start phrase moved or changed: ${phrase}`);
    assert.ok(
      translations.includes(`'${phrase}'`) || translations.includes(`\"${phrase}\"`),
      `missing Arabic conversion translation: ${phrase}`,
    );
  }
});
