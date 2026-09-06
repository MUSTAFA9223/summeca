-- SUMMECA security hardening — Phase 1
-- Removes client-controlled privilege / entitlement mutations and makes
-- user_profiles.is_admin the authoritative admin flag.

-- The application uses pending_payment for orders waiting for provider confirmation.
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'pending_payment';

-- New server-side AI generation type used by the admin insights endpoint.
ALTER TYPE public.ai_generation_type ADD VALUE IF NOT EXISTS 'customer_insights';

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Harden the admin helper
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT up.is_admin FROM public.user_profiles AS up WHERE up.id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Prevent ordinary users from modifying privileged/system-managed profile fields.
CREATE OR REPLACE FUNCTION public.protect_user_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_is_admin BOOLEAN := public.is_admin();
  caller_is_service BOOLEAN := COALESCE(auth.role(), '') = 'service_role';
BEGIN
  IF caller_is_service THEN
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin AND NOT caller_is_admin THEN
    RAISE EXCEPTION 'Only an administrator may change is_admin';
  END IF;

  IF NEW.plan_tier IS DISTINCT FROM OLD.plan_tier AND NOT caller_is_admin THEN
    RAISE EXCEPTION 'Only an administrator may change plan_tier';
  END IF;

  IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id AND NOT caller_is_admin THEN
    RAISE EXCEPTION 'Only trusted server code may change payment customer references';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email AND NOT caller_is_admin THEN
    RAISE EXCEPTION 'Profile email cannot be changed directly';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_admin_flag ON public.user_profiles;
DROP TRIGGER IF EXISTS protect_user_privileged_fields ON public.user_profiles;
CREATE TRIGGER protect_user_privileged_fields
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_privileged_fields();

-- -----------------------------------------------------------------------------
-- 1b. Harden AI usage accounting
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_user_id UUID, p_tokens INTEGER DEFAULT 0)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_period_start DATE := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end   DATE := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
  v_limit        INTEGER := 50;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = p_user_id AND is_admin = true
  ) THEN
    v_limit := 9999;
  END IF;

  INSERT INTO public.ai_usage (
    user_id, period_start, period_end, requests_count, tokens_used, monthly_limit
  )
  VALUES (
    p_user_id,
    v_period_start,
    v_period_end,
    1,
    GREATEST(COALESCE(p_tokens, 0), 0),
    v_limit
  )
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET
    requests_count = public.ai_usage.requests_count + 1,
    tokens_used     = public.ai_usage.tokens_used + GREATEST(COALESCE(p_tokens, 0), 0),
    monthly_limit   = v_limit,
    updated_at      = CURRENT_TIMESTAMP;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_ai_usage(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_ai_usage(UUID, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.increment_ai_usage(UUID, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(UUID, INTEGER) TO service_role;

-- -----------------------------------------------------------------------------
-- 2. user_profiles — no public exposure of emails/system fields.
--    The auth.users trigger creates profiles. Browser clients cannot INSERT or
--    DELETE profile rows and therefore cannot bootstrap a privileged profile.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile." ON public.user_profiles;
DROP POLICY IF EXISTS "users_insert_own_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_delete_own_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_read_own_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_update_user_profiles" ON public.user_profiles;

CREATE POLICY "users_read_own_user_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "users_update_own_user_profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "admin_update_user_profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. orders — customers can only read their own orders.
--    All order creation/status changes go through trusted server routes so the
--    browser cannot choose price, discount, provider metadata, or payment state.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_manage_own_orders" ON public.orders;
DROP POLICY IF EXISTS "users_read_own_orders" ON public.orders;
DROP POLICY IF EXISTS "users_create_pending_orders" ON public.orders;
DROP POLICY IF EXISTS "users_insert_own_orders" ON public.orders;
DROP POLICY IF EXISTS "users_update_own_orders" ON public.orders;
DROP POLICY IF EXISTS "users_delete_own_orders" ON public.orders;

CREATE POLICY "users_read_own_orders"
ON public.orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 4. subscriptions — entitlement changes are server/admin only.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_manage_own_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "users_read_own_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "users_insert_own_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "users_update_own_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "users_delete_own_subscriptions" ON public.subscriptions;

CREATE POLICY "users_read_own_subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 5. downloads — entitlement creation/update is server/admin only.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_manage_own_downloads" ON public.downloads;
DROP POLICY IF EXISTS "users_read_own_downloads" ON public.downloads;
DROP POLICY IF EXISTS "users_insert_own_downloads" ON public.downloads;
DROP POLICY IF EXISTS "users_update_own_downloads" ON public.downloads;
DROP POLICY IF EXISTS "users_delete_own_downloads" ON public.downloads;

CREATE POLICY "users_read_own_downloads"
ON public.downloads
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 6. payment_events — customers may only read events for their own orders.
--    service_role bypasses RLS, so no authenticated write policy is required.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "service_insert_payment_events" ON public.payment_events;
DROP POLICY IF EXISTS "users_insert_own_payment_events" ON public.payment_events;
DROP POLICY IF EXISTS "users_update_own_payment_events" ON public.payment_events;
DROP POLICY IF EXISTS "users_delete_own_payment_events" ON public.payment_events;
DROP POLICY IF EXISTS "users_read_own_payment_events" ON public.payment_events;

CREATE POLICY "users_read_own_payment_events"
ON public.payment_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders AS o
    WHERE o.id = payment_events.order_id
      AND o.user_id = auth.uid()
  )
);

-- Provider event idempotency at the database layer.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_dedupe
ON public.payment_events(order_id, provider, event_type, provider_payment_ref)
WHERE provider_payment_ref <> '';

COMMIT;
