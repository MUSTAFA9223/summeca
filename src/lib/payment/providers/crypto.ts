import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  IPaymentProvider,
  CreatePaymentSessionInput,
  CreatePaymentSessionResult,
  WebhookVerificationInput,
  WebhookVerificationResult,
  PaymentMethodType,
} from '../types';

const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1';

const PAY_CURRENCY: Record<string, string> = {
  crypto_btc: 'btc',
  crypto_eth: 'eth',
  crypto_ltc: 'ltc',
  crypto_trx: 'trx',
  crypto_usdt: 'usdttrc20',
  crypto_usdt_trc20: 'usdttrc20',
  crypto_usdt_erc20: 'usdterc20',
  crypto_usdc: 'usdc',
  crypto_usdc_polygon: 'usdcmatic',
};

const USD_STABLE_PAY_CURRENCIES = new Set([
  'usdttrc20',
  'usdterc20',
  'usdc',
  'usdcmatic',
]);

type NowPaymentsCreateResponse = {
  payment_id?: number | string;
  payment_status?: string;
  pay_address?: string;
  price_amount?: number;
  price_currency?: string;
  pay_amount?: number;
  pay_currency?: string;
  order_id?: string;
  purchase_id?: string;
  error?: string;
  message?: string;
};

type NowPaymentsMinimumResponse = {
  currency_from?: string;
  currency_to?: string;
  min_amount?: number | string;
  fiat_equivalent?: number | string;
  error?: string;
  message?: string;
};

type NowPaymentsWebhook = {
  payment_id?: number | string;
  payment_status?: string;
  pay_address?: string;
  price_amount?: number;
  price_currency?: string;
  pay_amount?: number;
  actually_paid?: number;
  pay_currency?: string;
  order_id?: string;
  purchase_id?: string;
  outcome_amount?: number;
  outcome_currency?: string;
};

export type CryptoMinimumCheck = {
  checked: boolean;
  payCurrency?: string;
  minimumCrypto?: number;
  minimumFiat?: number;
  error?: string;
};

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== 'object') return value;

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = sortObject((value as Record<string, unknown>)[key]);
      return result;
    }, {});
}

