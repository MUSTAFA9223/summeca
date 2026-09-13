const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const hero = read('src/app/components/HeroSection.tsx');
const authScreen = read('src/app/sign-up-login-screen/components/AuthScreen.tsx');
const robot = read('src/components/ui/SplineNexbotScene.tsx');
const layout = read('src/app/layout.tsx');
const deferredAssistant = read('src/components/DeferredStoreAssistant.tsx');

test('homepage reserves a responsive touch-safe stage for the new 3D robot', () => {
  assert.match(hero, /SplineNexbotScene/);
  assert.match(hero, /grid-cols-1/);
  assert.match(hero, /lg:grid-cols-\[46%_54%\]/);
  assert.match(hero, /min-h-\[430px\]/);
  assert.match(hero, /sm:min-h-\[500px\]/);
  assert.match(hero, /lg:min-h-\[590px\]/);
  assert.match(hero, /touch-pan-y/);
});

test('authentication shows an interactive robot on desktop and mobile without blocking touch scroll', () => {
  assert.match(authScreen, /SplineNexbotScene interactive/);
  assert.doesNotMatch(authScreen, /interactive=\{false\}/);
  assert.match(authScreen, /h-52 w-full/);
  assert.match(authScreen, /sm:h-60/);
  assert.match(authScreen, /lg:hidden/);
  assert.match(authScreen, /touch-pan-y/);
  assert.match(robot, /touchAction: 'pan-y'/);
  assert.match(robot, /pointerEvents: interactive \? 'auto' : 'none'/);
});

test('Spline loading never exposes its temporary white canvas before the robot is ready', () => {
  assert.match(robot, /ready \? 'opacity-100' : 'opacity-0'/);
  assert.match(robot, /background: 'transparent'/);
  assert.match(robot, /onLoad=\{\(\) => setReady\(true\)\}/);
});

test('Spline failure never crashes the storefront when WebGL is unavailable', () => {
  assert.match(robot, /canvas\.getContext\('webgl2'/);
  assert.match(robot, /canvas\.getContext\('webgl'/);
  assert.match(robot, /SplineSceneBoundary/);
  assert.match(robot, /data-spline-fallback="true"/);
  assert.match(robot, /webglSupported === false \|\| failed/);
  assert.match(robot, /dynamic\(\(\) => import\('\.\/SplineClient'\)/);
  const splineClient = read('src/components/ui/SplineClient.tsx');
  assert.match(splineClient, /from '\@splinetool\/react-spline'/);
});

test('sales assistant is deferred instead of hydrating with the critical page bundle', () => {
  assert.match(layout, /DeferredStoreAssistant/);
  assert.doesNotMatch(layout, /import StoreAssistant from/);
  assert.match(deferredAssistant, /dynamic\(\(\) => import\('\@\/components\/StoreAssistant'\)/);
  assert.match(deferredAssistant, /requestIdleCallback/);
  assert.match(deferredAssistant, /timeout: 2500/);
});
