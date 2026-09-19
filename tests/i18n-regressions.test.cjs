const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const layout = read('src/app/layout.tsx');
const publicNav = read('src/components/PublicNav.tsx');
const provider = read('src/contexts/LanguageContext.tsx');
const catalog = read('src/lib/i18n.ts');
const rtlStyles = read('src/styles/i18n.css');
const dashboardTopbar = read('src/app/user-dashboard/components/DashboardTopbar.tsx');
const dashboardLayout = read('src/app/user-dashboard/components/DashboardLayout.tsx');
const dashboardSidebar = read('src/app/user-dashboard/components/DashboardSidebar.tsx');
const adminShell = read('src/app/admin/components/AdminShell.tsx');
const adminSidebar = read('src/app/admin/components/AdminSidebar.tsx');

test('root layout renders the production UI in English LTR only', () => {
  assert.match(layout, /LanguageProvider/);
  assert.match(layout, /const language = 'en' as const/);
  assert.match(layout, /const direction = 'ltr' as const/);
  assert.doesNotMatch(layout, /GlobalLanguageSwitcher/);
  assert.doesNotMatch(layout, /await cookies\(\)/);
  assert.match(layout, /lang=\{language\}/);
  assert.match(layout, /dir=\{direction\}/);
  assert.match(layout, /data-language=\{language\}/);
  assert.match(layout, /<LanguageProvider initialLanguage=\{language\}>/);
  assert.match(layout, /suppressHydrationWarning/);
});

test('visible public, customer, and admin navigation no longer exposes language controls', () => {
  assert.match(publicNav, /data-public-nav="true"/);
  assert.doesNotMatch(publicNav, /LanguageSwitcher/);
  assert.doesNotMatch(dashboardTopbar, /CompactLanguageSwitcher|data-language-switcher-host/);
  assert.doesNotMatch(adminShell, /CompactLanguageSwitcher|data-language-switcher-host/);
});

test('legacy translation machinery remains dormant while English is the only root language', () => {
  assert.match(provider, /if \(language !== 'ar' \|\| !document\.body\) return undefined/);
  assert.match(provider, /initialLanguage = 'en'/);
  assert.match(provider, /useState<AppLanguage>\(initialLanguage\)/);
  assert.doesNotMatch(provider, /document\.documentElement\.dir\s*=/);
  assert.doesNotMatch(provider, /document\.documentElement\.lang\s*=/);
  assert.match(catalog, /'Products': 'المنتجات'/);
});

test('legacy RTL styles remain isolated and technical values keep LTR safeguards', () => {
  assert.match(rtlStyles, /html\[dir='rtl'\] body/);
  assert.match(rtlStyles, /input\[type='email'\]/);
  assert.match(rtlStyles, /data-dashboard-sidebar/);
  assert.match(rtlStyles, /data-admin-sidebar/);
  assert.match(dashboardLayout, /data-sidebar-offset="dashboard"/);
  assert.match(dashboardSidebar, /data-dashboard-sidebar="desktop"/);
  assert.match(adminShell, /data-sidebar-offset="admin"/);
  assert.match(adminSidebar, /data-admin-sidebar="desktop"/);
});
