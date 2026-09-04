/**
 * Cryptocurrency Payment Provider — Future Integration Stub
 *
 * This file is a placeholder for cryptocurrency payment processing.
 * When ready, integrate with a crypto payment processor such as:
 *   - NOWPayments (https://nowpayments.io/docs)
 *   - CoinGate (https://developer.coingate.com)
 *   - BTCPay Server (self-hosted, https://docs.btcpayserver.org)
 *
 * Required ENV variables (add when integrating):
 *   CRYPTO_PAYMENT_PROVIDER=nowpayments|coingate|btcpay
 *   CRYPTO_API_KEY=your_api_key
 *   CRYPTO_WEBHOOK_SECRET=your_ipn_secret
 *   CRYPTO_RECEIVING_ADDRESS_BTC=your_btc_address   (if self-managed)
 *   CRYPTO_RECEIVING_ADDRESS_ETH=your_eth_address   (if self-managed)
 *
 * SECURITY:
 * - NEVER store private keys, seed phrases, or wallet secrets in Supabase.
 * - Only store: transaction hash prefix (first 8 chars), network, coin symbol, amount.
 * - Webhook verification MUST use HMAC or provider-specific signature validation.
 */

import type {
  IPaymentProvider,
  CreatePaymentSessionInput,
  CreatePaymentSessionResult,
  WebhookVerificationInput,
  WebhookVerificationResult,
} from '../types';

export class CryptoProvider implements IPaymentProvider {
  readonly name = 'crypto' as const;

  async createSession(
    input: CreatePaymentSessionInput
  ): Promise<CreatePaymentSessionResult> {
    // TODO: Implement crypto payment session creation
    // 1. Call your chosen crypto processor API to create an invoice
    // 2. Return the payment address and crypto amount
    // 3. Store the invoice ID as providerPaymentRef in the order

    const coinMap: Record<string, string> = {
      crypto_btc: 'BTC',
      crypto_eth: 'ETH',
      crypto_usdt: 'USDT',
      crypto_usdc: 'USDC',
    };

    const coin = coinMap[input.paymentMethodType] ?? 'BTC';

    return {
      success: false,
      error:
        `Cryptocurrency (${coin}) payment integration is not yet configured. ` +
        'Please add CRYPTO_API_KEY and CRYPTO_WEBHOOK_SECRET to your environment.',
    };
  }

  async verifyWebhook(
    input: WebhookVerificationInput
  ): Promise<WebhookVerificationResult> {
    // TODO: Implement crypto IPN/webhook verification
    // 1. Validate HMAC signature using CRYPTO_WEBHOOK_SECRET
    // 2. Parse payload to extract order_id, tx_hash, and payment_status
    // 3. Optionally verify on-chain confirmation count
    // 4. Return verified=true only when payment_status === 'confirmed'

    return {
      verified: false,
      error: 'Crypto webhook verification not yet implemented.',
    };
  }
}
