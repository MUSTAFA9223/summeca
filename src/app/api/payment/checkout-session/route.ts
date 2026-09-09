import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return noStoreJson({ error: 'Authentication required.' }, { status: 401 });
  }

  const orderId = request.nextUrl.searchParams.get('order_id')?.trim() ?? '';
  if (!UUID_PATTERN.test(orderId)) {
    return noStoreJson({ error: 'A valid order_id is required.' }, { status: 400 });
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, user_id, status, checkout_provider, checkout_session_status, checkout_session_data')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !order) {
    return noStoreJson({ error: 'Checkout session not found.' }, { status: 404 });
  }
  if (order.status !== 'pending_payment' || order.checkout_session_status !== 'ready') {
    return noStoreJson(
      { error: 'Checkout session is not ready.', state: order.checkout_session_status ?? order.status },
      { status: 409 }
    );
  }

  const data = order.checkout_session_data
    && typeof order.checkout_session_data === 'object'
    && !Array.isArray(order.checkout_session_data)
      ? order.checkout_session_data as Record<string, unknown>
      : {};

  return noStoreJson({
    orderId: order.id,
    provider: order.checkout_provider,
    session: data,
  });
}
