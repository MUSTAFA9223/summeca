const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const nav = read('src/components/PublicNav.tsx');
const dashboardTopbar = read('src/app/user-dashboard/components/DashboardTopbar.tsx');
const adminShell = read('src/app/admin/components/AdminShell.tsx');
const layout = read('src/app/layout.tsx');

test('public navigation no longer exposes a language selector', () => {
  assert.match(nav, /data-public-nav="true"/);
  assert.doesNotMatch(nav, /LanguageSwitcher/);
});

test('customer and admin topbars no longer expose language selectors', () => {
  assert.doesNotMatch(dashboardTopbar, /CompactLanguageSwitcher|data-language-switcher-host/);
  assert.doesNotMatch(adminShell, /CompactLanguageSwitcher|data-language-switcher-host/);
  assert.match(dashboardTopbar, /ThemeSwitcher compact/);
  assert.match(adminShell, /ThemeSwitcher compact/);
});

test('no global language selector is mounted by the root layout', () => {
  assert.doesNotMatch(layout, /GlobalLanguageSwitcher/);
});
