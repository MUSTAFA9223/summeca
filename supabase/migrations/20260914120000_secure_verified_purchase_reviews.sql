-- Secure customer reviews so only verified paid purchasers can submit them.
-- Reviews are held for moderation before public display.

DROP POLICY IF EXISTS "users_create_own_reviews" ON public.reviews;
CREATE POLICY "users_create_own_reviews"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND moderation_status = 'pending'
  AND is_featured = false
  AND moderated_at IS NULL
  AND moderated_by IS NULL
  AND is_verified = true
  AND order_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.orders AS o
    WHERE o.id = reviews.order_id
      AND o.user_id = auth.uid()
      AND o.product_id = reviews.product_id
      AND o.status = 'completed'
      AND o.amount > 0
  )
);

DROP POLICY IF EXISTS "users_update_own_reviews" ON public.reviews;
CREATE POLICY "users_update_own_reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND moderation_status = 'pending'
  AND is_featured = false
  AND moderated_at IS NULL
  AND moderated_by IS NULL
  AND is_verified = true
  AND order_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.orders AS o
    WHERE o.id = reviews.order_id
      AND o.user_id = auth.uid()
      AND o.product_id = reviews.product_id
      AND o.status = 'completed'
      AND o.amount > 0
  )
);

COMMENT ON TABLE public.reviews IS 'Customer product reviews. Customer writes require a completed paid order and are moderated before public display.';
