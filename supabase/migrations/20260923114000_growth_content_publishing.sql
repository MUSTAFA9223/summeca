ALTER TYPE public.ai_generation_type ADD VALUE IF NOT EXISTS 'growth_page';

CREATE TABLE IF NOT EXISTS public.growth_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  meta_description text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  search_topic text NOT NULL,
  search_intent text NOT NULL DEFAULT 'informational',
  target_product_id uuid NULL REFERENCES public.products(id) ON DELETE SET NULL,
  target_product_slug text NULL,
  target_product_name text NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  social_post text NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  source_generation_id uuid NULL REFERENCES public.ai_generations(id) ON DELETE SET NULL,
  created_by uuid NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  published_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS growth_pages_status_published_idx
  ON public.growth_pages(status, published_at DESC);
CREATE INDEX IF NOT EXISTS growth_pages_target_product_idx
  ON public.growth_pages(target_product_slug);

CREATE OR REPLACE FUNCTION public.touch_growth_page_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS growth_pages_updated_at ON public.growth_pages;
CREATE TRIGGER growth_pages_updated_at
BEFORE UPDATE ON public.growth_pages
FOR EACH ROW EXECUTE FUNCTION public.touch_growth_page_updated_at();

ALTER TABLE public.growth_pages ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.growth_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_pages TO authenticated;

DROP POLICY IF EXISTS growth_pages_public_read ON public.growth_pages;
CREATE POLICY growth_pages_public_read
ON public.growth_pages
FOR SELECT
TO anon, authenticated
USING (status = 'published');

DROP POLICY IF EXISTS growth_pages_admin_all ON public.growth_pages;
CREATE POLICY growth_pages_admin_all
ON public.growth_pages
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
