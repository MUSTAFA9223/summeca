const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const hero = read('src/app/components/HeroSection.tsx');
const authScreen = read('src/app/sign-up-login-screen/components/AuthScreen.tsx');
const layout = read('src/app/layout.tsx');
const deferredAssistant = read('src/components/DeferredStoreAssistant.tsx');

test('homepage no longer reserves mobile rendering space for the retired robot', () => {
  assert.doesNotMatch(hero, /SplineRobotScene/);
  assert.doesNotMatch(hero, /summeca-robot-ring/);
  assert.doesNotMatch(hero, /Move your pointer/);
  assert.match(hero, /max-w-\[960px\]/);
});

test('authentication no longer hydrates the retired robot on mobile or desktop', () => {
  assert.doesNotMatch(authScreen, /SplineRobotScene/);
  assert.doesNotMatch(authScreen, /touch-pan-y/);
  assert.match(authScreen, /Welcome to SUMMECA/);
});

test('sales assistant is deferred instead of hydrating with the critical page bundle', () => {
  assert.match(layout, /DeferredStoreAssistant/);
  assert.doesNotMatch(layout, /import StoreAssistant from/);
  assert.match(deferredAssistant, /dynamic\(\(\) => import\('\@\/components\/StoreAssistant'\)/);
  assert.match(deferredAssistant, /requestIdleCallback/);
  assert.match(deferredAssistant, /timeout: 2500/);
});
