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

export type PaymentProvider = 'payoneer' | 'crypto' | 'manual';

export type PaymentMethodType =
  | 'card'
  | 'payoneer'
  | 'crypto_btc'
  | 'crypto_eth'
  | 'crypto_usdt'
  | 'crypto_usdc'
  | string;

export interface PaymentMetadata {
  provider: PaymentProvider;
  payment_method_type: PaymentMethodType;
  provider_payment_ref?: string;
  card_brand?: string;
  card_last4?: string;
}

export interface CreatePaymentSessionInput {
  orderId: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  paymentMethodType: PaymentMethodType;
  productName: string;
  planName: string;
  userId: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreatePaymentSessionResult {
  success: boolean;
  providerPaymentRef?: string;
  redirectUrl?: string;
  paymentAddress?: string;
  cryptoAmount?: string;
  instructions?: string;
  error?: string;
}

export interface WebhookVerificationInput {
  provider: PaymentProvider;
  rawBody: string;
  signature?: string;
  headers: Record<string, string>;
}

export interface WebhookVerificationResult {
  /** True only when the webhook itself is authentic. */
  verified: boolean;
  orderId?: string;
  providerPaymentRef?: string;
  metadata?: PaymentMetadata;
  /** Provider-confirmed amount/currency, used to validate the order before fulfillment. */
  amount?: number;
  currency?: string;
  /** Signed provider state. Pending events are acknowledged without mutating entitlements. */
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  error?: string;
}

export interface IPaymentProvider {
  readonly name: PaymentProvider;
  createSession(input: CreatePaymentSessionInput): Promise<CreatePaymentSessionResult>;
  verifyWebhook(input: WebhookVerificationInput): Promise<WebhookVerificationResult>;
}
