const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const hero = read('src/app/components/HeroSection.tsx');
const authScreen = read('src/app/sign-up-login-screen/components/AuthScreen.tsx');
const productPreview = read('src/components/catalog/ProductProofPreview.tsx');
const layout = read('src/app/layout.tsx');
const deferredAssistant = read('src/components/DeferredStoreAssistant.tsx');

test('homepage reserves a responsive stage for product interface evidence', () => {
  assert.match(hero, /WorkspaceOverviewPreview/);
  assert.match(hero, /grid-cols-1/);
  assert.match(hero, /lg:grid-cols-\[46%_54%\]/);
  assert.match(hero, /min-h-\[430px\]/);
  assert.match(hero, /sm:min-h-\[500px\]/);
  assert.match(hero, /lg:min-h-\[590px\]/);
  assert.match(productPreview, /data-workspace-preview="true"/);
});

test('authentication keeps mobile lightweight and shows product access context', () => {
  assert.match(authScreen, /WorkspaceOverviewPreview/);
  assert.match(authScreen, /Secure downloads/);
  assert.match(authScreen, /lg:hidden/);
  assert.doesNotMatch(authScreen, /SplineNexbotScene/);
});

test('sales assistant is deferred instead of hydrating with the critical page bundle', () => {
  assert.match(layout, /DeferredStoreAssistant/);
  assert.doesNotMatch(layout, /import StoreAssistant from/);
  assert.match(deferredAssistant, /dynamic\(\(\) => import\('\@\/components\/StoreAssistant'\)/);
  assert.match(deferredAssistant, /requestIdleCallback/);
  assert.match(deferredAssistant, /timeout: 2500/);
  assert.match(deferredAssistant, /pathname === '\/sign-up-login-screen'/);
});
