/**
 * Payoneer Checkout Provider — Version 20
 *
 * Implements the IPaymentProvider interface using Payoneer's official
 * Checkout API (checkoutdocs.payoneer.com).
 *
 * Integration approach: Hosted Payment Page
 *   1. Server calls POST /lists to create a payment session.
 *   2. Server returns the hosted checkout redirect URL to the client.
 *   3. Customer completes payment on Payoneer's secure hosted page.
 *   4. Payoneer sends a webhook/IPN notification to SUMMECA's webhook endpoint.
 *   5. SUMMECA verifies the webhook server-side and updates the order.
 *
 * Official docs: https://checkoutdocs.payoneer.com/docs/api-reference
 * Postman collection: https://www.postman.com/payoneerdocs/payoneer-checkout-api
 *
 * SECURITY CONTRACT:
 * - All credentials are read from environment variables — NEVER from client code.
 * - No CVV, full card numbers, or secrets are stored.
 * - Orders are NEVER marked completed from the frontend.
 * - Webhook verification uses HMAC-SHA256 with PAYONEER_WEBHOOK_SECRET.
 *
 * AVAILABILITY NOTE:
 * Payoneer Checkout (powered by Stripe) is currently available only for
 * US and Hong Kong entities with monthly webstore volumes above USD $20,000.
 * The provider will report itself as unavailable until valid credentials
 * are configured via environment variables.
 *
 * Required ENV variables:
 *   PAYONEER_MERCHANT_CODE       — Your Payoneer merchant/division code
 *   PAYONEER_PAYMENT_TOKEN       — Your Payoneer API payment token (server-side only)
 *   PAYONEER_WEBHOOK_SECRET      — Secret used to verify webhook signatures
 *   PAYONEER_ENVIRONMENT         — 'sandbox' | 'live' (defaults to 'sandbox')
 *   PAYONEER_DIVISION_CODE       — Division code (often same as merchant code)
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type {
  IPaymentProvider,
  CreatePaymentSessionInput,
  CreatePaymentSessionResult,
  WebhookVerificationInput,
  WebhookVerificationResult,
} from '../types';

// ─── Configuration ────────────────────────────────────────────────────────────

interface PayoneerConfig {
  merchantCode: string;
  paymentToken: string;
  webhookSecret: string;
  environment: 'sandbox' | 'live';
  divisionCode: string;
}

/**
 * Read and validate Payoneer configuration from environment variables.
 * Returns null if any required variable is missing — the provider will
 * report itself as unavailable rather than throwing at import time.
 */
function getConfig(): PayoneerConfig | null {
  const merchantCode = process.env.PAYONEER_MERCHANT_CODE;
  const paymentToken = process.env.PAYONEER_PAYMENT_TOKEN;
  const webhookSecret = process.env.PAYONEER_WEBHOOK_SECRET;
  const environment = (process.env.PAYONEER_ENVIRONMENT ?? 'sandbox') as 'sandbox' | 'live';
  const divisionCode = process.env.PAYONEER_DIVISION_CODE ?? merchantCode;

  if (!merchantCode || !paymentToken || !webhookSecret) {
    return null;
  }

  return { merchantCode, paymentToken, webhookSecret, environment, divisionCode: divisionCode! };
}

/**
 * Build the Payoneer Checkout API base URL based on environment.
 *
 * Sandbox: https://api.sandbox.oscato.com
 * Live:    https://api.live.oscato.com
 *
 * The /lists endpoint is the official Payoneer Checkout session creation endpoint.
 * Reference: https://checkoutdocs.payoneer.com/docs/api-reference
 */
function getApiBaseUrl(environment: 'sandbox' | 'live'): string {
  return environment === 'live' ?'https://api.live.oscato.com'
    : 'https://api.sandbox.oscato.com';
}

// ─── Payoneer status → SUMMECA status mapping ─────────────────────────────────
//
// Payoneer Checkout interaction codes and result codes:
//   PROCEED / VERIFY → payment in progress / needs verification
//   PAID             → payment successful (maps to 'completed')
//   FAILED           → payment failed (maps to 'failed')
//   ABORT            → customer cancelled (maps to 'cancelled')
//   EXPIRED          → session expired (maps to 'failed')
//   REFUND_SUCCESS   → refund completed (maps to 'refunded')
//
// Reference: https://checkoutdocs.payoneer.com/docs/interaction-codes-callback-mapping

type SummerStatus = 'completed' | 'failed' | 'cancelled' | 'refunded' | 'pending';

