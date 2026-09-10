const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const robot = read('src/components/ui/SplineRobotScene.tsx');
const layout = read('src/app/layout.tsx');
const deferredAssistant = read('src/components/DeferredStoreAssistant.tsx');

test('Spline hero loads immediately so the primary 3D robot is never deferred away', () => {
  assert.match(robot, /loading', 'eager'/);
  assert.match(robot, /void mountSpline\(\)/);
  assert.doesNotMatch(robot, /IntersectionObserver/);
  assert.doesNotMatch(robot, /requestIdleCallback/);
  assert.doesNotMatch(robot, /loading', 'lazy'/);
});

test('Spline hero stays visible on constrained devices while preserving reduced-motion handling', () => {
  assert.match(robot, /prefers-reduced-motion: reduce/);
  assert.match(robot, /events-target', 'global'/);
  assert.match(robot, /pointerEvents: 'auto'/);
  assert.doesNotMatch(robot, /saveData/);
  assert.doesNotMatch(robot, /slow-2g/);
  assert.doesNotMatch(robot, /effectiveType === '2g'/);
});

test('sales assistant is deferred instead of hydrating with the critical page bundle', () => {
  assert.match(layout, /DeferredStoreAssistant/);
  assert.doesNotMatch(layout, /import StoreAssistant from/);
  assert.match(deferredAssistant, /dynamic\(\(\) => import\('\@\/components\/StoreAssistant'\)/);
  assert.match(deferredAssistant, /requestIdleCallback/);
  assert.match(deferredAssistant, /timeout: 2500/);
});
