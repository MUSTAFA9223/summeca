import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const ALLOWED_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'paused',
  'cancelled',
  'expired',
]);

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function parseNonNegativeInteger(value: string | null, fallback: number) {
  if (value === null || value.trim() === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const session = await createClient();
    const admin = await requireAdmin(session);
    if (!admin) {
      return noStoreJson({ error: 'Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseNonNegativeInteger(searchParams.get('page'), 0);
    const requestedPageSize = parseNonNegativeInteger(
      searchParams.get('pageSize'),
      DEFAULT_PAGE_SIZE
    );
    const pageSize = Math.min(Math.max(requestedPageSize, 1), MAX_PAGE_SIZE);
    const status = (searchParams.get('status') || '').trim();

    if (status && !ALLOWED_STATUSES.has(status)) {
      return noStoreJson({ error: 'Invalid subscription status filter.' }, { status: 400 });
    }

    // Admin identity is verified above with the user's authenticated session.
    // The actual cross-customer read is intentionally server-only so browser RLS
    // cannot block the admin screen and privileged customer data is never exposed
    // through a public client query.
    const service = createServiceClient();
    let query = service
      .from('subscriptions')
      .select(
        'id, status, payment_provider, current_period_start, current_period_end, created_at, user_profiles(email, full_name), products(name), product_plans(name, billing_period, price, currency)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (status) query = query.eq('status', status);

    const { data, count, error } = await query;
    if (error) {
      console.error('[admin/subscriptions] GET query failed:', error.message);
      return noStoreJson({ error: 'Could not load subscription access records.' }, { status: 500 });
    }

    return noStoreJson({
      subscriptions: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('[admin/subscriptions] GET failed:', error);
    return noStoreJson({ error: 'Could not load subscription access records.' }, { status: 500 });
  }
}
