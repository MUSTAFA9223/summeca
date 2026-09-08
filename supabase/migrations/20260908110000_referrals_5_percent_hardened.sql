-- Hardened SUMMECA referral system with 5% first-purchase commission.

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','registered','purchased','rewarded')),
  reward_amount numeric(10,2) NOT NULL DEFAULT 0,
  reward_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS reward_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_select_own" ON public.referrals;
DROP POLICY IF EXISTS "referrals_insert_own" ON public.referrals;
DROP POLICY IF EXISTS "referrals_update_own" ON public.referrals;
DROP POLICY IF EXISTS "referrals_admin_all" ON public.referrals;
DROP POLICY IF EXISTS "referrals_service_update" ON public.referrals;
DROP POLICY IF EXISTS "referrals_insert_master_code" ON public.referrals;

CREATE POLICY "referrals_select_own" ON public.referrals
FOR SELECT TO authenticated
USING (auth.uid() = referrer_user_id);

CREATE POLICY "referrals_insert_master_code" ON public.referrals
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = referrer_user_id AND referred_user_id IS NULL AND status = 'pending' AND reward_amount = 0);

CREATE POLICY "referrals_admin_all" ON public.referrals
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_referrals_master_code ON public.referrals(referral_code) WHERE referred_user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_referrals_referred_user ON public.referrals(referred_user_id) WHERE referred_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_referrals_reward_order ON public.referrals(reward_order_id) WHERE reward_order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_referral_code(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  code text;
BEGIN
  LOOP
    code := 'SUMM' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.referrals r
      WHERE r.referral_code = code AND r.referred_user_id IS NULL
    );
  END LOOP;
  RETURN code;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_referral_code(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.generate_referral_code(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.capture_referral_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  code text;
  referrer uuid;
BEGIN
  code := nullif(upper(trim(coalesce(new.raw_user_meta_data->>'referral_code',''))), '');
  IF code IS NULL THEN RETURN new; END IF;

  SELECT r.referrer_user_id INTO referrer
  FROM public.referrals r
  WHERE r.referral_code = code AND r.referred_user_id IS NULL
  LIMIT 1;

  IF referrer IS NULL OR referrer = new.id THEN RETURN new; END IF;

  INSERT INTO public.referrals(referrer_user_id, referred_user_id, referral_code, status)
  VALUES (referrer, new.id, code, 'registered')
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_referral_signup ON auth.users;
CREATE TRIGGER trg_capture_referral_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.capture_referral_signup();

CREATE OR REPLACE FUNCTION public.apply_referral_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF new.status = 'completed' AND old.status IS DISTINCT FROM 'completed' THEN
    UPDATE public.referrals r
    SET status = 'rewarded',
        reward_amount = round((coalesce(new.amount,0)::numeric * 0.05), 2),
        reward_order_id = new.id,
        updated_at = now()
    WHERE r.id = (
      SELECT x.id
      FROM public.referrals x
      WHERE x.referred_user_id = new.user_id
        AND x.status IN ('registered','purchased')
        AND x.reward_order_id IS NULL
      ORDER BY x.created_at ASC
      LIMIT 1
    );
  ELSIF new.status = 'refunded' AND old.status = 'completed' THEN
    UPDATE public.referrals
    SET status = 'registered', reward_amount = 0, reward_order_id = NULL, updated_at = now()
    WHERE reward_order_id = new.id;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_referral_reward ON public.orders;
CREATE TRIGGER trg_apply_referral_reward
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.apply_referral_reward();
