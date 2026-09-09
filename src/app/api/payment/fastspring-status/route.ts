import { NextResponse } from 'next/server';
import { getFastSpringReadiness } from '@/lib/payment/providers/fastspring';

export async function GET() {
  const readiness = getFastSpringReadiness();
  const serviceRoleReady = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const liveAvailable = readiness.configured && readiness.live && serviceRoleReady;

  // The public storefront must never advertise a sandbox/test processor as an
  // available way to buy production access. Test configuration remains visible
  // through the non-sensitive flags below for diagnostics, but available=true
  // is reserved for a fully configured LIVE FastSpring environment.
  const response = NextResponse.json({
    available: liveAvailable,
    live: readiness.live,
    configured: readiness.configured && serviceRoleReady,
    testMode: readiness.configured && serviceRoleReady && !readiness.live,
    provider: 'fastspring',
    methods: liveAvailable
      ? ['card', 'paypal', 'apple_pay', 'google_pay']
      : [],
  });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