function mapPayoneerStatus(
  interactionCode: string,
  resultCode?: string
): SummerStatus {
  const code = (interactionCode ?? '').toUpperCase();
  const result = (resultCode ?? '').toUpperCase();

  // Successful payment
  if (code === 'PROCEED' && result === 'PAID') return 'completed';
  if (code === 'PAID') return 'completed';
  if (code === 'CHARGED') return 'completed';

  // Refund
  if (code === 'REFUND_SUCCESS' || code === 'REFUNDED') return 'refunded';

  // Cancellation by customer
  if (code === 'ABORT' || code === 'CANCELLED' || code === 'CANCEL') return 'cancelled';

  // Expired session
  if (code === 'EXPIRED') return 'failed';

  // Explicit failure
  if (code === 'FAILED' || code === 'FAILURE' || code === 'DECLINED') return 'failed';
  if (code === 'RETRY' || code === 'TRY_OTHER_ACCOUNT' || code === 'TRY_OTHER_NETWORK') return 'failed';

  // Still in progress
  if (code === 'PROCEED' || code === 'VERIFY') return 'pending';

  // Unknown — treat as failed to be safe
  return 'failed';
}

// ─── Payoneer API types ───────────────────────────────────────────────────────

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
  style?: {
    hostedVersion: string;
  };
}

interface PayoneerListResponse {
  resultInfo?: string;
  interaction?: {
    code: string;
    reason?: string;
  };
  links?: {
    self?: string;
    redirect?: string;
    lang?: string;
  };
  identification?: {
    longId?: string;
    shortId?: string;
    transactionId?: string;
  };
  payment?: {
    amount?: number;
    currency?: string;
    reference?: string;
  };
}

interface PayoneerWebhookPayload {
  transactionId?: string;
  longId?: string;
  shortId?: string;
  interaction?: {
    code?: string;
    reason?: string;
  };
  resultInfo?: string;
  payment?: {
    amount?: number;
    currency?: string;
    reference?: string;
  };
  identification?: {
    longId?: string;
    shortId?: string;
    transactionId?: string;
  };
  timestamp?: string;
  // The order ID is stored in transactionId / payment.reference
}

// ─── Provider implementation ──────────────────────────────────────────────────

export class PayoneerProvider implements IPaymentProvider {
  readonly name = 'payoneer' as const;

  /**
   * Create a Payoneer Checkout payment session.
   *
   * Flow:
   *   1. Validate configuration — return error if credentials are missing.
   *   2. POST to Payoneer /lists endpoint with order details.
   *   3. Extract the hosted checkout redirect URL from the response.
   *   4. Return the redirect URL and the Payoneer longId as providerPaymentRef.
   *
   * The longId is stored in orders.provider_payment_ref and used to match
   * incoming webhook events to the correct order.
   */
  async createSession(
    input: CreatePaymentSessionInput
  ): Promise<CreatePaymentSessionResult> {
    const config = getConfig();

    if (!config) {
      return {
        success: false,
        error:
          'Payoneer Checkout is not configured. ' + 'Please contact support or try another payment method.',
      };
    }

    const baseUrl = getApiBaseUrl(config.environment);
    const listUrl = `${baseUrl}/checkout/session`;

    // Build the Basic Auth header: base64(merchantCode:paymentToken)
    const credentials = Buffer.from(
      `${config.merchantCode}:${config.paymentToken}`
    ).toString('base64');

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://summeca1430.builtwithrocket.new';

    const requestBody: PayoneerListRequest = {
      transactionId: input.orderId,
      country: 'US', // Default; can be made configurable
      currency: input.currency.toUpperCase(),
      division: config.divisionCode,
      payment: {
        amount: Math.round(input.amount * 100) / 100, // Payoneer uses decimal amounts
        currency: input.currency.toUpperCase(),
        reference: input.orderId,
      },
      customer: {
        number: input.userId,
      },
      products: [
        {
          code: input.orderId,
          name: `${input.productName} — ${input.planName}`,
          amount: Math.round(input.amount * 100) / 100,
          currency: input.currency.toUpperCase(),
          quantity: 1,
        },
      ],
      callback: {
        returnUrl: input.successUrl ?? `${siteUrl}/checkout/success?order_id=${input.orderId}`,
        cancelUrl: input.cancelUrl ?? `${siteUrl}/checkout/cancel?order_id=${input.orderId}`,
        // Webhook endpoint — provider identified via query param
        notificationUrl: `${siteUrl}/api/payment/webhook?provider=payoneer`,
      },
      style: {
        hostedVersion: 'v4',
      },
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
        signal: AbortSignal.timeout(15_000), // 15 second timeout
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      console.error('[PayoneerProvider] createSession network error:', message);
      return {
        success: false,
        error: 'Unable to connect to payment provider. Please try again.',
      };
    }

    let data: PayoneerListResponse;
    try {
      data = (await response.json()) as PayoneerListResponse;
    } catch {
      console.error('[PayoneerProvider] createSession: invalid JSON response, status:', response.status);
      return {
        success: false,
        error: 'Payment provider returned an unexpected response. Please try again.',
      };
    }

    if (!response.ok) {
      // Log non-sensitive error info only
      console.error(
        '[PayoneerProvider] createSession failed:',
        response.status,
        data?.resultInfo ?? 'unknown error'
      );

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: 'Payment provider authentication failed. Please contact support.',
        };
      }

