const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const globalSwitcher = fs.readFileSync(path.join(root, 'src/components/GlobalLanguageSwitcher.tsx'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'src/app/sign-up-login-screen/components/AuthScreen.tsx'), 'utf8');

test('auth surface has no public nav host so it uses the global top selector', () => {
  assert.doesNotMatch(auth, /data-public-nav=/);
  assert.match(globalSwitcher, /hasHostedSwitcher !== false/);
});
