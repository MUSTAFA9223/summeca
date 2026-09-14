const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const nav = read('src/components/PublicNav.tsx');
const dashboardTopbar = read('src/app/user-dashboard/components/DashboardTopbar.tsx');
const adminShell = read('src/app/admin/components/AdminShell.tsx');
const globalSwitcher = read('src/components/GlobalLanguageSwitcher.tsx');
const compactLanguageSwitcher = read('src/components/CompactLanguageSwitcher.tsx');

test('language choice is exposed in the top public navigation', () => {
  assert.match(nav, /<LanguageSwitcher compact \/>/);
  assert.match(nav, /data-public-nav="true"/);
});

test('language choice is exposed in customer and admin topbars', () => {
  assert.match(dashboardTopbar, /<CompactLanguageSwitcher \/>/);
  assert.match(dashboardTopbar, /data-language-switcher-host="true"/);
  assert.match(adminShell, /<CompactLanguageSwitcher \/>/);
  assert.match(adminShell, /data-language-switcher-host="true"/);
});

test('dashboard language control matches the theme control visual system', () => {
  assert.match(compactLanguageSwitcher, /rounded-full border border-border bg-card\/90 p-1/);
  assert.match(compactLanguageSwitcher, /bg-primary text-primary-foreground shadow-sm/);
  assert.match(compactLanguageSwitcher, /text-muted-foreground hover:bg-secondary hover:text-foreground/);
});

test('pages without a hosted topbar receive the fixed top fallback control', () => {
  assert.match(globalSwitcher, /fixed left-1\/2 top-4/);
  assert.match(globalSwitcher, /LanguageSwitcher/);
});
