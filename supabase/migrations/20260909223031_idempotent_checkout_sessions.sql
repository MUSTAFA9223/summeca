ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS checkout_provider text,
  ADD COLUMN IF NOT EXISTS checkout_session_status text,
  ADD COLUMN IF NOT EXISTS checkout_session_data jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_checkout_session_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_checkout_session_status_check
  CHECK (
    checkout_session_status IS NULL
    OR checkout_session_status IN ('created', 'processing', 'ready', 'failed')
  ) NOT VALID;
ALTER TABLE public.orders
  VALIDATE CONSTRAINT orders_checkout_session_status_check;

CREATE UNIQUE INDEX IF NOT EXISTS orders_user_checkout_idempotency_uidx
  ON public.orders (user_id, checkout_idempotency_key)
  WHERE checkout_idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_or_reuse_priced_order(
  p_user uuid,
  p_plan uuid,
  p_coupon uuid,
  p_expected numeric,
  p_provider text,
  p_idempotency_key uuid
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  o public.orders;
BEGIN
  IF p_user IS NULL OR p_plan IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Missing checkout identity';
  END IF;
  IF p_provider NOT IN ('payoneer', 'fastspring', 'crypto') THEN
    RAISE EXCEPTION 'Unsupported checkout provider';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_user::text || ':' || p_idempotency_key::text, 73)
  );

  SELECT *
    INTO o
    FROM public.orders
   WHERE user_id = p_user
     AND checkout_idempotency_key = p_idempotency_key
   FOR UPDATE;

  IF o.id IS NOT NULL THEN
    IF o.plan_id IS DISTINCT FROM p_plan
       OR o.coupon_id IS DISTINCT FROM p_coupon
       OR o.checkout_provider IS DISTINCT FROM p_provider THEN
      RAISE EXCEPTION 'Idempotency key was already used for another checkout';
    END IF;
    RETURN o;
  END IF;

  o := public.create_priced_order(p_user, p_plan, p_coupon, p_expected);

  UPDATE public.orders
     SET checkout_idempotency_key = p_idempotency_key,
         checkout_provider = p_provider,
         checkout_session_status = 'created',
         checkout_session_data = '{}'::jsonb,
         metadata = COALESCE(metadata, '{}'::jsonb)
           || jsonb_build_object('provider', p_provider),
         updated_at = now()
   WHERE id = o.id
   RETURNING * INTO o;

  RETURN o;
END;
$$;

REVOKE ALL ON FUNCTION public.create_or_reuse_priced_order(
  uuid, uuid, uuid, numeric, text, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_or_reuse_priced_order(
  uuid, uuid, uuid, numeric, text, uuid
) TO service_role;
