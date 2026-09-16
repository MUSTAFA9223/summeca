const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const themeContext = fs.readFileSync('src/contexts/ThemeContext.tsx', 'utf8');
const themeSwitcher = fs.readFileSync('src/components/GlobalThemeSwitcher.tsx', 'utf8');
const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
const themeCss = fs.readFileSync('src/styles/site-theme.css', 'utf8');
const lightPremiumCss = fs.readFileSync('src/styles/summeca-light-premium.css', 'utf8');
const adminShell = fs.readFileSync('src/app/admin/components/AdminShell.tsx', 'utf8');
const dashboardTopbar = fs.readFileSync('src/app/user-dashboard/components/DashboardTopbar.tsx', 'utf8');

test('site theme defaults to light premium and persists the customer choice', () => {
  assert.match(layout, /data-site-theme="light"/);
  assert.match(layout, /summeca:theme/);
  assert.match(themeContext, /useState<SiteTheme>\('light'\)/);
  assert.match(themeContext, /window\.localStorage\.setItem\(THEME_STORAGE_KEY, nextTheme\)/);
  assert.match(themeContext, /value === 'dark' \|\| value === 'light'/);
});

test('customer can explicitly choose dark or light premium', () => {
  assert.match(themeSwitcher, /value: 'dark'/);
  assert.match(themeSwitcher, /value: 'light'/);
  assert.match(themeSwitcher, /aria-pressed=\{selected\}/);
  assert.match(layout, /<GlobalThemeSwitcher \/>/);
});

test('dashboard theme controls are hosted in top bars instead of covering sidebar logout actions', () => {
  assert.match(themeSwitcher, /data-theme-switcher-host/);
  assert.match(themeSwitcher, /hasHostedSwitcher/);
  assert.match(adminShell, /data-theme-switcher-host="true"/);
  assert.match(adminShell, /<ThemeSwitcher compact \/>/);
  assert.match(dashboardTopbar, /data-theme-switcher-host="true"/);
  assert.match(dashboardTopbar, /<ThemeSwitcher compact \/>/);
});

test('homepage follows the light premium SaaS palette while dark mode remains available', () => {
  assert.match(layout, /summeca-light-premium\.css/);
  assert.match(lightPremiumCss, /html\[data-site-theme='light'\] body\.summeca-home-theme/);
  assert.match(lightPremiumCss, /html\[data-site-theme='light'\] \.summeca-home-hero/);
  assert.match(lightPremiumCss, /--background: #f3fafa/);
  assert.match(lightPremiumCss, /--foreground: #062b35/);
  assert.match(lightPremiumCss, /--primary: #00a9a5/);
  assert.match(themeCss, /html\[data-site-theme='dark'\]/);
});

test('dark theme has site-wide semantic tokens and light mode remaps dark product landing surfaces', () => {
  assert.match(themeCss, /html\[data-site-theme='dark'\]/);
  assert.match(themeCss, /--background: #0d1116/);
  assert.ok(
    lightPremiumCss.includes("html[data-site-theme='light'] [class~='bg-[#070b10]']"),
  );
});
