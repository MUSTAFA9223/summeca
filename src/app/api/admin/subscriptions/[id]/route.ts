/**
 * PATCH /api/admin/subscriptions/[id]
 *
 * Subscription billing actions are intentionally disabled until SUMMECA has a
 * provider-backed cancellation/pause/reactivation workflow. A local database
 * status change must never be presented as if external recurring billing was
 * changed successfully.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

type AdminAction = 'pause' | 'cancel' | 'restore';

const ADMIN_ACTIONS: AdminAction[] = ['pause', 'cancel', 'restore'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: subscriptionId } = await params;
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);

  if (!admin) {
    return NextResponse.json(
      { error: 'Admin access required.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (!body.action || !ADMIN_ACTIONS.includes(body.action as AdminAction)) {
    return NextResponse.json(
      { error: `action must be one of: ${ADMIN_ACTIONS.join(', ')}` },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const { data: subscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('id, status, payment_provider')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (fetchError) {
    console.error('[admin/subscriptions] Failed to read subscription:', fetchError.message);
    return NextResponse.json(
      { error: 'Failed to read subscription.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (!subscription) {
    return NextResponse.json(
      { error: 'Subscription not found.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      error:
        'External subscription billing changes are not automated yet. No provider billing or local subscription state was changed.',
      code: 'PROVIDER_BILLING_ACTION_REQUIRED',
      subscriptionId,
      currentStatus: subscription.status,
      provider: subscription.payment_provider ?? null,
    },
    { status: 409, headers: { 'Cache-Control': 'no-store' } }
  );
}
