import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  CreatePaymentSessionInput,
  CreatePaymentSessionResult,
  IPaymentProvider,
  PaymentMethodType,
  WebhookVerificationInput,
  WebhookVerificationResult,
} from '../types';

const FASTSPRING_API_URL = 'https://api.fastspring.com';

type FastSpringConfig = {
  username: string;
  password: string;
  webhookSecret: string;
  storefrontUrl: string;
  live: boolean;
};

type FastSpringSessionResponse = {
  id?: string;
  currency?: string;
  subtotal?: number;
  error?: string;
  message?: string;
};

type FastSpringPayment = {
  type?: string;
  cardEnding?: string;
  bank?: { display?: string };
  creditcard?: { type?: string; cardEnding?: string };
};

type FastSpringOrderData = {
  id?: string;
  order?: string;
  reference?: string;
  live?: boolean;
  currency?: string;
  subtotal?: number;
  total?: number;
  tags?: Record<string, unknown>;
  payment?: FastSpringPayment;
  items?: Array<{
    product?: string;
    subtotal?: number;
    attributes?: Record<string, unknown>;
  }>;
};

type FastSpringEvent = {
  id?: string;
  type?: string;
  live?: boolean;
  data?: FastSpringOrderData;
};

type FastSpringWebhookEnvelope = {
  events?: FastSpringEvent[];
};

function normalizeStorefrontUrl(value: string): string | null {
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.onfastspring.com')) return null;
    return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
  } catch {
    return null;
  }
}

function getConfig(): FastSpringConfig | null {
  const username = process.env.FASTSPRING_API_USERNAME?.trim();
  const password = process.env.FASTSPRING_API_PASSWORD?.trim();
  const webhookSecret = process.env.FASTSPRING_WEBHOOK_SECRET?.trim();
  const storefrontUrl = normalizeStorefrontUrl(process.env.FASTSPRING_STOREFRONT_URL?.trim() ?? '');
  const live = process.env.FASTSPRING_ENVIRONMENT?.trim().toLowerCase() === 'live';

  if (!username || !password || !webhookSecret || !storefrontUrl) return null;
  return { username, password, webhookSecret, storefrontUrl, live };
}

function safeSignatureEqual(expected: Buffer, receivedBase64: string): boolean {
  try {
    const received = Buffer.from(receivedBase64.trim(), 'base64');
    return received.length === expected.length && timingSafeEqual(received, expected);
  } catch {
    return false;
  }
}

function paymentMethodFromOrder(payment?: FastSpringPayment): PaymentMethodType {
  const normalized = String(payment?.type ?? '').toLowerCase();
  if (normalized.includes('paypal')) return 'paypal';
  if (normalized.includes('apple')) return 'apple_pay';
  if (normalized.includes('google')) return 'google_pay';
  return 'card';
}

