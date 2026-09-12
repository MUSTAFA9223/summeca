const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const homepage = read('src/app/page.tsx');
const hero = read('src/app/components/HeroSection.tsx');
const authScreen = read('src/app/sign-up-login-screen/components/AuthScreen.tsx');
const robot = read('src/components/ui/SplineNexbotScene.tsx');
const nextConfig = read('next.config.mjs');
const cloudflareBuild = read('scripts/cloudflare-build.mjs');
const cryptoStatus = read('src/app/api/payment/crypto-status/route.ts');
const publicHomepageMarketing = `${homepage}\n${hero}`;

test('public homepage marketing never links to admin routes', () => {
  assert.doesNotMatch(publicHomepageMarketing, /href=["'`]\/admin(?:\/|["'`])/i);
  assert.doesNotMatch(publicHomepageMarketing, /\/admin\/ai/i);
});

test('homepage does not make a fixed GPT-4 model claim', () => {
  assert.doesNotMatch(publicHomepageMarketing, /\bGPT[- ]?4(?:\.\d+)?\b/i);
});

test('homepage avoids fake static business metrics and guaranteed outcomes', () => {
  const forbiddenClaims = [
    /\b\d[\d,]*\+?\s+(?:customers|users|businesses|countries)\b/i,
    /\b\d+(?:\.\d+)?%\s+(?:uptime|conversion|growth|increase|revenue)\b/i,
    /\btrusted by\s+\d/i,
    /\b(?:4|5)(?:\.\d)?\s*\/\s*5\b/i,
    /\bguaranteed?\s+(?:results|sales|revenue|growth|conversions?)\b/i,
  ];

  for (const claim of forbiddenClaims) assert.doesNotMatch(publicHomepageMarketing, claim);
});

test('featured homepage products and prices come from active production records', () => {
  assert.match(homepage, /\.from\('products'\)/);
  assert.match(homepage, /product_plans\(/);
  assert.match(homepage, /\.eq\('status', 'active'\)/);
  assert.match(homepage, /getEffectivePrice/);
  assert.match(homepage, /summeca-invoiceflow/);
  assert.match(homepage, /summeca-leadfollow-ai/);
  assert.match(homepage, /conversion-rescue-kit-pro/);
  assert.match(homepage, /conversion-rescue-kit-starter/);
  assert.match(homepage, /conversion-rescue-kit-ultimate/);
  assert.match(homepage, /Starting at/);
  assert.doesNotMatch(homepage, /\$(?:29|49|59|79|89|99|129|149)(?:\b|\.)/);
});

test('homepage does not advertise an unavailable payment provider as live', () => {
  assert.doesNotMatch(publicHomepageMarketing, /\bPayoneer payments available\b/i);
  assert.doesNotMatch(publicHomepageMarketing, /\bCrypto payments available\b/i);
  assert.doesNotMatch(publicHomepageMarketing, /\bNOWPayments available\b/i);
  assert.match(homepage, /Checkout only shows payment methods that are currently available/);
  assert.match(cryptoStatus, /const available = Boolean/);
});

test('hero sends shoppers to public product and SaaS destinations', () => {
  assert.match(hero, /href="\/products"/);
  assert.match(hero, /Explore Products/);
  assert.match(hero, /href="\/saas"/);
  assert.match(hero, /View SaaS Apps/);
});

test('new NEXBOT Spline scene is the only robot integration', () => {
  assert.match(robot, /BAodEVjHSYLR1KKy\/scene\.splinecode/);
  assert.match(robot, /@splinetool\/viewer@2\.0\.44/);
  assert.match(robot, /events-target/);
  assert.match(robot, /renderer/);
  assert.match(hero, /SplineNexbotScene/);
  assert.match(authScreen, /SplineNexbotScene/);
  assert.doesNotMatch(`${hero}\n${authScreen}\n${robot}`, /H69K35LVSzZ9WcEG/);
  assert.doesNotMatch(cloudflareBuild, /prepare-robot-model\.mjs|prepare-spline-scene\.mjs/);
  assert.match(nextConfig, /https:\/\/prod\.spline\.design/);
  assert.match(nextConfig, /https:\/\/cdn\.spline\.design/);
});
