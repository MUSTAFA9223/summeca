-- SUMMECA final ACL hardening
-- Removes anonymous/direct RPC execution from SECURITY DEFINER helpers.
-- Authenticated execution is retained only for admin predicates used by RLS.

BEGIN;

-- Admin predicates are used by RLS for signed-in users, but anonymous callers
-- must never be able to invoke them directly.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_marketing_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_security_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_support_admin() FROM anon;

-- Trigger-only function: no client role needs direct RPC execution.
REVOKE ALL ON FUNCTION public.protect_user_privileged_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_user_privileged_fields() FROM anon;
REVOKE ALL ON FUNCTION public.protect_user_privileged_fields() FROM authenticated;
REVOKE ALL ON FUNCTION public.protect_user_privileged_fields() FROM service_role;

COMMIT;