function safeSignatureEqual(expected: string, received: string): boolean {
  try {
    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(received.trim().toLowerCase(), 'hex');
    return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}

function paymentMethodFromPayCurrency(payCurrency?: string): PaymentMethodType {
  const normalized = String(payCurrency ?? '').toLowerCase();
  if (normalized === 'btc') return 'crypto_btc';
  if (normalized === 'eth') return 'crypto_eth';
  if (normalized === 'ltc') return 'crypto_ltc';
  if (normalized === 'trx') return 'crypto_trx';
  if (normalized === 'usdttrc20') return 'crypto_usdt_trc20';
  if (normalized === 'usdterc20') return 'crypto_usdt_erc20';
  if (normalized === 'usdcmatic') return 'crypto_usdc_polygon';
  if (normalized.startsWith('usdc')) return 'crypto_usdc';
  return normalized ? `crypto_${normalized}` : 'crypto';
}

function mapPaymentStatus(status?: string): WebhookVerificationResult['paymentStatus'] {
  switch (String(status ?? '').toLowerCase()) {
    case 'finished':
      return 'completed';
    case 'refunded':
      return 'refunded';
    case 'failed':
      return 'failed';
    case 'expired':
      return 'cancelled';
    case 'waiting':
    case 'confirming':
    case 'confirmed':
    case 'sending':
    case 'partially_paid':
      return 'pending';
    default:
      return 'pending';
  }
}

export async function getCryptoMinimumCheck(params: {
  paymentMethodType: string;
  priceCurrency: string;
}): Promise<CryptoMinimumCheck> {
  const apiKey = process.env.NOWPAYMENTS_API_KEY?.trim();
  const payCurrency = PAY_CURRENCY[params.paymentMethodType];
  if (!apiKey || !payCurrency) {
    return { checked: false, payCurrency, error: 'Crypto minimum check is unavailable.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const query = new URLSearchParams({
      currency_from: payCurrency,
      fiat_equivalent: params.priceCurrency.toLowerCase(),
    });
    const response = await fetch(`${NOWPAYMENTS_API_URL}/min-amount?${query.toString()}`, {
      headers: { 'x-api-key': apiKey },
      signal: controller.signal,
      cache: 'no-store',
    });
    const payload = (await response.json().catch(() => ({}))) as NowPaymentsMinimumResponse;
    if (!response.ok) {
      return {
        checked: false,
        payCurrency,
        error: payload.message ?? payload.error ?? 'NOWPayments minimum check failed.',
      };
    }

    const minimumCrypto = Number(payload.min_amount);
    const minimumFiat = Number(payload.fiat_equivalent);
    return {
      checked: Number.isFinite(minimumFiat) && minimumFiat > 0,
      payCurrency,
      minimumCrypto: Number.isFinite(minimumCrypto) && minimumCrypto > 0 ? minimumCrypto : undefined,
      minimumFiat: Number.isFinite(minimumFiat) && minimumFiat > 0 ? minimumFiat : undefined,
    };
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'NOWPayments minimum check timed out.'
      : 'Failed to check NOWPayments minimum.';
    return { checked: false, payCurrency, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export class CryptoProvider implements IPaymentProvider {
  readonly name = 'crypto' as const;

  async createSession(input: CreatePaymentSessionInput): Promise<CreatePaymentSessionResult> {
    const apiKey = process.env.NOWPAYMENTS_API_KEY?.trim();
    if (!apiKey) {
      return {
        success: false,
        error: 'Crypto checkout is not configured. NOWPAYMENTS_API_KEY is missing.',
      };
    }

    const payCurrency = PAY_CURRENCY[input.paymentMethodType];
    if (!payCurrency) {
      return { success: false, error: 'Unsupported cryptocurrency or network.' };
    }

    const priceAmount = Number(input.amount.toFixed(2));
    const exactStablecoinAmount =
      input.currency.toUpperCase() === 'USD' && USD_STABLE_PAY_CURRENCIES.has(payCurrency)
        ? priceAmount
        : undefined;

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://summeca.com').replace(/\/$/, '');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(`${NOWPAYMENTS_API_URL}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          price_amount: priceAmount,
          price_currency: input.currency.toLowerCase(),
          pay_currency: payCurrency,
          ...(exactStablecoinAmount !== undefined ? { pay_amount: exactStablecoinAmount } : {}),
          ipn_callback_url: `${siteUrl}/api/payment/webhook?provider=crypto`,
          order_id: input.orderId,
          order_description: `${input.productName} — ${input.planName}`.slice(0, 250),
        }),
        signal: controller.signal,
        cache: 'no-store',
      });

      const payload = (await response.json().catch(() => ({}))) as NowPaymentsCreateResponse;
      if (!response.ok) {
        const providerError = payload.message ?? payload.error ?? 'NOWPayments rejected the payment request.';
        const minimumError = /less than minimal|minimum|minimal/i.test(providerError);
        return {
          success: false,
          error: minimumError
            ? 'This cryptocurrency is currently above the minimum for this order total. Try TRON (TRX) or Litecoin (LTC).'
            : providerError,
        };
      }

      const providerPaymentRef = payload.payment_id ? String(payload.payment_id) : '';
      const paymentAddress = payload.pay_address?.trim() ?? '';
      const cryptoAmount = payload.pay_amount !== undefined ? String(payload.pay_amount) : '';
      if (!providerPaymentRef || !paymentAddress || !cryptoAmount) {
        return { success: false, error: 'NOWPayments returned an incomplete payment session.' };
      }

      return {
        success: true,
        providerPaymentRef,
        paymentAddress,
        cryptoAmount,
        instructions: `Send exactly ${cryptoAmount} ${String(payload.pay_currency ?? payCurrency).toUpperCase()} to the generated address. Access is granted only after a verified webhook confirms the payment as finished.`,
      };
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError'
        ? 'NOWPayments request timed out.'
        : 'Failed to connect to NOWPayments.';
      return { success: false, error: message };
    } finally {
      clearTimeout(timeout);
    }
  }

  async verifyWebhook(input: WebhookVerificationInput): Promise<WebhookVerificationResult> {
    const secret = process.env.NOWPAYMENTS_IPN_SECRET?.trim();
    const signature = input.signature?.trim() ?? input.headers['x-nowpayments-sig']?.trim() ?? '';
    if (!secret || !signature) {
      return { verified: false, error: 'Missing NOWPayments IPN secret or signature.' };
    }

    let payload: NowPaymentsWebhook;
    try {
      payload = JSON.parse(input.rawBody) as NowPaymentsWebhook;
    } catch {
      return { verified: false, error: 'Invalid NOWPayments webhook JSON.' };
    }

    const canonical = JSON.stringify(sortObject(payload));
    const expected = createHmac('sha512', secret).update(canonical).digest('hex');
    if (!safeSignatureEqual(expected, signature)) {
      return { verified: false, error: 'NOWPayments IPN signature mismatch.' };
    }

    const orderId = String(payload.order_id ?? '').trim();
    const providerPaymentRef = payload.payment_id ? String(payload.payment_id) : '';
    if (!orderId || !providerPaymentRef) {
      return { verified: false, error: 'NOWPayments webhook is missing order or payment reference.' };
    }

    const amount = Number(payload.price_amount);
    const currency = String(payload.price_currency ?? '').trim().toUpperCase();
    if (!Number.isFinite(amount) || amount < 0 || !currency) {
      return { verified: false, error: 'NOWPayments webhook is missing the original price amount/currency.' };
    }

    return {
      verified: true,
      orderId,
      providerPaymentRef,
      amount,
      currency,
      paymentStatus: mapPaymentStatus(payload.payment_status),
      metadata: {
        provider: 'crypto',
        payment_method_type: paymentMethodFromPayCurrency(payload.pay_currency),
        provider_payment_ref: providerPaymentRef,
      },
    };
  }
}
