/**
 * Provider-agnostic payment abstraction layer.
 *
 * SECURITY CONTRACT:
 * - Full card numbers, CVV, and private keys are NEVER stored here or in Supabase.
 * - Only non-sensitive metadata is persisted: provider, payment_method_type,
 *   provider_payment_ref (opaque token from provider), card_brand, card_last4.
 * - Orders are NEVER marked completed from the frontend.
 *   Status transitions happen exclusively via server-side webhook verification.
 */

// ─── Supported payment providers ─────────────────────────────────────────────

export type PaymentProvider = 'payoneer' | 'crypto' | 'manual';

// ─── Payment method types ─────────────────────────────────────────────────────

export type PaymentMethodType =
  | 'card'          // Credit / debit card (via Payoneer or other provider)
  | 'payoneer'      // Payoneer balance / e-wallet
  | 'crypto_btc'    // Bitcoin
  | 'crypto_eth'    // Ethereum
  | 'crypto_usdt'   // USDT (Tether)
  | 'crypto_usdc'   // USDC
  | string;         // Extensible for future providers

// ─── Non-sensitive payment metadata (safe to store in Supabase) ───────────────

export interface PaymentMetadata {
  /** Which provider processed / will process the payment */
  provider: PaymentProvider;
  /** High-level method type */
  payment_method_type: PaymentMethodType;
  /** Opaque reference issued by the payment provider (e.g. checkout session ID, tx hash prefix) */
  provider_payment_ref?: string;
  /** Card brand — only for card payments */
  card_brand?: string;
  /** Last 4 digits — only for card payments */
  card_last4?: string;
}

// ─── Order payload sent to the provider abstraction ──────────────────────────

export interface CreatePaymentSessionInput {
  orderId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  paymentMethodType: PaymentMethodType;
  productName: string;
  planName: string;
  userId: string;
  /** Redirect URL after payment (provider-specific) */
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreatePaymentSessionResult {
  /** Whether the session was created successfully */
  success: boolean;
  /** Opaque reference to store in orders.provider_payment_ref */
  providerPaymentRef?: string;
  /** URL to redirect the user to (for hosted checkout pages) */
  redirectUrl?: string;
  /** Payment address for crypto payments */
  paymentAddress?: string;
  /** Amount in the crypto's smallest unit */
  cryptoAmount?: string;
  /** Human-readable instructions for the user */
  instructions?: string;
  error?: string;
}

// ─── Webhook verification payload ────────────────────────────────────────────

export interface WebhookVerificationInput {
  provider: PaymentProvider;
  /** Raw request body (string) for signature verification */
  rawBody: string;
  /** Provider-specific signature header value */
  signature?: string;
  /** All request headers */
  headers: Record<string, string>;
}

export interface WebhookVerificationResult {
  /** Whether the webhook is authentic and the payment is confirmed */
  verified: boolean;
  /** The order ID this payment is for */
  orderId?: string;
  /** The provider's own payment reference */
  providerPaymentRef?: string;
  /** Non-sensitive metadata to store */
  metadata?: PaymentMetadata;
  /** Whether the payment was successful (vs failed/refunded) */
  paymentStatus?: 'completed' | 'failed' | 'refunded' | 'cancelled';
  error?: string;
}

// ─── Provider interface ───────────────────────────────────────────────────────

export interface IPaymentProvider {
  readonly name: PaymentProvider;

  /**
   * Create a payment session / checkout URL.
   * Called server-side when the user clicks "Place Order".
   */
  createSession(input: CreatePaymentSessionInput): Promise<CreatePaymentSessionResult>;

  /**
   * Verify an incoming webhook event.
   * Called server-side only — NEVER from the frontend.
   * Returns verified=true only when the payment is genuinely confirmed.
   */
  verifyWebhook(input: WebhookVerificationInput): Promise<WebhookVerificationResult>;
}
