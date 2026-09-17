const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const layout = read('src/app/layout.tsx');
const publicNav = read('src/components/PublicNav.tsx');
const switcher = read('src/components/LanguageSwitcher.tsx');
const globalSwitcher = read('src/components/GlobalLanguageSwitcher.tsx');
const provider = read('src/contexts/LanguageContext.tsx');
const catalog = read('src/lib/i18n.ts');
const comprehensive = read('src/lib/i18n-comprehensive.ts');
const surfaces = read('src/lib/i18n-surfaces.ts');
const products = read('src/lib/i18n-products.ts');
const rtlStyles = read('src/styles/i18n.css');
const dashboardTopbar = read('src/app/user-dashboard/components/DashboardTopbar.tsx');
const dashboardLayout = read('src/app/user-dashboard/components/DashboardLayout.tsx');
const dashboardSidebar = read('src/app/user-dashboard/components/DashboardSidebar.tsx');
const adminShell = read('src/app/admin/components/AdminShell.tsx');
const adminSidebar = read('src/app/admin/components/AdminSidebar.tsx');

test('root layout enables server-derived bilingual direction and fallback switcher', () => {
  assert.match(layout, /LanguageProvider/);
  assert.match(layout, /GlobalLanguageSwitcher/);
  assert.match(layout, /await cookies\(\)/);
  assert.match(layout, /cookieStore\.get\(LANGUAGE_COOKIE_KEY\)/);
  assert.match(layout, /language === 'ar' \? 'rtl' : 'ltr'/);
  assert.match(layout, /lang=\{language\}/);
  assert.match(layout, /dir=\{direction\}/);
  assert.match(layout, /data-language=\{language\}/);
  assert.match(layout, /<LanguageProvider initialLanguage=\{language\}>/);
  assert.match(layout, /suppressHydrationWarning/);
  assert.match(layout, /i18n\.css/);
});

test('public navigation exposes English and Arabic controls on desktop and mobile', () => {
  assert.match(publicNav, /data-public-nav="true"/);
  assert.match(publicNav, /LanguageSwitcher/);
  assert.match(switcher, /data-language-switcher="true"/);
  assert.match(switcher, />\s*EN\s*</);
  assert.match(switcher, />\s*العربية\s*</);
  assert.match(switcher, /setLanguage\('en'\)/);
  assert.match(switcher, /setLanguage\('ar'\)/);
});

test('authenticated topbars host their own language controls without duplicate fallback', () => {
  assert.match(globalSwitcher, /data-language-switcher-host/);
  assert.match(dashboardTopbar, /data-language-switcher-host="true"/);
  assert.match(dashboardTopbar, /LanguageSwitcher/);
  assert.match(adminShell, /data-language-switcher-host="true"/);
  assert.match(adminShell, /LanguageSwitcher/);
});

test('Arabic mode persists preference, uses server RTL, and localizes dynamic DOM content and attributes', () => {
  assert.match(provider, /LANGUAGE_STORAGE_KEY/);
  assert.match(provider, /LANGUAGE_COOKIE_KEY/);
  assert.match(provider, /initialLanguage = 'en'/);
  assert.match(provider, /useState<AppLanguage>\(initialLanguage\)/);
  assert.doesNotMatch(provider, /document\.documentElement\.dir\s*=/);
  assert.doesNotMatch(provider, /document\.documentElement\.lang\s*=/);
  assert.match(provider, /MutationObserver/);
  assert.match(provider, /placeholder/);
  assert.match(provider, /aria-label/);
  assert.match(provider, /aria-description/);
  assert.match(provider, /title/);
  assert.match(provider, /alt/);
  assert.match(provider, /translateSurfaceText/);
  assert.match(provider, /translateSiteText/);
  assert.match(provider, /window\.location\.reload\(\)/);
});

test('Arabic DOM localization waits until hydration-sensitive content has settled', () => {
  assert.match(provider, /document\.readyState === 'complete'/);
  assert.match(provider, /window\.addEventListener\('load', startLocalization, \{ once: true \}\)/);
  assert.match(provider, /window\.requestAnimationFrame/);
  assert.match(provider, /secondFrame = window\.requestAnimationFrame/);
  assert.match(provider, /localizeNode\(document\.body\)/);
  assert.match(provider, /window\.cancelAnimationFrame/);
  assert.match(provider, /observer\?\.disconnect\(\)/);
  const effectStart = provider.indexOf("useEffect(() => {");
  const startLocalization = provider.indexOf('const startLocalization = () => {', effectStart);
  const firstBodyLocalization = provider.indexOf('localizeNode(document.body);', effectStart);
  assert.ok(startLocalization >= 0 && firstBodyLocalization > startLocalization, 'body localization must be deferred inside startLocalization');
});

test('translation catalogs cover storefront, checkout, account, SaaS, and published product content', () => {
  assert.match(catalog, /'Products': 'المنتجات'/);
  assert.match(catalog, /'Dashboard': 'لوحة التحكم'/);
  assert.match(catalog, /'Checkout': 'الدفع'/);
  assert.match(catalog, /'Privacy Policy': 'سياسة الخصوصية'/);
  assert.match(catalog, /'Welcome back': 'مرحبًا بعودتك'/);
  assert.match(comprehensive, /'Secure Checkout': 'دفع آمن'/);
  assert.match(comprehensive, /'InvoiceFlow is ready when you are'/);
  assert.match(comprehensive, /'Unlock LeadFollow AI'/);
  assert.match(surfaces, /'Published digital products'/);
  assert.match(surfaces, /'Published Pricing'/);
  assert.match(surfaces, /'SUMMECA Dashboard'/);
  assert.match(products, /'Freelancer Client Management Kit'/);
  assert.match(products, /'SUMMECA LeadFollow AI'/);
});

test('RTL styles mirror customer and admin sidebars and preserve technical values as LTR', () => {
  assert.match(rtlStyles, /html\[dir='rtl'\] body/);
  assert.match(rtlStyles, /direction: rtl/);
  assert.match(rtlStyles, /input\[type='email'\]/);
  assert.match(rtlStyles, /data-dashboard-sidebar/);
  assert.match(rtlStyles, /data-admin-sidebar/);
  assert.match(rtlStyles, /data-sidebar-offset='dashboard'/);
  assert.match(rtlStyles, /data-sidebar-offset='admin'/);
  assert.match(dashboardLayout, /data-sidebar-offset="dashboard"/);
  assert.match(dashboardSidebar, /data-dashboard-sidebar="desktop"/);
  assert.match(dashboardSidebar, /data-mobile-sidebar="true"/);
  assert.match(adminShell, /data-sidebar-offset="admin"/);
  assert.match(adminSidebar, /data-admin-sidebar="desktop"/);
  assert.match(adminSidebar, /data-mobile-sidebar="true"/);
});
