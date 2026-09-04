-- ============================================================
-- SUMMECA V36 — Account Security Hub
-- Migration: 20260904170000_account_security_v36.sql
-- ============================================================

-- ─── 1. Tables ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_security_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  device_info JSONB NOT NULL DEFAULT '{}',
  ip_hash     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_settings (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  login_alerts  BOOLEAN NOT NULL DEFAULT true,
  email_alerts  BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. Indexes ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_security_logs_user_id   ON public.user_security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event     ON public.user_security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created   ON public.user_security_logs(created_at DESC);

-- ─── 3. Auto-update updated_at ────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_security_settings_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_security_settings_updated_at ON public.security_settings;
CREATE TRIGGER trg_security_settings_updated_at
  BEFORE UPDATE ON public.security_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_security_settings_timestamp();

-- ─── 4. Admin check function ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_security_admin()
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

-- ─── 5. Enable RLS ────────────────────────────────────────────

ALTER TABLE public.user_security_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_settings   ENABLE ROW LEVEL SECURITY;

-- ─── 6. RLS Policies: user_security_logs ──────────────────────

DROP POLICY IF EXISTS "users_view_own_security_logs" ON public.user_security_logs;
CREATE POLICY "users_view_own_security_logs"
  ON public.user_security_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_security_admin());

DROP POLICY IF EXISTS "users_insert_own_security_logs" ON public.user_security_logs;
CREATE POLICY "users_insert_own_security_logs"
  ON public.user_security_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_security_admin());

DROP POLICY IF EXISTS "admins_delete_security_logs" ON public.user_security_logs;
CREATE POLICY "admins_delete_security_logs"
  ON public.user_security_logs FOR DELETE
  TO authenticated
  USING (public.is_security_admin());

-- ─── 7. RLS Policies: security_settings ───────────────────────

DROP POLICY IF EXISTS "users_view_own_security_settings" ON public.security_settings;
CREATE POLICY "users_view_own_security_settings"
  ON public.security_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_security_admin());

DROP POLICY IF EXISTS "users_insert_own_security_settings" ON public.security_settings;
CREATE POLICY "users_insert_own_security_settings"
  ON public.security_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_security_settings" ON public.security_settings;
CREATE POLICY "users_update_own_security_settings"
  ON public.security_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
