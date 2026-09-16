-- Trigger functions do not need to be exposed as RPC endpoints.
-- Keep the SECURITY DEFINER behavior for the trigger itself, but prevent
-- public/anon/authenticated callers from invoking it directly.

REVOKE ALL ON FUNCTION public.classify_test_purchase() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.classify_test_purchase() FROM anon;
REVOKE ALL ON FUNCTION public.classify_test_purchase() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.classify_test_purchase() TO service_role;
