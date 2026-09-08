-- Restrict direct RPC execution of referral SECURITY DEFINER functions.
-- Trigger functions must not be callable from PostgREST by public/anon/authenticated roles.
-- User-facing referral RPCs remain authenticated-only.

REVOKE EXECUTE ON FUNCTION public.capture_referral_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_referral_reward() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_referral_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_referral_code(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.claim_referral_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral_code(text) TO authenticated;
