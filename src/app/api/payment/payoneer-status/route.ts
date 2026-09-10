import { NextResponse } from 'next/server';
import { getPayoneerReadiness } from '@/lib/payment/providers/payoneer';

export async function GET() {
  const readiness = getPayoneerReadiness();
  const response = NextResponse.json({
    available: readiness.configured && readiness.environment === 'live',
    configured: readiness.configured,
    live: readiness.environment === 'live',
    provider: 'payoneer',
    configuration: {
      merchantCode: readiness.merchantCode,
      paymentToken: readiness.paymentToken,
      webhookSecret: readiness.webhookSecret,
      divisionCode: readiness.divisionCode,
    },
  });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}
