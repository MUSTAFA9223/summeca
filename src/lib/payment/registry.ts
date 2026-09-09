/**
 * Payment Provider Registry
 *
 * Central registry for all payment providers.
 * Add new providers here as they are integrated.
 *
 * Usage:
 *   import { getProvider } from '@/lib/payment/registry';
 *   const provider = getProvider('payoneer');
 *   const session = await provider.createSession({ ... });
 */

import type { IPaymentProvider, PaymentProvider } from './types';
import { PayoneerProvider } from './providers/payoneer';
import { FastSpringProvider } from './providers/fastspring';
import { CryptoProvider } from './providers/crypto';

const providers: Record<PaymentProvider, IPaymentProvider> = {
  payoneer: new PayoneerProvider(),
  fastspring: new FastSpringProvider(),
  crypto: new CryptoProvider(),
  manual: {
    name: 'manual',
    async createSession() {
      return { success: true, instructions: 'Manual payment — awaiting admin confirmation.' };
    },
    async verifyWebhook() {
      return { verified: false, error: 'Manual payments are verified by admin only.' };
    },
  },
};

/**
 * Get a payment provider by name.
 * Throws if the provider is not registered.
 */
export function getProvider(name: PaymentProvider): IPaymentProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Payment provider "${name}" is not registered.`);
  }
  return provider;
}

/**
 * List all registered provider names.
 */
export function listProviders(): PaymentProvider[] {
  return Object.keys(providers) as PaymentProvider[];
}
