import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

process.env.NOWPAYMENTS_API_KEY = 'test-api-key';
process.env.NOWPAYMENTS_IPN_SECRET = 'test-ipn-secret';
process.env.NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1';
process.env.NEXT_PUBLIC_SITE_URL = 'https://summeca.com';

const { CryptoProvider } = await import('../src/lib/payment/providers/crypto.ts');

function sortForSignature(value) {
  if (Array.isArray(value)) return value.map(sortForSignature);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = sortForSignature(value[key]);
        return result;
      }, {});
  }
  return value;
}

function sign(payload) {
  return createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET)
    .update(JSON.stringify(sortForSignature(payload)), 'utf8')
    .digest('hex');
}

function webhookPayload(status = 'finished') {
  return {
    payment_id: 123456789,
    payment_status: status,
    pay_address: 'TExampleAddressOnlyForTests',
    price_amount: 29.99,
    price_currency: 'usd',
    pay_amount: 29.99,
    pay_currency: 'usdttrc20',
    actually_paid: status === 'partially_paid' ? 10 : 29.99,
    order_id: '11111111-1111-4111-8111-111111111111',
  };
}

test('createSession creates a NOWPayments payment without granting access', async () => {
  const originalFetch = globalThis.fetch;
  let observedUrl = '';
  let observedInit;

  globalThis.fetch = async (url, init) => {
    observedUrl = String(url);
    observedInit = init;
    return new Response(JSON.stringify({
      payment_id: 7654321,
      payment_status: 'waiting',
      pay_address: 'TProviderGeneratedAddress',
      price_amount: 29.99,
      price_currency: 'usd',
      pay_amount: 30.02,
      pay_currency: 'usdttrc20',
      order_id: '11111111-1111-4111-8111-111111111111',
    }), { status: 201, headers: { 'content-type': 'application/json' } });
  };

  try {
    const provider = new CryptoProvider();
    const result = await provider.createSession({
      orderId: '11111111-1111-4111-8111-111111111111',
      amount: 29.99,
      currency: 'USD',
      provider: 'crypto',
      paymentMethodType: 'crypto_usdt_trc20',
      productName: 'SUMMECA Test Product',
      planName: 'Lifetime',
      userId: '22222222-2222-4222-8222-222222222222',
    });

    assert.equal(result.success, true);
    assert.equal(result.providerPaymentRef, '7654321');
    assert.equal(result.paymentAddress, 'TProviderGeneratedAddress');
    assert.equal(result.cryptoAmount, '30.02');
    assert.equal(result.redirectUrl, undefined);
    assert.equal(observedUrl, 'https://api.nowpayments.io/v1/payment');
    assert.equal(observedInit?.method, 'POST');
    assert.equal(observedInit?.headers?.['x-api-key'], 'test-api-key');

    const request = JSON.parse(observedInit.body);
    assert.equal(request.order_id, '11111111-1111-4111-8111-111111111111');
    assert.equal(request.price_amount, 29.99);
    assert.equal(request.price_currency, 'usd');
    assert.equal(request.pay_currency, 'usdttrc20');
    assert.equal(request.ipn_callback_url, 'https://summeca.com/api/payment/webhook?provider=crypto');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('signed finished IPN is normalized to completed', async () => {
  const payload = webhookPayload('finished');
  const provider = new CryptoProvider();
  const result = await provider.verifyWebhook({
    provider: 'crypto',
    rawBody: JSON.stringify(payload),
    headers: { 'x-nowpayments-sig': sign(payload) },
  });

  assert.equal(result.verified, true);
  assert.equal(result.paymentStatus, 'completed');
  assert.equal(result.orderId, payload.order_id);
  assert.equal(result.providerPaymentRef, String(payload.payment_id));
  assert.equal(result.amount, 29.99);
  assert.equal(result.currency, 'USD');
  assert.equal(result.metadata?.provider_status, 'finished');
});

test('signed partially_paid IPN stays pending and never grants access', async () => {
  const payload = webhookPayload('partially_paid');
  const provider = new CryptoProvider();
  const result = await provider.verifyWebhook({
    provider: 'crypto',
    rawBody: JSON.stringify(payload),
    headers: { 'x-nowpayments-sig': sign(payload) },
  });

  assert.equal(result.verified, true);
  assert.equal(result.paymentStatus, 'pending');
  assert.equal(result.metadata?.provider_status, 'partially_paid');
  assert.equal(result.metadata?.crypto_actually_paid, '10');
});

test('signed confirmed and sending IPNs remain pending', async () => {
  const provider = new CryptoProvider();
  for (const status of ['confirmed', 'sending']) {
    const payload = webhookPayload(status);
    const result = await provider.verifyWebhook({
      provider: 'crypto',
      rawBody: JSON.stringify(payload),
      headers: { 'x-nowpayments-sig': sign(payload) },
    });
    assert.equal(result.verified, true);
    assert.equal(result.paymentStatus, 'pending');
  }
});

test('expired IPN is terminal without being treated as paid', async () => {
  const payload = webhookPayload('expired');
  const provider = new CryptoProvider();
  const result = await provider.verifyWebhook({
    provider: 'crypto',
    rawBody: JSON.stringify(payload),
    headers: { 'x-nowpayments-sig': sign(payload) },
  });

  assert.equal(result.verified, true);
  assert.equal(result.paymentStatus, 'cancelled');
  assert.equal(result.metadata?.provider_status, 'expired');
});

test('forged NOWPayments signature is rejected', async () => {
  const payload = webhookPayload('finished');
  const provider = new CryptoProvider();
  const result = await provider.verifyWebhook({
    provider: 'crypto',
    rawBody: JSON.stringify(payload),
    headers: { 'x-nowpayments-sig': '00'.repeat(64) },
  });

  assert.equal(result.verified, false);
  assert.notEqual(result.paymentStatus, 'completed');
});
