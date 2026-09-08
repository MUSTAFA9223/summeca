import { NextResponse } from 'next/server';
import { isCryptoConfigured } from '@/lib/payment/providers/crypto';

export async function GET() {
  const response = NextResponse.json({
    available: isCryptoConfigured(),
    provider: 'nowpayments',
  });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