      return {
        success: false,
        error: 'Payment provider is temporarily unavailable. Please try again later.',
      };
    }

    // Extract the hosted checkout redirect URL
    const redirectUrl = data?.links?.redirect;
    const longId =
      data?.identification?.longId ??
      data?.identification?.shortId ??
      data?.identification?.transactionId;

    if (!redirectUrl) {
      console.error('[PayoneerProvider] createSession: no redirect URL in response');
      return {
        success: false,
        error: 'Payment provider did not return a checkout URL. Please try again.',
      };
    }

    return {
      success: true,
      providerPaymentRef: longId ?? input.orderId,
      redirectUrl,
    };
  }

  /**
   * Verify an incoming Payoneer webhook/IPN notification.
   *
   * Payoneer Checkout sends webhook notifications to the configured
   * notificationUrl. The notification includes:
   *   - transactionId: the SUMMECA order ID (set as transactionId in createSession)
   *   - interaction.code: the payment result code
   *   - payment.amount / payment.currency: for amount/currency validation
   *   - identification.longId: the Payoneer session reference
   *
   * Signature verification:
   *   Payoneer sends an HMAC-SHA256 signature in the X-Optile-Signature header
   *   (or X-Payoneer-Signature). The signature is computed over the raw request
   *   body using the PAYONEER_WEBHOOK_SECRET.
   *
   * Reference: https://checkoutdocs.payoneer.com/docs/webhook-notifications
   */
  async verifyWebhook(
    input: WebhookVerificationInput
  ): Promise<WebhookVerificationResult> {
    const config = getConfig();

    if (!config) {
      return {
        verified: false,
        error: 'Payoneer is not configured — webhook cannot be verified.',
      };
    }

    // ── 1. Verify HMAC-SHA256 signature ──────────────────────────────────────
    // Payoneer sends the signature in X-Optile-Signature or X-Payoneer-Signature
    const signature =
      input.headers['x-optile-signature'] ??
      input.headers['x-payoneer-signature'] ??
      input.signature;

    if (!signature) {
      console.warn('[PayoneerProvider] verifyWebhook: missing signature header');
      return {
        verified: false,
        error: 'Missing webhook signature.',
      };
    }

    // Compute expected HMAC-SHA256 signature
    const expectedSig = createHmac('sha256', config.webhookSecret)
      .update(input.rawBody, 'utf8')
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks
    let signaturesMatch = false;
    try {
      signaturesMatch = timingSafeEqual(
        Buffer.from(signature.toLowerCase(), 'hex'),
        Buffer.from(expectedSig, 'hex')
      );
    } catch {
      // Buffer lengths differ — signature is definitely invalid
      signaturesMatch = false;
    }

    if (!signaturesMatch) {
      console.warn('[PayoneerProvider] verifyWebhook: signature mismatch');
      return {
        verified: false,
        error: 'Webhook signature verification failed.',
      };
    }

    // ── 2. Parse the webhook payload ─────────────────────────────────────────
    let payload: PayoneerWebhookPayload;
    try {
      payload = JSON.parse(input.rawBody) as PayoneerWebhookPayload;
    } catch {
      return {
        verified: false,
        error: 'Invalid webhook payload — could not parse JSON.',
      };
    }

    // ── 3. Extract order ID ───────────────────────────────────────────────────
    // The order ID was set as transactionId and payment.reference in createSession
    const orderId =
      payload.transactionId ??
      payload.identification?.transactionId ??
      payload.payment?.reference;

    if (!orderId) {
      console.warn('[PayoneerProvider] verifyWebhook: no orderId in payload');
      return {
        verified: false,
        error: 'Webhook payload missing order reference.',
      };
    }

    // ── 4. Extract provider reference ────────────────────────────────────────
    const providerPaymentRef =
      payload.identification?.longId ??
      payload.identification?.shortId ??
      payload.longId ??
      payload.shortId ??
      orderId;

    // ── 5. Map payment status ─────────────────────────────────────────────────
    const interactionCode = payload.interaction?.code ?? '';
    const resultInfo = payload.resultInfo ?? '';
    const payoneerStatus = mapPayoneerStatus(interactionCode, resultInfo);

    // Only mark as verified=true for successful payments
    const isSuccessful = payoneerStatus === 'completed';

    return {
      verified: isSuccessful || payoneerStatus === 'failed' || payoneerStatus === 'cancelled' || payoneerStatus === 'refunded',
      orderId,
      providerPaymentRef,
      paymentStatus: payoneerStatus === 'pending' ? 'failed' : payoneerStatus,
      metadata: {
        provider: 'payoneer',
        payment_method_type: 'payoneer',
        provider_payment_ref: providerPaymentRef,
      },
    };
  }
}

/**
 * Check whether Payoneer Checkout is configured and available.
 * Used by the checkout UI to show "Available" vs "Temporarily unavailable".
 * This function is safe to call from server components — it reads env vars only.
 */
export function isPayoneerConfigured(): boolean {
  const merchantCode = process.env.PAYONEER_MERCHANT_CODE;
  const paymentToken = process.env.PAYONEER_PAYMENT_TOKEN;
  const webhookSecret = process.env.PAYONEER_WEBHOOK_SECRET;
  return Boolean(merchantCode && paymentToken && webhookSecret);
}
