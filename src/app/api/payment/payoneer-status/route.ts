/**
 * GET /api/payment/payoneer-status
 *
 * Returns whether Payoneer Checkout is configured and available.
 * This endpoint is safe to call from the client — it returns only a boolean.
 * No credentials or secrets are ever exposed.
 */

import { NextResponse } from 'next/server';
import { isPayoneerConfigured } from '@/lib/payment/providers/payoneer';

export async function GET() {
  const available = isPayoneerConfigured();
  return NextResponse?.json({ available });
}
