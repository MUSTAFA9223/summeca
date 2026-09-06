-- SUMMECA security hardening — Phase 1
-- Removes client-controlled privilege / entitlement mutations and makes
-- user_profiles.is_admin the authoritative admin flag.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Harden the admin helper
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT up.is_admin FROM public.user_profiles AS up WHERE up.id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Prevent ordinary users from promoting themselves by updating their own profile.
CREATE OR REPLACE FUNCTION public.protect_user_admin_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF COALESCE(auth.role(), '') <> 'service_role' AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only an administrator may change is_admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_admin_flag ON public.user_profiles;
CREATE TRIGGER protect_user_admin_flag
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_admin_flag();

-- -----------------------------------------------------------------------------
-- 2. user_profiles — users may read/update only their own non-privileged profile
-- -----------------------------------------------------------------------------
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
-- 3. orders — customers can read their orders and create pending orders only.
--    They cannot change payment/completion state themselves.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_manage_own_orders" ON public.orders;
DROP POLICY IF EXISTS "users_read_own_orders" ON public.orders;
DROP POLICY IF EXISTS "users_create_pending_orders" ON public.orders;

CREATE POLICY "users_read_own_orders"
ON public.orders
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "users_create_pending_orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND status::text IN ('pending', 'pending_payment')
);

-- -----------------------------------------------------------------------------
-- 4. subscriptions — entitlement changes are server/admin only.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_manage_own_subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "users_read_own_subscriptions" ON public.subscriptions;

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

CREATE POLICY "users_read_own_downloads"
ON public.downloads
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 6. payment_events — users can read events for their orders, but only trusted
--    server code (service role) or admin policies may write them.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "service_insert_payment_events" ON public.payment_events;
DROP POLICY IF EXISTS "users_insert_own_payment_events" ON public.payment_events;
DROP POLICY IF EXISTS "users_update_own_payment_events" ON public.payment_events;
DROP POLICY IF EXISTS "users_delete_own_payment_events" ON public.payment_events;

-- Keep/recreate read policy idempotently.
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
