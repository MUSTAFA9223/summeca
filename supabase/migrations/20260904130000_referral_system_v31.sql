-- SUMMECA V31: Referral System
-- Migration: 20260904130000_referral_system_v31.sql

-- Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'purchased', 'rewarded')),
  reward_amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (as referrer)
CREATE POLICY "referrals_select_own" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_user_id);

-- Users can insert their own referral codes
CREATE POLICY "referrals_insert_own" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_user_id);

-- Users can update their own referrals
CREATE POLICY "referrals_update_own" ON public.referrals
  FOR UPDATE USING (auth.uid() = referrer_user_id);

-- Admins can view all referrals
CREATE POLICY "referrals_admin_all" ON public.referrals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Service role can update referrals (for webhook processing)
CREATE POLICY "referrals_service_update" ON public.referrals
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_user_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code(user_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  code text;
  exists_check boolean;
BEGIN
  LOOP
    -- Generate code: SUMM + 8 random alphanumeric chars
    code := 'SUMM' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.referrals WHERE referral_code = code) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN code;
END;
$$;
