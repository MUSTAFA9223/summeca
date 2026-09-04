-- ============================================================
-- SUMMECA V35 — AI Marketing & Email Campaign Engine
-- Migration: 20260904160000_ai_campaigns_v35.sql
-- ============================================================

-- ─── 1. Tables ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  campaign_type   TEXT NOT NULL DEFAULT 'email',
  status          TEXT NOT NULL DEFAULT 'draft',
  subject         TEXT,
  content         TEXT,
  target_type     TEXT NOT NULL DEFAULT 'all',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_status    TEXT NOT NULL DEFAULT 'sent',
  opened_at       TIMESTAMPTZ NULL,
  clicked_at      TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. Indexes ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_admin_id  ON public.marketing_campaigns(admin_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status    ON public.marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created   ON public.marketing_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_campaign_id     ON public.campaign_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_user_id         ON public.campaign_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_created         ON public.campaign_logs(created_at DESC);

-- ─── 3. Admin check function ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_marketing_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND (
        raw_user_meta_data->>'role' = 'admin'
        OR raw_app_meta_data->>'role' = 'admin'
      )
  )
$$;

-- ─── 4. Enable RLS ────────────────────────────────────────────

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_logs ENABLE ROW LEVEL SECURITY;

-- ─── 5. RLS Policies: marketing_campaigns ─────────────────────

DROP POLICY IF EXISTS "admins_manage_marketing_campaigns" ON public.marketing_campaigns;
CREATE POLICY "admins_manage_marketing_campaigns"
  ON public.marketing_campaigns
  FOR ALL
  TO authenticated
  USING (public.is_marketing_admin())
  WITH CHECK (public.is_marketing_admin());

-- ─── 6. RLS Policies: campaign_logs ───────────────────────────

DROP POLICY IF EXISTS "admins_manage_campaign_logs" ON public.campaign_logs;
CREATE POLICY "admins_manage_campaign_logs"
  ON public.campaign_logs
  FOR ALL
  TO authenticated
  USING (public.is_marketing_admin())
  WITH CHECK (public.is_marketing_admin());
