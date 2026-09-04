-- Migration: SUMMECA Version 25 — Advanced Subscription Manager
-- Timestamp: 20260903210000
-- Changes:
--   1. Add 'past_due' to subscription_status enum
--   2. Add payment_provider, cancel_reason, downgrade_plan_id, downgrade_at columns to subscriptions
--   3. Create subscription_audit_logs table for admin action tracking
--   4. RLS policies for new table and columns
--   5. Indexes for performance

-- ── 1. Add 'past_due' to subscription_status enum (idempotent) ───────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'past_due'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subscription_status')
  ) THEN
    ALTER TYPE public.subscription_status ADD VALUE 'past_due';
  END IF;
END $$;

-- ── 2. Extend subscriptions table ────────────────────────────────────────────
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_provider    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cancel_reason       TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS downgrade_plan_id   UUID REFERENCES public.product_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS downgrade_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paused_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS past_due_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at       TIMESTAMPTZ;

-- ── 3. Create subscription_audit_logs table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_audit_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id  UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  admin_id         UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  action           TEXT NOT NULL DEFAULT '',   -- 'pause', 'cancel', 'restore', 'plan_change', 'status_change'
  previous_status  TEXT DEFAULT '',
  new_status       TEXT DEFAULT '',
  note             TEXT DEFAULT '',
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sub_audit_subscription_id ON public.subscription_audit_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_audit_admin_id ON public.subscription_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_sub_audit_created_at ON public.subscription_audit_logs(created_at DESC);

-- ── 4. Enable RLS on audit logs ───────────────────────────────────────────────
ALTER TABLE public.subscription_audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can read audit logs for their own subscriptions
DROP POLICY IF EXISTS "users_read_own_sub_audit" ON public.subscription_audit_logs;
CREATE POLICY "users_read_own_sub_audit"
  ON public.subscription_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM public.subscriptions WHERE user_id = auth.uid()
    )
  );

-- Admins have full access (via is_admin() function from admin_role migration)
DROP POLICY IF EXISTS "admin_full_sub_audit" ON public.subscription_audit_logs;
CREATE POLICY "admin_full_sub_audit"
  ON public.subscription_audit_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ── 5. Additional indexes on subscriptions for performance ────────────────────
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON public.subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
