CREATE OR REPLACE FUNCTION public.claim_referral_code(code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  normalized_code text := upper(trim(coalesce(code,'')));
  referrer uuid;
BEGIN
  IF current_user_id IS NULL OR normalized_code = '' THEN RETURN false; END IF;

  SELECT r.referrer_user_id INTO referrer
  FROM public.referrals r
  WHERE r.referral_code = normalized_code AND r.referred_user_id IS NULL
  LIMIT 1;

  IF referrer IS NULL OR referrer = current_user_id THEN RETURN false; END IF;

  INSERT INTO public.referrals(referrer_user_id, referred_user_id, referral_code, status)
  VALUES (referrer, current_user_id, normalized_code, 'registered')
  ON CONFLICT DO NOTHING;

  RETURN EXISTS (
    SELECT 1 FROM public.referrals r
    WHERE r.referred_user_id = current_user_id AND r.referrer_user_id = referrer
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_referral_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_referral_code(text) TO authenticated;
