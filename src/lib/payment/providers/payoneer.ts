/**
 * Payoneer Checkout provider.
 *
 * SECURITY:
 * - Credentials are server-only environment variables.
 * - Hosted checkout is used; SUMMECA never receives or stores PAN/CVV.
 * - Webhooks are authenticated with HMAC-SHA256 before any state transition.
 * - Signed amount/currency/order/reference data is returned to the webhook
 *   handler so it can validate the payment against the stored order.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type {
  IPaymentProvider,
  CreatePaymentSessionInput,
  CreatePaymentSessionResult,
  WebhookVerificationInput,
  WebhookVerificationResult,
} from '../types';

interface PayoneerConfig {
  merchantCode: string;
  paymentToken: string;
  webhookSecret: string;
  environment: 'sandbox' | 'live';
  divisionCode: string;
  defaultCountry: string;
}

function getConfig(): PayoneerConfig | null {
  const merchantCode = process.env.PAYONEER_MERCHANT_CODE?.trim();
  const paymentToken = process.env.PAYONEER_PAYMENT_TOKEN?.trim();
  const webhookSecret = process.env.PAYONEER_WEBHOOK_SECRET?.trim();
  const environment = process.env.PAYONEER_ENVIRONMENT === 'live' ? 'live' : 'sandbox';
  const divisionCode = (process.env.PAYONEER_DIVISION_CODE ?? merchantCode)?.trim();
  const configuredCountry = (process.env.PAYONEER_DEFAULT_COUNTRY ?? 'US').trim().toUpperCase();
  const defaultCountry = /^[A-Z]{2}$/.test(configuredCountry) ? configuredCountry : 'US';

  if (!merchantCode || !paymentToken || !webhookSecret || !divisionCode) return null;
  return { merchantCode, paymentToken, webhookSecret, environment, divisionCode, defaultCountry };
}

function getApiBaseUrl(environment: 'sandbox' | 'live'): string {
  return environment === 'live'
    ? 'https://api.live.oscato.com'
    : 'https://api.sandbox.oscato.com';
}

type PayoneerStatus = 'completed' | 'failed' | 'cancelled' | 'refunded' | 'pending';

function mapPayoneerStatus(interactionCode: string, resultCode?: string): PayoneerStatus {
  const code = (interactionCode ?? '').toUpperCase();
  const result = (resultCode ?? '').toUpperCase();

  if ((code === 'PROCEED' && result === 'PAID') || code === 'PAID' || code === 'CHARGED') {
    return 'completed';
  }
  if (code === 'REFUND_SUCCESS' || code === 'REFUNDED') return 'refunded';
  if (code === 'ABORT' || code === 'CANCELLED' || code === 'CANCEL') return 'cancelled';
  if (
    code === 'EXPIRED' ||
    code === 'FAILED' ||
    code === 'FAILURE' ||
    code === 'DECLINED' ||
    code === 'RETRY' ||
    code === 'TRY_OTHER_ACCOUNT' ||
    code === 'TRY_OTHER_NETWORK'
  ) {
    return 'failed';
  }

  // Unknown or in-progress signed states never grant entitlement and never
  // convert an order to failed automatically.
  return 'pending';
}

interface PayoneerListRequest {
  transactionId: string;
  country: string;
  currency: string;
  division: string;
  payment: {
    amount: number;
    currency: string;
    reference: string;
  };
  customer: {
    number: string;
    email?: string;
  };
  products?: Array<{
    code: string;
    name: string;
    amount: number;
    currency: string;
    quantity: number;
  }>;
  callback: {
    returnUrl: string;
    cancelUrl: string;
    notificationUrl: string;
  };
  style?: { hostedVersion: string };
}

interface PayoneerListResponse {
  resultInfo?: string;
  interaction?: { code: string; reason?: string };
  links?: { self?: string; redirect?: string; lang?: string };
  identification?: { longId?: string; shortId?: string; transactionId?: string };
  payment?: { amount?: number; currency?: string; reference?: string };
}

interface PayoneerWebhookPayload {
  transactionId?: string;
  longId?: string;
  shortId?: string;
  interaction?: { code?: string; reason?: string };
  resultInfo?: string;
  payment?: { amount?: number; currency?: string; reference?: string };
  identification?: { longId?: string; shortId?: string; transactionId?: string };
  timestamp?: string;
}

function parseSignature(value: string): Buffer | null {
  const signature = value.trim().replace(/^sha256=/i, '');
  if (/^[a-f0-9]{64}$/i.test(signature)) {
    return Buffer.from(signature, 'hex');
  }

  try {
    const decoded = Buffer.from(signature, 'base64');
    return decoded.length === 32 ? decoded : null;
  } catch {
    return null;
  }
}

function isSafeHostedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export class PayoneerProvider implements IPaymentProvider {
  readonly name = 'payoneer' as const;

  async createSession(input: CreatePaymentSessionInput): Promise<CreatePaymentSessionResult> {
    const config = getConfig();
    if (!config) {
      return {
        success: false,
        error: 'Payoneer Checkout is not configured. Please contact support or try another payment method.',
      };
    }

    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { success: false, error: 'Invalid payment amount.' };
    }

    const currency = input.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      return { success: false, error: 'Invalid payment currency.' };
    }

    const baseUrl = getApiBaseUrl(config.environment);
    const listUrl = `${baseUrl}/checkout/session`;
    const credentials = Buffer.from(`${config.merchantCode}:${config.paymentToken}`).toString('base64');
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://summeca.com').replace(/\/$/, '');
    const amount = Math.round(input.amount * 100) / 100;

    const requestBody: PayoneerListRequest = {
      transactionId: input.orderId,
      country: config.defaultCountry,
      currency,
      division: config.divisionCode,
      payment: {
        amount,
        currency,
        reference: input.orderId,
      },
      customer: {
        number: input.userId,
      },
      products: [
        {
          code: input.orderId,
          name: `${input.productName} — ${input.planName}`.slice(0, 240),
          amount,
          currency,
          quantity: 1,
        },
      ],
      callback: {
        returnUrl: input.successUrl ?? `${siteUrl}/checkout/success?order_id=${encodeURIComponent(input.orderId)}`,
        cancelUrl: input.cancelUrl ?? `${siteUrl}/checkout/cancel?order_id=${encodeURIComponent(input.orderId)}`,
        notificationUrl: `${siteUrl}/api/payment/webhook?provider=payoneer`,
      },
      style: { hostedVersion: 'v4' },
    };

    let response: Response;
    try {
      response = await fetch(listUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${credentials}`,
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      console.error('[PayoneerProvider] createSession network error:', err);
      return { success: false, error: 'Unable to connect to payment provider. Please try again.' };
    }

    let data: PayoneerListResponse;
    try {
      data = (await response.json()) as PayoneerListResponse;
    } catch {
      console.error('[PayoneerProvider] invalid JSON response, status:', response.status);
      return { success: false, error: 'Payment provider returned an unexpected response.' };
    }

    if (!response.ok) {
      console.error('[PayoneerProvider] createSession failed:', response.status, data?.resultInfo ?? 'unknown');
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'Payment provider authentication failed. Please contact support.' };
      }
      return { success: false, error: 'Payment provider is temporarily unavailable. Please try again later.' };
    }

    const redirectUrl = data?.links?.redirect;
    const providerPaymentRef =
      data?.identification?.longId ??
      data?.identification?.shortId ??
      data?.identification?.transactionId;

    if (!redirectUrl || !isSafeHostedUrl(redirectUrl)) {
      console.error('[PayoneerProvider] invalid or missing hosted checkout URL');
      return { success: false, error: 'Payment provider did not return a valid checkout URL.' };
    }

    if (!providerPaymentRef) {
      console.error('[PayoneerProvider] missing provider payment reference');
      return { success: false, error: 'Payment provider did not return a payment reference.' };
    }

    return {
      success: true,
      providerPaymentRef,
      redirectUrl,
    };
  }

  async verifyWebhook(input: WebhookVerificationInput): Promise<WebhookVerificationResult> {
    const config = getConfig();
    if (!config) {
      return { verified: false, error: 'Payoneer is not configured.' };
    }

    const signatureValue =
      input.headers['x-optile-signature'] ??
      input.headers['x-payoneer-signature'] ??
      input.signature;

    if (!signatureValue) {
      console.warn('[PayoneerProvider] missing webhook signature');
      return { verified: false, error: 'Missing webhook signature.' };
    }

    const received = parseSignature(signatureValue);
    const expected = createHmac('sha256', config.webhookSecret)
      .update(input.rawBody, 'utf8')
      .digest();

    if (!received || received.length !== expected.length || !timingSafeEqual(received, expected)) {
      console.warn('[PayoneerProvider] webhook signature mismatch');
      return { verified: false, error: 'Webhook signature verification failed.' };
    }

    let payload: PayoneerWebhookPayload;
    try {
      payload = JSON.parse(input.rawBody) as PayoneerWebhookPayload;
    } catch {
      return { verified: false, error: 'Invalid webhook JSON.' };
    }

    const orderId =
      payload.transactionId ??
      payload.identification?.transactionId ??
      payload.payment?.reference;

    if (!orderId || typeof orderId !== 'string') {
      return { verified: false, error: 'Webhook payload missing order reference.' };
    }

    const providerPaymentRef =
      payload.identification?.longId ??
      payload.identification?.shortId ??
      payload.longId ??
      payload.shortId;

    if (!providerPaymentRef || typeof providerPaymentRef !== 'string') {
      return { verified: false, error: 'Webhook payload missing provider payment reference.' };
    }

    const status = mapPayoneerStatus(
      payload.interaction?.code ?? '',
      payload.resultInfo ?? ''
    );

    const amount = typeof payload.payment?.amount === 'number' && Number.isFinite(payload.payment.amount)
      ? payload.payment.amount
      : undefined;
    const currency = typeof payload.payment?.currency === 'string'
      ? payload.payment.currency.trim().toUpperCase()
      : undefined;

    return {
      verified: true,
      orderId: orderId.trim(),
      providerPaymentRef: providerPaymentRef.trim(),
      amount,
      currency,
      paymentStatus: status,
      metadata: {
        provider: 'payoneer',
        payment_method_type: 'payoneer',
        provider_payment_ref: providerPaymentRef.trim(),
      },
    };
  }
}

export function isPayoneerConfigured(): boolean {
  return getConfig() !== null;
}
