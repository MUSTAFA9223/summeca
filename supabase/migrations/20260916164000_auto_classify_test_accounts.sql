-- Keep future checkout tests from polluting customer conversion metrics.
-- Accounts explicitly marked as test accounts automatically create test orders.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.classify_test_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = NEW.user_id
      AND is_test_account = true
  ) THEN
    NEW.purchase_kind := 'test';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS classify_test_purchase_on_orders ON public.orders;
CREATE TRIGGER classify_test_purchase_on_orders
  BEFORE INSERT OR UPDATE OF user_id ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.classify_test_purchase();

COMMENT ON COLUMN public.user_profiles.is_test_account IS
  'When true, orders from this account are classified as test purchases for analytics.';
