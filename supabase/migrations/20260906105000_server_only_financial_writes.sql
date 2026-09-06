-- SUMMECA: financial and entitlement creation/mutation must go through trusted server routes.
BEGIN;

DROP POLICY IF EXISTS "users_create_pending_orders" ON public.orders;
DROP POLICY IF EXISTS "users_insert_own_refunds" ON public.refunds;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.user_profiles;

COMMIT;
