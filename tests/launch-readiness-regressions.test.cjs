const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const webhook = read('src/app/api/payment/webhook/route.ts');
const checkout = read('src/app/checkout/page.tsx');
const csp = read('next.config.mjs');
const cryptoRoute = read('src/app/api/payment/create-crypto-session/route.ts');
const cryptoStatus = read('src/app/api/payment/crypto-status/route.ts');
const cryptoProvider = read('src/lib/payment/providers/crypto.ts');
const payoneer = read('src/lib/payment/providers/payoneer.ts');
const securityLogs = read('src/app/api/security/logs/route.ts');
const revokeMigration = read('supabase/migrations/20260910103000_revoke_download_trigger_execute.sql');

test('payment fulfillment does not imply an unverified recurring renewal', () => {
  assert.doesNotMatch(webhook, /sendSubscriptionActivated/);
  assert.doesNotMatch(webhook, /renewalDate/);
  assert.equal(fs.existsSync(path.join(root, 'src/app/api/email/renewal-reminder/route.ts')), false);
  assert.match(checkout, /Access Period/);
  assert.match(checkout, /do not promise automatic renewal/i);
});

test('checkout exposes exactly supported stablecoin/network options needed for launch', () => {
  for (const method of ['crypto_usdt_trc20', 'crypto_usdt_erc20', 'crypto_usdc', 'crypto_usdc_polygon', 'crypto_trx', 'crypto_bnb']) {
    assert.match(checkout, new RegExp(method));
    assert.match(cryptoRoute, new RegExp(method));
    assert.match(cryptoStatus, new RegExp(method));
    assert.match(cryptoProvider, new RegExp(method));
  }
  assert.match(checkout, /Back to products/);
});

test('CSP no longer permits the retired Spline robot runtime', () => {
  assert.match(csp, /Content-Security-Policy/);
  assert.match(csp, /script-src[^\n]*blob:/);
  assert.doesNotMatch(csp, /wasm-unsafe-eval/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.doesNotMatch(csp, /spline\.design/i);
  assert.doesNotMatch(csp, /unpkg\.com/i);
});

test('Payoneer hosted checkout redirects are pinned to expected Oscato hosts', () => {
  assert.match(payoneer, /resources\.sandbox\.oscato\.com/);
  assert.match(payoneer, /resources\.live\.oscato\.com/);
  assert.match(payoneer, /isSafePayoneerHostedUrl/);
  assert.match(payoneer, /redirect\?\.url/);
});

test('security log endpoint is read-only to browser callers', () => {
  assert.match(securityLogs, /export async function GET/);
  assert.doesNotMatch(securityLogs, /export async function POST/);
});

test('digital product asset trigger cannot be executed by public client roles', () => {
  assert.match(revokeMigration, /revoke all on function public\.apply_digital_product_download_asset\(\)/i);
  assert.match(revokeMigration, /from public, anon, authenticated/i);
});
