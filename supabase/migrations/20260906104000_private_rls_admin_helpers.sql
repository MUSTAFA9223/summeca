-- SUMMECA: move SECURITY DEFINER admin predicates behind an unexposed private schema.
-- Public helper functions remain SECURITY INVOKER wrappers for existing RLS policies.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (
      SELECT up.is_admin
      FROM public.user_profiles AS up
      WHERE up.id = (SELECT auth.uid())
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO service_role;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_marketing_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_security_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_support_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.is_admin();
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_marketing_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_security_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_support_admin() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
REVOKE ALL ON FUNCTION public.is_admin_user() FROM anon;
REVOKE ALL ON FUNCTION public.is_marketing_admin() FROM anon;
REVOKE ALL ON FUNCTION public.is_security_admin() FROM anon;
REVOKE ALL ON FUNCTION public.is_support_admin() FROM anon;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_marketing_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_security_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_support_admin() TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_marketing_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_security_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_support_admin() TO service_role;

COMMIT;
