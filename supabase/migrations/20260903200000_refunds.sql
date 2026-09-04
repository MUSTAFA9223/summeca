-- Migration: Refund Workflow — SUMMECA Version 24
-- Timestamp: 20260903200000 (higher than 20260903150000_admin_role.sql)
-- Creates: refunds table, refund_status enum, RLS policies, admin policies

-- ── 1. Refund Status ENUM ─────────────────────────────────────────────────────
DROP TYPE IF EXISTS public.refund_status CASCADE;
CREATE TYPE public.refund_status AS ENUM (
  'pending',
  'under_review',
  'approved',
  'processing',
  'completed',
  'rejected',
  'failed'
);

-- ── 2. Refund Reason ENUM ─────────────────────────────────────────────────────
DROP TYPE IF EXISTS public.refund_reason CASCADE;
CREATE TYPE public.refund_reason AS ENUM (
  'product_issue',
  'not_satisfied',
  'duplicate_purchase',
  'other'
);

-- ── 3. Refunds Table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.refunds (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  user_id             UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  amount              NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'USD',
  reason              public.refund_reason NOT NULL DEFAULT 'other'::public.refund_reason,
  customer_note       TEXT DEFAULT '',
  admin_note          TEXT DEFAULT '',
  status              public.refund_status NOT NULL DEFAULT 'pending'::public.refund_status,
  provider_refund_id  TEXT DEFAULT '',
  requested_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  reviewed_at         TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 4. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON public.refunds(user_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_requested_at ON public.refunds(requested_at DESC);

-- Prevent duplicate active refund requests per order
-- A user can only have one non-rejected/failed refund per order
CREATE UNIQUE INDEX IF NOT EXISTS idx_refunds_order_active
  ON public.refunds(order_id)
  WHERE status NOT IN ('rejected', 'failed');

-- ── 5. Updated_at trigger ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS handle_refunds_updated_at ON public.refunds;
CREATE TRIGGER handle_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ── 6. Enable RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- ── 7. RLS: Users can read their own refunds ──────────────────────────────────
DROP POLICY IF EXISTS "users_read_own_refunds" ON public.refunds;
CREATE POLICY "users_read_own_refunds"
  ON public.refunds
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ── 8. RLS: Users can insert refunds for their own orders ─────────────────────
DROP POLICY IF EXISTS "users_insert_own_refunds" ON public.refunds;
CREATE POLICY "users_insert_own_refunds"
  ON public.refunds
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── 9. RLS: Users cannot update refunds (admin only) ─────────────────────────
-- No user update policy — updates only via admin or service role

-- ── 10. Admin: Full access to refunds ────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_refunds" ON public.refunds;
CREATE POLICY "admin_all_refunds"
  ON public.refunds
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
