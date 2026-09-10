import { NextResponse } from 'next/server';

export async function GET() {
  const available = Boolean(
    process.env.NOWPAYMENTS_API_KEY?.trim()
      && process.env.NOWPAYMENTS_IPN_SECRET?.trim()
      && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );

  const response = NextResponse.json({
    available,
    provider: 'nowpayments',
    methods: available
      ? [
          'crypto_usdt_trc20',
          'crypto_usdt_erc20',
          'crypto_usdc',
          'crypto_usdc_polygon',
          'crypto_trx',
          'crypto_bnb',
        ]
      : [],
  });
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}
