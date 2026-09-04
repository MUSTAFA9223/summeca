-- Migration: Product Reviews V29 — Add moderation_status to reviews
-- Timestamp: 20260904100000

-- ============================================================
-- STEP 1: Add moderation_status column to existing reviews table
-- ============================================================

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewer_name TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status ON public.reviews(moderation_status);

-- ============================================================
-- STEP 2: Update RLS policies to only show approved reviews publicly
-- ============================================================

DROP POLICY IF EXISTS "public_read_reviews" ON public.reviews;
CREATE POLICY "public_read_reviews"
ON public.reviews
FOR SELECT
TO public
USING (moderation_status = 'approved');

-- Authenticated users can see their own reviews regardless of status
DROP POLICY IF EXISTS "users_read_own_reviews" ON public.reviews;
CREATE POLICY "users_read_own_reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- STEP 3: Seed sample approved reviews for demo products
-- ============================================================

DO $$
DECLARE
  prod1_id UUID;
  prod2_id UUID;
  prod3_id UUID;
  user1_id UUID;
BEGIN
  SELECT id INTO prod1_id FROM public.products WHERE slug = 'summeca-ai-writer' LIMIT 1;
  SELECT id INTO prod2_id FROM public.products WHERE slug = 'summeca-data-toolkit' LIMIT 1;
  SELECT id INTO prod3_id FROM public.products WHERE slug = 'summeca-pro-templates' LIMIT 1;
  SELECT id INTO user1_id FROM public.user_profiles LIMIT 1;

  IF user1_id IS NOT NULL AND prod1_id IS NOT NULL THEN
    INSERT INTO public.reviews (id, user_id, product_id, rating, title, body, is_verified, is_featured, moderation_status, reviewer_name)
    VALUES
      (gen_random_uuid(), user1_id, prod1_id, 5, 'Incredible AI writing tool', 'SUMMECA AI Writer has completely transformed how I create content. The quality is outstanding and saves me hours every week.', true, true, 'approved', 'Alex M.'),
      (gen_random_uuid(), user1_id, prod1_id, 4, 'Great value for money', 'Really impressed with the output quality. The templates are well-designed and the AI suggestions are spot on.', true, false, 'approved', 'Sarah K.')
    ON CONFLICT (user_id, product_id) DO NOTHING;
  END IF;

  IF user1_id IS NOT NULL AND prod2_id IS NOT NULL THEN
    INSERT INTO public.reviews (id, user_id, product_id, rating, title, body, is_verified, is_featured, moderation_status, reviewer_name)
    VALUES
      (gen_random_uuid(), user1_id, prod2_id, 5, 'Best dataset toolkit available', 'The preprocessing scripts alone are worth the price. Saved my team weeks of work on our ML pipeline.', true, true, 'approved', 'David R.')
    ON CONFLICT (user_id, product_id) DO NOTHING;
  END IF;

  IF user1_id IS NOT NULL AND prod3_id IS NOT NULL THEN
    INSERT INTO public.reviews (id, user_id, product_id, rating, title, body, is_verified, is_featured, moderation_status, reviewer_name)
    VALUES
      (gen_random_uuid(), user1_id, prod3_id, 5, 'Premium quality templates', 'These templates are exactly what I needed for my SaaS product. Clean, modern, and easy to customize.', true, true, 'approved', 'Emma L.')
    ON CONFLICT (user_id, product_id) DO NOTHING;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Seed reviews failed: %', SQLERRM;
END $$;
