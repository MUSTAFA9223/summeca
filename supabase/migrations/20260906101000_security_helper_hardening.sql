-- SUMMECA security helper hardening
-- Replaces legacy metadata-based admin helpers with the authoritative
-- public.user_profiles.is_admin flag and locks down SECURITY DEFINER functions.

BEGIN;

-- Legacy helper names are kept for compatibility with existing RLS policies,
-- but they now delegate to the hardened DB-backed public.is_admin().
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_marketing_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_security_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_support_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_admin();
$$;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_marketing_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_security_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_support_admin() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_marketing_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_security_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_support_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_marketing_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_security_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_support_admin() TO service_role;

-- Trigger/timestamp helpers should not have mutable search paths.
ALTER FUNCTION public.handle_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_ai_usage_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_support_ticket_timestamp() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_security_settings_timestamp() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

-- handle_new_user is a trigger function and does not need direct RPC execution.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

COMMIT;
