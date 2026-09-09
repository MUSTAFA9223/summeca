import { NextResponse } from 'next/server';
import { getFastSpringReadiness } from '@/lib/payment/providers/fastspring';

export async function GET() {
  const readiness = getFastSpringReadiness();
  const serviceRoleReady = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  const response = NextResponse.json({
    available: readiness.configured && serviceRoleReady,
    live: readiness.live,
    provider: 'fastspring',
    methods: readiness.configured && serviceRoleReady
      ? ['card', 'paypal', 'apple_pay', 'google_pay']
      : [],
  });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
