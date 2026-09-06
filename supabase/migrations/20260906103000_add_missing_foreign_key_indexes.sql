-- SUMMECA database performance hardening
-- Add covering indexes for foreign keys reported by Supabase advisor.
-- These indexes do not change application behavior or RLS semantics.

CREATE INDEX IF NOT EXISTS idx_coupons_applies_to
  ON public.coupons(applies_to);

CREATE INDEX IF NOT EXISTS idx_downloads_order_id
  ON public.downloads(order_id);

CREATE INDEX IF NOT EXISTS idx_orders_coupon_id
  ON public.orders(coupon_id);

CREATE INDEX IF NOT EXISTS idx_orders_plan_id
  ON public.orders(plan_id);

CREATE INDEX IF NOT EXISTS idx_reviews_moderated_by
  ON public.reviews(moderated_by);

CREATE INDEX IF NOT EXISTS idx_reviews_order_id
  ON public.reviews(order_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_downgrade_plan_id
  ON public.subscriptions(downgrade_plan_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_order_id
  ON public.subscriptions(order_id);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_id
  ON public.ticket_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_usage_subscription_id
  ON public.usage(subscription_id);
