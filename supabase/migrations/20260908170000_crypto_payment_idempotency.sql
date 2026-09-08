-- SUMMECA: crypto/payment fulfillment idempotency hardening.
-- Additive only: no rows are deleted or rewritten.
BEGIN;

-- Duplicate delivery of the same provider state is expected for webhooks.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_dedupe
  ON public.payment_events(order_id, provider, event_type, provider_payment_ref)
  WHERE provider_payment_ref <> '';

-- One SUMMECA entitlement/subscription is created per paid order. These indexes
-- make retries and concurrent provider callbacks safe at the database boundary.
CREATE UNIQUE INDEX IF NOT EXISTS idx_downloads_order_entitlement_unique
  ON public.downloads(order_id)
  WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_order_entitlement_unique
  ON public.subscriptions(order_id)
  WHERE order_id IS NOT NULL;

COMMIT;
