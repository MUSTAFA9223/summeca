const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const appLogo = fs.readFileSync('src/components/ui/AppLogo.tsx', 'utf8');
const auth = fs.readFileSync(
  'src/app/sign-up-login-screen/components/AuthScreen.tsx',
  'utf8',
);
const nav = fs.readFileSync('src/components/PublicNav.tsx', 'utf8');
const themeCss = fs.readFileSync('src/styles/site-theme.css', 'utf8');

test('brand logo preserves original artwork in light mode', () => {
  assert.match(appLogo, /summeca-brand-logo--adaptive/);
  assert.doesNotMatch(appLogo, /style=\{logoFilter/);
  assert.match(
    themeCss,
    /html\[data-site-theme='light'\] \.summeca-brand-logo--adaptive[\s\S]*filter:\s*none !important/,
  );
});

test('dark mode still receives a high-contrast light logo treatment', () => {
  assert.match(
    themeCss,
    /html\[data-site-theme='dark'\] \.summeca-brand-logo--adaptive/,
  );
  assert.match(themeCss, /contrast\(106%\)/);
});

test('public nav and auth use the clearer adaptive wordmark at a readable size', () => {
  assert.match(nav, /<AppLogo variant="wordmark" size=\{50\}/);
  assert.match(auth, /<AppLogo variant="wordmark" size=\{50\} \/>/);
  assert.doesNotMatch(auth, /tone="light"/);
});
