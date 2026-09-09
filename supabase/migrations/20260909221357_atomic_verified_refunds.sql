-- Reconcile a provider-verified full refund in one short transaction.
-- The application verifies the provider signature, order amount and currency
-- before invoking this service-role-only function.

CREATE OR REPLACE FUNCTION public.finalize_verified_refund(
  p_order_id uuid,
  p_provider text,
  p_provider_ref text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_now timestamptz := now();
  v_already_refunded boolean := false;
  v_refund_id uuid;
BEGIN
  IF p_order_id IS NULL
     OR NULLIF(btrim(p_provider), '') IS NULL
     OR NULLIF(btrim(p_provider_ref), '') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Missing verified refund identifiers.');
  END IF;

  SELECT *
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Order not found.');
  END IF;

  IF v_order.status = 'refunded' THEN
    v_already_refunded := true;
  ELSIF v_order.status = 'completed' THEN
    UPDATE public.orders
       SET status = 'refunded',
           updated_at = v_now
     WHERE id = p_order_id;
  ELSE
    RETURN jsonb_build_object(
      'ok', false,
      'error', format('Cannot refund an order with status: %s', v_order.status)
    );
  END IF;

  INSERT INTO public.payment_events (
    order_id,
    provider,
    event_type,
    provider_payment_ref,
    metadata
  )
  VALUES (
    p_order_id,
    btrim(p_provider),
    'refunded',
    btrim(p_provider_ref),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT DO NOTHING;

  SELECT id
    INTO v_refund_id
    FROM public.refunds
   WHERE order_id = p_order_id
     AND status NOT IN ('completed', 'rejected', 'failed')
   ORDER BY requested_at DESC NULLS LAST, created_at DESC
   LIMIT 1
   FOR UPDATE;

  IF v_refund_id IS NOT NULL THEN
    UPDATE public.refunds
       SET status = 'completed',
           provider_refund_id = btrim(p_provider_ref),
           completed_at = COALESCE(completed_at, v_now),
           updated_at = v_now
     WHERE id = v_refund_id;
  END IF;

  UPDATE public.downloads
     SET status = 'revoked',
         updated_at = v_now
   WHERE order_id = p_order_id
     AND status <> 'revoked';

  UPDATE public.subscriptions
     SET status = 'cancelled',
         cancelled_at = COALESCE(cancelled_at, v_now),
         current_period_end = LEAST(COALESCE(current_period_end, v_now), v_now),
         cancel_reason = COALESCE(cancel_reason, 'Order refunded'),
         updated_at = v_now
   WHERE order_id = p_order_id
     AND status <> 'cancelled';

  RETURN jsonb_build_object(
    'ok', true,
    'already_refunded', v_already_refunded,
    'refund_id', v_refund_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_verified_refund(uuid, text, text, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_verified_refund(uuid, text, text, jsonb)
  TO service_role;
