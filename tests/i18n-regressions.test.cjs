const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const layout = read('src/app/layout.tsx');
const publicNav = read('src/components/PublicNav.tsx');
const switcher = read('src/components/LanguageSwitcher.tsx');
const provider = read('src/contexts/LanguageContext.tsx');
const catalog = read('src/lib/i18n.ts');
const rtlStyles = read('src/styles/i18n.css');

test('root layout enables the site-wide bilingual provider and fallback switcher', () => {
  assert.match(layout, /LanguageProvider/);
  assert.match(layout, /GlobalLanguageSwitcher/);
  assert.match(layout, /dir="ltr"/);
  assert.match(layout, /suppressHydrationWarning/);
  assert.match(layout, /i18n\.css/);
});

test('public navigation exposes English and Arabic controls on desktop and mobile', () => {
  assert.match(publicNav, /data-public-nav="true"/);
  assert.match(publicNav, /LanguageSwitcher/);
  assert.match(switcher, />\s*EN\s*</);
  assert.match(switcher, />\s*العربية\s*</);
  assert.match(switcher, /setLanguage\('en'\)/);
  assert.match(switcher, /setLanguage\('ar'\)/);
});

test('Arabic mode persists preference, switches RTL, and localizes dynamic DOM content', () => {
  assert.match(provider, /LANGUAGE_STORAGE_KEY/);
  assert.match(provider, /LANGUAGE_COOKIE_KEY/);
  assert.match(provider, /document\.documentElement\.dir = language === 'ar' \? 'rtl' : 'ltr'/);
  assert.match(provider, /MutationObserver/);
  assert.match(provider, /placeholder/);
  assert.match(provider, /aria-label/);
  assert.match(provider, /window\.location\.reload\(\)/);
});

test('translation catalog and RTL styles cover core storefront surfaces', () => {
  assert.match(catalog, /'Products': 'المنتجات'/);
  assert.match(catalog, /'Dashboard': 'لوحة التحكم'/);
  assert.match(catalog, /'Checkout': 'الدفع'/);
  assert.match(catalog, /'Privacy Policy': 'سياسة الخصوصية'/);
  assert.match(catalog, /'Welcome back': 'مرحبًا بعودتك'/);
  assert.match(rtlStyles, /html\[dir='rtl'\] body/);
  assert.match(rtlStyles, /direction: rtl/);
  assert.match(rtlStyles, /input\[type='email'\]/);
});
