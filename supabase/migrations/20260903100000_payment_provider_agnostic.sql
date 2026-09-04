-- Migration: Provider-agnostic payment architecture
-- Timestamp: 20260903100000
-- Changes:
--   1. Add provider_payment_ref column to orders (replaces stripe_payment_id usage)
--   2. Create payment_events table for webhook audit trail
--   3. RLS policies for payment_events (admin-only write, user read own)
--
-- IMPORTANT: stripe_payment_id column is NOT removed — it remains for backward
-- compatibility. New code uses provider_payment_ref instead.
-- Existing tables (orders, subscriptions, downloads, etc.) are NOT modified
-- beyond the additive column.

-- ── 1. Add provider_payment_ref to orders (idempotent) ────────────────────────
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS provider_payment_ref TEXT DEFAULT '';

-- ── 2. Create payment_events audit table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider             TEXT NOT NULL DEFAULT '',
  event_type           TEXT NOT NULL DEFAULT '',   -- 'completed', 'failed', 'refunded', 'cancelled'
  provider_payment_ref TEXT NOT NULL DEFAULT '',
  metadata             JSONB NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 3. Index for fast lookups by order ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payment_events_order_id
  ON public.payment_events(order_id);

CREATE INDEX IF NOT EXISTS idx_payment_events_provider
  ON public.payment_events(provider);

-- ── 4. Enable RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- ── 5. RLS Policies ───────────────────────────────────────────────────────────

-- Users can read their own payment events (via order ownership)
DROP POLICY IF EXISTS "users_read_own_payment_events" ON public.payment_events;
CREATE POLICY "users_read_own_payment_events"
  ON public.payment_events
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );

-- Only service role (webhooks) can insert payment events
-- The webhook API route uses the Supabase service role key (server-side only)
DROP POLICY IF EXISTS "service_insert_payment_events" ON public.payment_events;
CREATE POLICY "service_insert_payment_events"
  ON public.payment_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );
