const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const themeContext = fs.readFileSync('src/contexts/ThemeContext.tsx', 'utf8');
const themeSwitcher = fs.readFileSync('src/components/GlobalThemeSwitcher.tsx', 'utf8');
const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
const hero = fs.readFileSync('src/app/components/HeroSection.tsx', 'utf8');
const themeCss = fs.readFileSync('src/styles/site-theme.css', 'utf8');

test('site theme defaults to dark and persists the customer choice', () => {
  assert.match(layout, /data-site-theme="dark"/);
  assert.match(layout, /summeca:theme/);
  assert.match(themeContext, /window\.localStorage\.setItem\(THEME_STORAGE_KEY, nextTheme\)/);
  assert.match(themeContext, /value === 'dark' \|\| value === 'light'/);
});

test('customer can explicitly choose dark or light premium', () => {
  assert.match(themeSwitcher, /value: 'dark'/);
  assert.match(themeSwitcher, /value: 'light'/);
  assert.match(themeSwitcher, /aria-pressed=\{selected\}/);
  assert.match(layout, /<GlobalThemeSwitcher \/>/);
});

test('homepage keeps the cinematic hero while the rest follows the selected theme', () => {
  assert.match(hero, /theme === 'dark'/);
  assert.match(hero, /summeca-home-light-theme/);
  assert.match(themeCss, /Light Premium keeps the homepage hero cinematic/);
  assert.match(themeCss, /body\.summeca-home-light-theme header/);
});

test('dark theme has site-wide semantic tokens and light mode remaps dark product landing surfaces', () => {
  assert.match(themeCss, /html\[data-site-theme='dark'\]/);
  assert.match(themeCss, /--background: #0d1116/);
  assert.ok(
    themeCss.includes("html[data-site-theme='light'] [class~='bg-[#070b10]']"),
  );
});
