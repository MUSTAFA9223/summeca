const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const authScreen = fs.readFileSync(
  'src/app/sign-up-login-screen/components/AuthScreen.tsx',
  'utf8',
);
const lightTheme = fs.readFileSync('src/styles/summeca-light-premium.css', 'utf8');

test('auth screen exposes stable theme hooks for the full sign-in surface', () => {
  assert.match(authScreen, /summeca-auth-shell/);
  assert.match(authScreen, /summeca-auth-card/);
  assert.match(authScreen, /summeca-auth-tabs/);
  assert.match(authScreen, /summeca-auth-headline-line/);
});

test('light theme remaps auth shell, card, copy and tabs instead of leaving the page dark', () => {
  assert.match(lightTheme, /html\[data-site-theme='light'\] \.summeca-auth-shell/);
  assert.match(lightTheme, /html\[data-site-theme='light'\] \.summeca-auth-card/);
  assert.match(lightTheme, /html\[data-site-theme='light'\] \.summeca-auth-tabs/);
  assert.match(lightTheme, /html\[data-site-theme='light'\] \.summeca-auth-headline-line/);
  assert.match(lightTheme, /background:\s*rgba\(255, 255, 255, 0\.94\) !important/);
});
