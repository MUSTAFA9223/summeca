-- Migration: Admin Role for SUMMECA
-- Timestamp: 20260903150000
-- Adds is_admin flag to user_profiles and admin-only RLS policies

-- ── 1. Add is_admin column to user_profiles ───────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- ── 2. Helper function: check if current user is admin ────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ── 3. Admin RLS policies for products (admins can write) ─────────────────────
DROP POLICY IF EXISTS "admin_all_products" ON public.products;
CREATE POLICY "admin_all_products"
  ON public.products
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 4. Admin RLS policies for product_plans ───────────────────────────────────
DROP POLICY IF EXISTS "admin_all_product_plans" ON public.product_plans;
CREATE POLICY "admin_all_product_plans"
  ON public.product_plans
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 5. Admin RLS policies for orders (read all) ───────────────────────────────
DROP POLICY IF EXISTS "admin_all_orders" ON public.orders;
CREATE POLICY "admin_all_orders"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 6. Admin RLS policies for subscriptions ───────────────────────────────────
DROP POLICY IF EXISTS "admin_all_subscriptions" ON public.subscriptions;
CREATE POLICY "admin_all_subscriptions"
  ON public.subscriptions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 7. Admin RLS policies for downloads ───────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_downloads" ON public.downloads;
CREATE POLICY "admin_all_downloads"
  ON public.downloads
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 8. Admin RLS policies for user_profiles (read all) ────────────────────────
DROP POLICY IF EXISTS "admin_read_all_user_profiles" ON public.user_profiles;
CREATE POLICY "admin_read_all_user_profiles"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ── 9. Admin RLS policies for payment_events (read all) ───────────────────────
DROP POLICY IF EXISTS "admin_all_payment_events" ON public.payment_events;
CREATE POLICY "admin_all_payment_events"
  ON public.payment_events
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 10. Admin RLS policies for coupons ────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_coupons" ON public.coupons;
CREATE POLICY "admin_all_coupons"
  ON public.coupons
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
