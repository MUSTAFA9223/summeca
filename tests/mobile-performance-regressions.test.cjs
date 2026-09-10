const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const robot = read('src/components/ui/SplineRobotScene.tsx');
const hero = read('src/app/components/HeroSection.tsx');
const layout = read('src/app/layout.tsx');
const deferredAssistant = read('src/components/DeferredStoreAssistant.tsx');

test('Spline hero loads immediately so the primary 3D robot is never deferred away', () => {
  assert.match(robot, /void mount\(\)/);
  assert.doesNotMatch(robot, /IntersectionObserver/);
  assert.doesNotMatch(robot, /requestIdleCallback/);
  assert.doesNotMatch(robot, /loading', 'lazy'/);
});

test('Spline-only runtime uses a verified CDN version and keeps global pointer interaction', () => {
  assert.match(robot, /@splinetool\/runtime@1\.12\.97/);
  assert.match(robot, /nextApp\.setGlobalEvents\?\.\(true\)/);
  assert.match(robot, /pointerEvents: 'auto'/);
  assert.match(robot, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(robot, /useGLTF|MODEL_URL|summeca-robot\.glb/);
  assert.doesNotMatch(robot, /<img\b/i);
});

test('mobile hero gives the robot a full-width column before the large breakpoint', () => {
  assert.match(hero, /grid-cols-1/);
  assert.match(hero, /lg:grid-cols-\[45%_55%\]/);
  assert.doesNotMatch(hero, /md:grid-cols-\[45%_55%\]/);
  assert.match(hero, /absolute inset-0 z-10/);
});

test('sales assistant is deferred instead of hydrating with the critical page bundle', () => {
  assert.match(layout, /DeferredStoreAssistant/);
  assert.doesNotMatch(layout, /import StoreAssistant from/);
  assert.match(deferredAssistant, /dynamic\(\(\) => import\('\@\/components\/StoreAssistant'\)/);
  assert.match(deferredAssistant, /requestIdleCallback/);
  assert.match(deferredAssistant, /timeout: 2500/);
});
