const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const robot = read('src/components/ui/SplineRobotScene.tsx');
const layout = read('src/app/layout.tsx');
const deferredAssistant = read('src/components/DeferredStoreAssistant.tsx');

test('Spline hero defers heavy work until near the viewport and browser idle time', () => {
  assert.match(robot, /IntersectionObserver/);
  assert.match(robot, /requestIdleCallback/);
  assert.match(robot, /loading', 'lazy'/);
  assert.match(robot, /rootMargin/);
  assert.doesNotMatch(robot, /loading', 'eager'/);
});

test('Spline hero protects constrained mobile devices', () => {
  assert.match(robot, /prefers-reduced-motion: reduce/);
  assert.match(robot, /saveData/);
  assert.match(robot, /slow-2g/);
  assert.match(robot, /effectiveType === '2g'/);
  assert.match(robot, /mobileQuery\.matches \? 'none' : 'auto'/);
  assert.match(robot, /mobileQuery\.matches \? 'none' : 'saturate/);
});

test('sales assistant is deferred instead of hydrating with the critical page bundle', () => {
  assert.match(layout, /DeferredStoreAssistant/);
  assert.doesNotMatch(layout, /import StoreAssistant from/);
  assert.match(deferredAssistant, /dynamic\(\(\) => import\('\@\/components\/StoreAssistant'\)/);
  assert.match(deferredAssistant, /requestIdleCallback/);
  assert.match(deferredAssistant, /timeout: 2500/);
});