function cardBrand(payment?: FastSpringPayment): string | undefined {
  const value = payment?.creditcard?.type ?? payment?.bank?.display;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function cardLast4(payment?: FastSpringPayment): string | undefined {
  const value = payment?.creditcard?.cardEnding ?? payment?.cardEnding;
  return typeof value === 'string' && /^\d{4}$/.test(value.trim()) ? value.trim() : undefined;
}

function orderIdFromData(data?: FastSpringOrderData): string {
  const tags = data?.tags ?? {};
  const fromTag = tags.summeca_order_id;
  if (typeof fromTag === 'string' && fromTag.trim()) return fromTag.trim();

  for (const item of data?.items ?? []) {
    const fromAttribute = item.attributes?.summeca_order_id;
    if (typeof fromAttribute === 'string' && fromAttribute.trim()) return fromAttribute.trim();
  }
  return '';
}

function verifySignature(input: WebhookVerificationInput, secret: string): boolean {
  const signature = input.headers['x-fs-signature']?.trim() ?? input.signature?.trim() ?? '';
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(input.rawBody, 'utf8').digest();
  return safeSignatureEqual(expected, signature);
}

function buildVerification(event: FastSpringEvent): WebhookVerificationResult | null {
  if (event.type !== 'order.completed') return null;

  const data = event.data;
  const orderId = orderIdFromData(data);
  const providerPaymentRef = String(data?.id ?? data?.order ?? '').trim();
  const amount = Number(data?.subtotal);
  const currency = String(data?.currency ?? '').trim().toUpperCase();

  if (!orderId || !providerPaymentRef || !Number.isFinite(amount) || amount < 0 || !currency) {
    return {
      verified: false,
      error: 'FastSpring order.completed event is missing trusted order, amount, currency, or payment reference data.',
    };
  }

  return {
    verified: true,
    orderId,
    providerPaymentRef,
    amount,
    currency,
    paymentStatus: 'completed',
    metadata: {
      provider: 'fastspring',
      payment_method_type: paymentMethodFromOrder(data?.payment),
      provider_payment_ref: providerPaymentRef,
      provider_live: data?.live ?? event.live ?? false,
      ...(cardBrand(data?.payment) ? { card_brand: cardBrand(data?.payment) } : {}),
      ...(cardLast4(data?.payment) ? { card_last4: cardLast4(data?.payment) } : {}),
    },
  };
}

export class FastSpringProvider implements IPaymentProvider {
  readonly name = 'fastspring' as const;

  async createSession(input: CreatePaymentSessionInput): Promise<CreatePaymentSessionResult> {
    const config = getConfig();
    if (!config) {
      return { success: false, error: 'FastSpring checkout is not configured.' };
    }

    const productPath = input.providerProductPath?.trim();
    if (!productPath || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(productPath)) {
      return { success: false, error: 'This product is not mapped to a valid FastSpring product path.' };
    }

    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { success: false, error: 'Invalid payment amount.' };
    }

    const currency = input.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      return { success: false, error: 'Invalid payment currency.' };
    }

    const amount = Math.round(input.amount * 100) / 100;
    const pricing: Record<string, unknown> = {
      price: { [currency]: amount },
      quantityBehavior: 'hide',
      quantityDefault: 1,
    };

    if (input.billingPeriod === 'monthly') {
      Object.assign(pricing, { interval: 'month', intervalLength: 1, intervalCount: null, renew: 'auto' });
    } else if (input.billingPeriod === 'yearly') {
      Object.assign(pricing, { interval: 'year', intervalLength: 1, intervalCount: null, renew: 'auto' });
    }

    const requestBody = {
      tags: {
        summeca_order_id: input.orderId,
        summeca_user_id: input.userId,
        summeca_product_path: productPath,
      },
      items: [
        {
          product: productPath,
          quantity: 1,
          pricing,
          attributes: {
            summeca_order_id: input.orderId,
            summeca_user_id: input.userId,
          },
        },
      ],
    };

    const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    let response: Response;
    try {
      response = await fetch(`${FASTSPRING_API_URL}/sessions`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'SUMMECA/1.0 (https://summeca.com)',
        },
        body: JSON.stringify(requestBody),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      console.error('[FastSpringProvider] createSession network error:', error);
      return { success: false, error: 'Unable to connect to FastSpring. Please try again.' };
    }

    const payload = (await response.json().catch(() => ({}))) as FastSpringSessionResponse;
    if (!response.ok) {
      console.error('[FastSpringProvider] createSession failed:', response.status, payload.message ?? payload.error ?? 'unknown');
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: 'FastSpring authentication failed. Please contact support.' };
      }
      return { success: false, error: payload.message ?? payload.error ?? 'FastSpring could not create the checkout session.' };
    }

    const sessionId = payload.id?.trim() ?? '';
    if (!sessionId) {
      return { success: false, error: 'FastSpring returned an incomplete checkout session.' };
    }

    const storefront = config.live
      ? config.storefrontUrl.replace('.test.onfastspring.com', '.onfastspring.com')
      : config.storefrontUrl.includes('.test.onfastspring.com')
        ? config.storefrontUrl
        : config.storefrontUrl.replace('.onfastspring.com', '.test.onfastspring.com');
    const redirectUrl = `${storefront}/session/${encodeURIComponent(sessionId)}`;

    return {
      success: true,
      providerPaymentRef: sessionId,
      redirectUrl,
      instructions: config.live ? 'FastSpring live checkout.' : 'FastSpring test checkout. Test orders never grant production access.',
    };
  }

  async verifyWebhook(input: WebhookVerificationInput): Promise<WebhookVerificationResult> {
    const results = await this.verifyWebhookBatch(input);
    return results[0] ?? { verified: false, error: 'FastSpring webhook did not contain a supported order event.' };
  }

  async verifyWebhookBatch(input: WebhookVerificationInput): Promise<WebhookVerificationResult[]> {
    const config = getConfig();
    if (!config) return [{ verified: false, error: 'FastSpring is not configured.' }];
    if (!verifySignature(input, config.webhookSecret)) {
      return [{ verified: false, error: 'FastSpring webhook signature verification failed.' }];
    }

    let envelope: FastSpringWebhookEnvelope;
    try {
      envelope = JSON.parse(input.rawBody) as FastSpringWebhookEnvelope;
    } catch {
      return [{ verified: false, error: 'Invalid FastSpring webhook JSON.' }];
    }

    if (!Array.isArray(envelope.events)) {
      return [{ verified: false, error: 'FastSpring webhook is missing its events array.' }];
    }

    const supported = envelope.events
      .map(buildVerification)
      .filter((value): value is WebhookVerificationResult => value !== null);

    return supported;
  }
}

export function getFastSpringReadiness() {
  const config = getConfig();
  return {
    configured: config !== null,
    live: config?.live === true,
  };
}
