const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const layout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'src/app/sign-up-login-screen/components/AuthScreen.tsx'), 'utf8');

test('auth surface stays English-only without a global language fallback', () => {
  assert.doesNotMatch(auth, /LanguageSwitcher|CompactLanguageSwitcher/);
  assert.doesNotMatch(layout, /GlobalLanguageSwitcher/);
  assert.match(layout, /const language = 'en' as const/);
});
