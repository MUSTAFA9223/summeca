-- ============================================================
-- SUMMECA V34 — Customer Support Center
-- Migration: 20260904150000_support_center_v34.sql
-- ============================================================

-- ─── 1. Tables ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject       TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'general',
  priority      TEXT NOT NULL DEFAULT 'normal',
  status        TEXT NOT NULL DEFAULT 'open',
  order_id      UUID NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type  TEXT NOT NULL DEFAULT 'user',
  message      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. Indexes ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id   ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status    ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created   ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created   ON public.ticket_messages(created_at ASC);

-- ─── 3. Auto-update updated_at ────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_support_ticket_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_support_ticket_timestamp();

-- ─── 4. Admin check function ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_support_admin()
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

ALTER TABLE public.support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages  ENABLE ROW LEVEL SECURITY;

-- ─── 6. RLS Policies: support_tickets ─────────────────────────

DROP POLICY IF EXISTS "users_view_own_tickets"   ON public.support_tickets;
CREATE POLICY "users_view_own_tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_support_admin());

DROP POLICY IF EXISTS "users_create_own_tickets" ON public.support_tickets;
CREATE POLICY "users_create_own_tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_tickets" ON public.support_tickets;
CREATE POLICY "users_update_own_tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_support_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_support_admin());

DROP POLICY IF EXISTS "admins_delete_tickets"    ON public.support_tickets;
CREATE POLICY "admins_delete_tickets"
  ON public.support_tickets FOR DELETE
  TO authenticated
  USING (public.is_support_admin());

-- ─── 7. RLS Policies: ticket_messages ─────────────────────────

DROP POLICY IF EXISTS "users_view_ticket_messages"   ON public.ticket_messages;
CREATE POLICY "users_view_ticket_messages"
  ON public.ticket_messages FOR SELECT
  TO authenticated
  USING (
    public.is_support_admin()
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_send_ticket_messages"   ON public.ticket_messages;
CREATE POLICY "users_send_ticket_messages"
  ON public.ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      public.is_support_admin()
      OR EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = ticket_id AND t.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "admins_update_messages"       ON public.ticket_messages;
CREATE POLICY "admins_update_messages"
  ON public.ticket_messages FOR UPDATE
  TO authenticated
  USING (public.is_support_admin())
  WITH CHECK (public.is_support_admin());

DROP POLICY IF EXISTS "admins_delete_messages"       ON public.ticket_messages;
CREATE POLICY "admins_delete_messages"
  ON public.ticket_messages FOR DELETE
  TO authenticated
  USING (public.is_support_admin());
