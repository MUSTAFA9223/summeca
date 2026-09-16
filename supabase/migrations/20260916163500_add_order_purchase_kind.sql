-- Distinguish real customer purchases from internal/test checkout activity.
-- Existing rows remain real by default; known historical test rows are classified
-- separately as a one-time production data correction after this migration.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS purchase_kind TEXT NOT NULL DEFAULT 'real';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_purchase_kind_check'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_purchase_kind_check
      CHECK (purchase_kind IN ('real', 'test'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_orders_purchase_kind
  ON public.orders(purchase_kind);

CREATE INDEX IF NOT EXISTS idx_orders_purchase_kind_status_created_at
  ON public.orders(purchase_kind, status, created_at DESC);

COMMENT ON COLUMN public.orders.purchase_kind IS
  'Classifies checkout activity for analytics: real customer purchase or internal/test purchase.';
