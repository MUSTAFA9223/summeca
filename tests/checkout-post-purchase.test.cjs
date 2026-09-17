const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const checkout = read('src/app/checkout/page.tsx');
const success = read('src/app/checkout/success/page.tsx');
const cancel = read('src/app/checkout/cancel/page.tsx');
const freeOrder = read('src/app/api/payment/create-free-order/route.ts');

test('checkout summary exposes the purchase facts without changing pricing authority', () => {
  for (const label of ['Product', 'Plan', 'Access duration', 'Delivery type', 'Currency', 'Total']) {
    assert.match(checkout, new RegExp(label));
  }
  assert.match(checkout, /billingPeriodLabel\[cartItem\.plan\.billing_period\]/);
  assert.match(checkout, /deliveryTypeLabel\(cartItem\.product\)/);
  assert.match(checkout, /getEffectivePrice\(cartItem\.plan\)/);
  assert.match(checkout, /\/api\/payment\/quote/);
});

test('checkout renders only the provider that is explicitly readiness-checked in this UI', () => {
  assert.match(checkout, /\/api\/payment\/crypto-status/);
  assert.match(checkout, /cryptoStatus === 'available'/);
  assert.match(checkout, /Cryptocurrency · USDT \/ USDC \/ TRX \/ BNB/);
  assert.match(checkout, /Cryptocurrency is the only payment method currently shown at SUMMECA/);
  assert.doesNotMatch(checkout, />Payoneer</);
  assert.doesNotMatch(checkout, />FastSpring</);
});

test('checkout makes preparing and awaiting states explicit and keeps server verification copy', () => {
  assert.match(checkout, /Preparing checkout…/);
  assert.match(checkout, /Preparing payment…/);
  assert.match(checkout, /Awaiting payment/);
  assert.match(checkout, /verified provider confirmation/i);
  assert.match(checkout, /lg:sticky lg:top-24/);
  assert.match(checkout, /safe-area-inset-bottom/);
});

test('success page opens products only after a completed order state', () => {
  assert.match(success, /order\.status !== 'completed'/);
  assert.match(success, /nextOrder\.status === 'completed'/);
  assert.match(success, /Open your product/);
  assert.match(success, /Account-based SaaS access/);
  assert.match(success, /Protected digital download/);
  assert.match(success, /\/user-dashboard\/invoiceflow/);
  assert.match(success, /\/user-dashboard\/leadfollow/);
  assert.match(success, /\/user-dashboard\/downloads/);
  assert.doesNotMatch(success, /searchParams\?\.get\(['"]free['"]\)/);
});

test('success page distinguishes pending, failed, cancelled and refunded states without client entitlement writes', () => {
  assert.match(success, /Awaiting Payment Confirmation/);
  assert.match(success, /Payment Failed/);
  assert.match(success, /Payment Cancelled/);
  assert.match(success, /status === 'refunded'/);
  assert.doesNotMatch(success, /from\(['"]subscriptions['"]\).*insert/s);
  assert.doesNotMatch(success, /from\(['"]downloads['"]\).*insert/s);
});

test('cancelled payment recovery does not imply another provider or grant access', () => {
  assert.match(cancel, /This return page does not grant product access/);
  assert.match(cancel, /Return to Checkout/);
  assert.match(cancel, /Contact support/);
  assert.doesNotMatch(cancel, /different payment method/i);
  assert.doesNotMatch(cancel, /from\(['"](?:subscriptions|downloads)['"]\)/);
});

test('free completion remains a server-created completed order with server reconciliation', () => {
  assert.match(freeOrder, /create_priced_order/);
  assert.ok(freeOrder.includes("String(order.status ?? '') !== 'completed'"));
  assert.match(freeOrder, /reconcileFreeEntitlements/);
  assert.doesNotMatch(freeOrder, /redirect.*completed/i);
});
