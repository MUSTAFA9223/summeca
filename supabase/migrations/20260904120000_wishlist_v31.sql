-- SUMMECA V31: Wishlist System
-- Migration: 20260904120000_wishlist_v31.sql

-- Create wishlist_items table
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own wishlist
CREATE POLICY "wishlist_select_own" ON public.wishlist_items
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert into their own wishlist
CREATE POLICY "wishlist_insert_own" ON public.wishlist_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete from their own wishlist
CREATE POLICY "wishlist_delete_own" ON public.wishlist_items
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can view all wishlist items for analytics
CREATE POLICY "wishlist_admin_select" ON public.wishlist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON public.wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_product_id ON public.wishlist_items(product_id);
