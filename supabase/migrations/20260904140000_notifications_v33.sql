-- SUMMECA V33 — Notification Center
-- Migration: 20260904140000_notifications_v33.sql

-- ============================================================
-- 1. Notifications Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'system',
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  action_url  TEXT,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);

-- ============================================================
-- 2. Email Notification Preferences Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_orders          BOOLEAN NOT NULL DEFAULT true,
  email_marketing       BOOLEAN NOT NULL DEFAULT false,
  email_product_updates BOOLEAN NOT NULL DEFAULT true,
  email_subscription    BOOLEAN NOT NULL DEFAULT true,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- ============================================================
-- 3. Enable RLS
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. Admin check function (safe — queries auth.users metadata)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_user()
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

-- ============================================================
-- 5. RLS Policies — notifications
-- ============================================================
DROP POLICY IF EXISTS "users_read_own_notifications" ON public.notifications;
CREATE POLICY "users_read_own_notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
CREATE POLICY "users_update_own_notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_delete_own_notifications" ON public.notifications;
CREATE POLICY "users_delete_own_notifications"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admins_insert_notifications" ON public.notifications;
CREATE POLICY "admins_insert_notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

-- ============================================================
-- 6. RLS Policies — notification_preferences
-- ============================================================
DROP POLICY IF EXISTS "users_manage_own_notification_preferences" ON public.notification_preferences;
CREATE POLICY "users_manage_own_notification_preferences"
  ON public.notification_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
