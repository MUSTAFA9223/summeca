/**
 * NOWPayments cryptocurrency provider.
 *
 * Production flow:
 * - SUMMECA creates a provider payment server-side.
 * - Customer sends the exact crypto amount to the provider-generated address.
 * - NOWPayments processes the payment and pays out to the wallet configured in
 *   the merchant's NOWPayments Store Settings.
 * - SUMMECA grants access ONLY after a signed IPN reports `finished`.
 *
 * Required server-only environment variables:
 * - NOWPAYMENTS_API_KEY
 * - NOWPAYMENTS_IPN_SECRET
 * Optional:
 * - NOWPAYMENTS_API_URL (defaults to https://api.nowpayments.io/v1)
 *
 * SECURITY:
 * - Never store private keys, seed phrases, or wallet signing secrets.
 * - IPNs are verified with HMAC-SHA512 over recursively sorted JSON.
 * - `confirmed` and `sending` are NOT treated as paid; only `finished` grants access.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type {
  IPaymentProvider,
  CreatePaymentSessionInput,
  CreatePaymentSessionResult,
  PaymentMethodType,
  WebhookVerificationInput,
  WebhookVerificationResult,
} from '../types';

export interface CryptoMethodDetails {
  method: PaymentMethodType;
  payCurrency: string;
  asset: string;
  network: string;
  label: string;
}

const CRYPTO_METHODS: Record<string, CryptoMethodDetails> = {
  crypto_usdt_trc20: {
    method: 'crypto_usdt_trc20',
    payCurrency: 'usdttrc20',
    asset: 'USDT',
    network: 'TRON (TRC20)',
    label: 'USDT · TRC20',
  },
  crypto_usdt_erc20: {
    method: 'crypto_usdt_erc20',
    payCurrency: 'usdterc20',
    asset: 'USDT',
    network: 'Ethereum (ERC20)',
    label: 'USDT · ERC20',
  },
  crypto_usdc_polygon: {
    method: 'crypto_usdc_polygon',
    payCurrency: 'usdcmatic',
    asset: 'USDC',
    network: 'Polygon',
    label: 'USDC · Polygon',
  },
  crypto_btc: {
    method: 'crypto_btc',
    payCurrency: 'btc',
    asset: 'BTC',
    network: 'Bitcoin',
    label: 'Bitcoin · BTC',
  },
  crypto_eth: {
    method: 'crypto_eth',
    payCurrency: 'eth',
    asset: 'ETH',
    network: 'Ethereum',
    label: 'Ethereum · ETH',
  },
};

const PAY_CURRENCY_TO_METHOD = new Map(
  Object.values(CRYPTO_METHODS).map((item) => [item.payCurrency.toLowerCase(), item]),
);

interface NowPaymentsConfig {
  apiKey: string;
  ipnSecret: string;
  apiUrl: string;
}

interface NowPaymentsCreateResponse {
  payment_id?: number | string;
  payment_status?: string;
  pay_address?: string;
  price_amount?: number;
  price_currency?: string;
  pay_amount?: number;
  pay_currency?: string;
  order_id?: string;
  order_description?: string;
  purchase_id?: string;
  created_at?: string;
  updated_at?: string;
  expiration_estimate_date?: string;
}

interface NowPaymentsWebhookPayload extends NowPaymentsCreateResponse {
  actually_paid?: number;
  outcome_amount?: number;
  outcome_currency?: string;
}

function getConfig(): NowPaymentsConfig | null {
  const apiKey = process.env.NOWPAYMENTS_API_KEY?.trim();
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET?.trim();
  const apiUrl = (process.env.NOWPAYMENTS_API_URL ?? 'https://api.nowpayments.io/v1').trim().replace(/\/$/, '');

  if (!apiKey || !ipnSecret) return null;

  try {
    const url = new URL(apiUrl);
    if (url.protocol !== 'https:') return null;
  } catch {
    return null;
  }

  return { apiKey, ipnSecret, apiUrl };
}

export function isCryptoConfigured(): boolean {
  return getConfig() !== null;
}

export function getCryptoMethodDetails(method: PaymentMethodType): CryptoMethodDetails | null {
  return CRYPTO_METHODS[String(method)] ?? null;
}

function sortForSignature(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortForSignature);
  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    return Object.keys(input)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortForSignature(input[key]);
        return result;
      }, {});
  }
  return value;
}

function parseSignature(value: string): Buffer | null {
  const signature = value.trim().replace(/^sha512=/i, '');
  if (!/^[a-f0-9]{128}$/i.test(signature)) return null;
  return Buffer.from(signature, 'hex');
}

function mapStatus(statusValue: string): WebhookVerificationResult['paymentStatus'] {
  switch (statusValue.toLowerCase()) {
    case 'finished':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'refunded':
      return 'refunded';
    case 'expired':
      return 'cancelled';
    case 'waiting':
    case 'confirming':
    case 'confirmed':
    case 'sending':
    case 'partially_paid':
    default:
      return 'pending';
  }
}

function numericString(value: unknown): string | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : undefined;
}

export class CryptoProvider implements IPaymentProvider {
  readonly name = 'crypto' as const;

  async createSession(input: CreatePaymentSessionInput): Promise<CreatePaymentSessionResult> {
    const config = getConfig();
    if (!config) {
      return {
        success: false,
        error: 'Cryptocurrency checkout is not configured. Please try another payment method.',
      };
    }

    const method = getCryptoMethodDetails(input.paymentMethodType);
    if (!method) return { success: false, error: 'Unsupported cryptocurrency or network.' };

    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { success: false, error: 'Invalid payment amount.' };
    }

    const currency = input.currency.trim().toLowerCase();
    if (!/^[a-z]{3,10}$/.test(currency)) {
      return { success: false, error: 'Invalid payment currency.' };
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://summeca.com').replace(/\/$/, '');
    const requestBody = {
      price_amount: Math.round(input.amount * 100) / 100,
      price_currency: currency,
      pay_currency: method.payCurrency,
      ipn_callback_url: `${siteUrl}/api/payment/webhook?provider=crypto`,
      order_id: input.orderId,
      order_description: `${input.productName} — ${input.planName}`.slice(0, 240),
    };

    let response: Response;
    try {
      response = await fetch(`${config.apiUrl}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-api-key': config.apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      console.error('[CryptoProvider] NOWPayments create payment network error:', err);
      return { success: false, error: 'Unable to connect to cryptocurrency provider. Please try again.' };
    }

    let data: NowPaymentsCreateResponse;
    try {
      data = (await response.json()) as NowPaymentsCreateResponse;
    } catch {
      console.error('[CryptoProvider] NOWPayments returned invalid JSON, status:', response.status);
      return { success: false, error: 'Cryptocurrency provider returned an unexpected response.' };
    }

    if (!response.ok) {
      console.error('[CryptoProvider] NOWPayments create payment failed:', response.status);
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Cryptocurrency provider authentication failed. Please contact support.' };
      }
      return { success: false, error: 'Cryptocurrency provider is temporarily unavailable. Please try again later.' };
    }

    const providerPaymentRef = data.payment_id === undefined ? '' : String(data.payment_id).trim();
    const paymentAddress = data.pay_address?.trim() ?? '';
    const cryptoAmount = typeof data.pay_amount === 'number' && Number.isFinite(data.pay_amount)
      ? String(data.pay_amount)
      : '';

    if (!providerPaymentRef || !paymentAddress || !cryptoAmount) {
      console.error('[CryptoProvider] NOWPayments response missing payment reference/address/amount');
      return { success: false, error: 'Cryptocurrency provider did not return complete payment details.' };
    }

    if (data.order_id && data.order_id !== input.orderId) {
      console.error('[CryptoProvider] NOWPayments order reference mismatch');
      return { success: false, error: 'Cryptocurrency provider returned an invalid order reference.' };
    }

    return {
      success: true,
      providerPaymentRef,
      paymentAddress,
      cryptoAmount,
      instructions: `Send exactly ${cryptoAmount} ${method.asset} using ${method.network}.`,
    };
  }

  async verifyWebhook(input: WebhookVerificationInput): Promise<WebhookVerificationResult> {
    const config = getConfig();
    if (!config) return { verified: false, error: 'Cryptocurrency provider is not configured.' };

    const signatureValue = input.headers['x-nowpayments-sig'] ?? input.signature;
    if (!signatureValue) return { verified: false, error: 'Missing NOWPayments IPN signature.' };

    let payload: NowPaymentsWebhookPayload;
    try {
      payload = JSON.parse(input.rawBody) as NowPaymentsWebhookPayload;
    } catch {
      return { verified: false, error: 'Invalid webhook JSON.' };
    }

    const canonicalBody = JSON.stringify(sortForSignature(payload));
    const expected = createHmac('sha512', config.ipnSecret).update(canonicalBody, 'utf8').digest();
    const received = parseSignature(signatureValue);

    if (!received || received.length !== expected.length || !timingSafeEqual(received, expected)) {
      console.warn('[CryptoProvider] NOWPayments IPN signature mismatch');
      return { verified: false, error: 'Webhook signature verification failed.' };
    }

    const orderId = typeof payload.order_id === 'string' ? payload.order_id.trim() : '';
    const providerPaymentRef = payload.payment_id === undefined ? '' : String(payload.payment_id).trim();
    const providerStatus = typeof payload.payment_status === 'string'
      ? payload.payment_status.trim().toLowerCase()
      : '';

    if (!orderId || !providerPaymentRef || !providerStatus) {
      return { verified: false, error: 'Webhook payload is missing required payment fields.' };
    }

    const priceAmount = typeof payload.price_amount === 'number' && Number.isFinite(payload.price_amount)
      ? payload.price_amount
      : undefined;
    const priceCurrency = typeof payload.price_currency === 'string'
      ? payload.price_currency.trim().toUpperCase()
      : undefined;
    const payCurrency = typeof payload.pay_currency === 'string'
      ? payload.pay_currency.trim().toLowerCase()
      : '';
    const method = PAY_CURRENCY_TO_METHOD.get(payCurrency);

    return {
      verified: true,
      orderId,
      providerPaymentRef,
      amount: priceAmount,
      currency: priceCurrency,
      paymentStatus: mapStatus(providerStatus),
      metadata: {
        provider: 'crypto',
        payment_method_type: method?.method ?? `crypto_${payCurrency || 'unknown'}`,
        provider_payment_ref: providerPaymentRef,
        provider_status: providerStatus,
        crypto_currency: method?.asset ?? payCurrency.toUpperCase(),
        crypto_network: method?.network,
        crypto_amount: numericString(payload.pay_amount),
        crypto_actually_paid: numericString(payload.actually_paid),
      },
    };
  }
}
