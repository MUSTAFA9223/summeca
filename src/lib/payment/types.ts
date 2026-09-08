/**
 * Provider-agnostic payment abstraction layer.
 *
 * SECURITY CONTRACT:
 * - Full card numbers, CVV, private keys and seed phrases are NEVER stored here or in Supabase.
 * - Only non-sensitive payment metadata is persisted.
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
  | 'crypto_usdt_trc20'
  | 'crypto_usdt_erc20'
  | 'crypto_usdc'
  | 'crypto_usdc_polygon'
  | string;

export interface PaymentMetadata {
  provider: PaymentProvider;
  payment_method_type: PaymentMethodType;
  provider_payment_ref?: string;
  card_brand?: string;
  card_last4?: string;
  /** Safe provider state retained for audit/debugging, e.g. partially_paid or expired. */
  provider_status?: string;
  /** Public/non-secret crypto descriptors only. */
  crypto_currency?: string;
  crypto_network?: string;
  crypto_amount?: string;
  crypto_actually_paid?: string;
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
  /** Provider-confirmed order price amount/currency, validated before fulfillment. */
  amount?: number;
  currency?: string;
  /** Normalized state. Provider-specific state is retained in metadata.provider_status. */
  paymentStatus?: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  error?: string;
}

export interface IPaymentProvider {
  readonly name: PaymentProvider;
  createSession(input: CreatePaymentSessionInput): Promise<CreatePaymentSessionResult>;
  verifyWebhook(input: WebhookVerificationInput): Promise<WebhookVerificationResult>;
}
