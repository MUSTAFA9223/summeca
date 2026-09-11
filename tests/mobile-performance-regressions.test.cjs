const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const robot = read('src/components/ui/SplineRobotScene.tsx');
const hero = read('src/app/components/HeroSection.tsx');
const authScreen = read('src/app/sign-up-login-screen/components/AuthScreen.tsx');
const layout = read('src/app/layout.tsx');
const deferredAssistant = read('src/components/DeferredStoreAssistant.tsx');

test('Spline hero uses the restored working canvas runtime path', () => {
  assert.match(robot, /@splinetool\/runtime@1\.9\.82/);
  assert.match(robot, /SCENE_URL = 'https:\/\/prod\.spline\.design\/H69K35LVSzZ9WcEG\/scene\.splinecode'/);
  assert.match(robot, /IntersectionObserver/);
  assert.match(robot, /void mount\(\)/);
  assert.match(robot, /app\.setZoom\(compact \? 0\.7 : 0\.76\)/);
  assert.match(robot, /pointerEvents = 'auto'/);
  assert.doesNotMatch(robot, /@splinetool\/viewer/);
  assert.doesNotMatch(robot, /FALLBACK_IMAGE|summeca-robot\.webp/);
  assert.doesNotMatch(robot, /useGLTF|MODEL_URL|summeca-robot\.glb/);
  assert.doesNotMatch(robot, /<img\b/i);
});

test('mobile hero gives the robot a full-width column before the large breakpoint', () => {
  assert.match(hero, /grid-cols-1/);
  assert.match(hero, /lg:grid-cols-\[45%_55%\]/);
  assert.doesNotMatch(hero, /md:grid-cols-\[45%_55%\]/);
  assert.match(hero, /min-h-\[560px\]/);
  assert.match(hero, /sm:min-h-\[600px\]/);
  assert.match(hero, /absolute inset-0 z-10/);
  assert.match(hero, /<SplineRobotScene \/>/);
});

test('mobile auth gives the interactive robot enough vertical room without blocking page scroll', () => {
  assert.match(authScreen, /h-52 w-full max-w-xs touch-pan-y/);
  assert.match(authScreen, /sm:h-60/);
  assert.match(authScreen, /<SplineRobotScene \/>/);
});

test('sales assistant is deferred instead of hydrating with the critical page bundle', () => {
  assert.match(layout, /DeferredStoreAssistant/);
  assert.doesNotMatch(layout, /import StoreAssistant from/);
  assert.match(deferredAssistant, /dynamic\(\(\) => import\('\@\/components\/StoreAssistant'\)/);
  assert.match(deferredAssistant, /requestIdleCallback/);
  assert.match(deferredAssistant, /timeout: 2500/);
});
