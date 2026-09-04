-- Migration: SUMMECA Full Schema
-- Tables: profiles (extends user_profiles), products, product_plans, orders,
--         subscriptions, downloads, usage, reviews, coupons
-- Timestamp: 20260902090000 (higher than existing 20260902070000)

-- ============================================================
-- STEP 1: ENUM TYPES
-- ============================================================

DROP TYPE IF EXISTS public.product_category CASCADE;
CREATE TYPE public.product_category AS ENUM (
  'ai_tool', 'template', 'dataset', 'api', 'plugin', 'course', 'other'
);

DROP TYPE IF EXISTS public.product_status CASCADE;
CREATE TYPE public.product_status AS ENUM (
  'active', 'draft', 'archived'
);

DROP TYPE IF EXISTS public.plan_billing_period CASCADE;
CREATE TYPE public.plan_billing_period AS ENUM (
  'one_time', 'monthly', 'yearly', 'lifetime'
);

DROP TYPE IF EXISTS public.order_status CASCADE;
CREATE TYPE public.order_status AS ENUM (
  'pending', 'completed', 'failed', 'refunded', 'cancelled'
);

DROP TYPE IF EXISTS public.subscription_status CASCADE;
CREATE TYPE public.subscription_status AS ENUM (
  'active', 'cancelled', 'expired', 'paused', 'trialing'
);

DROP TYPE IF EXISTS public.download_status CASCADE;
CREATE TYPE public.download_status AS ENUM (
  'available', 'expired', 'revoked'
);

DROP TYPE IF EXISTS public.coupon_type CASCADE;
CREATE TYPE public.coupon_type AS ENUM (
  'percentage', 'fixed_amount'
);

-- ============================================================
-- STEP 2: EXTEND user_profiles WITH EXTRA COLUMNS
-- ============================================================

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS company TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT '';

-- ============================================================
-- STEP 3: PRODUCTS TABLE (no user FK — admin-managed)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT DEFAULT '',
  short_desc      TEXT DEFAULT '',
  category        public.product_category NOT NULL DEFAULT 'other'::public.product_category,
  status          public.product_status NOT NULL DEFAULT 'active'::public.product_status,
  thumbnail_url   TEXT DEFAULT '',
  demo_url        TEXT DEFAULT '',
  tags            TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);

-- ============================================================
-- STEP 4: PRODUCT_PLANS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT DEFAULT '',
  price           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'USD',
  billing_period  public.plan_billing_period NOT NULL DEFAULT 'one_time'::public.plan_billing_period,
  features        TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active       BOOLEAN NOT NULL DEFAULT true,
  stripe_price_id TEXT DEFAULT '',
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_plans_product_id ON public.product_plans(product_id);
CREATE INDEX IF NOT EXISTS idx_product_plans_is_active ON public.product_plans(is_active);

-- ============================================================
-- STEP 5: COUPONS TABLE (no user FK — admin-managed)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL,
  coupon_type     public.coupon_type NOT NULL DEFAULT 'percentage'::public.coupon_type,
  discount_value  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  max_uses        INTEGER,
  used_count      INTEGER NOT NULL DEFAULT 0,
  valid_from      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  valid_until     TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  applies_to      UUID REFERENCES public.products(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons(is_active);

-- ============================================================
-- STEP 6: ORDERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  plan_id           UUID REFERENCES public.product_plans(id) ON DELETE SET NULL,
  coupon_id         UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  status            public.order_status NOT NULL DEFAULT 'pending'::public.order_status,
  amount            NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'USD',
  discount_amount   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  stripe_payment_id TEXT DEFAULT '',
  receipt_url       TEXT DEFAULT '',
  metadata          JSONB DEFAULT '{}'::JSONB,
  created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON public.orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- ============================================================
-- STEP 7: SUBSCRIPTIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  product_id            UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  plan_id               UUID NOT NULL REFERENCES public.product_plans(id) ON DELETE RESTRICT,
  order_id              UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  status                public.subscription_status NOT NULL DEFAULT 'active'::public.subscription_status,
  current_period_start  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  current_period_end    TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  stripe_subscription_id TEXT DEFAULT '',
  metadata              JSONB DEFAULT '{}'::JSONB,
  created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_product_id ON public.subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- ============================================================
-- STEP 8: DOWNLOADS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.downloads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id      UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  file_name     TEXT NOT NULL DEFAULT '',
  file_url      TEXT NOT NULL DEFAULT '',
  file_size     BIGINT DEFAULT 0,
  status        public.download_status NOT NULL DEFAULT 'available'::public.download_status,
  download_count INTEGER NOT NULL DEFAULT 0,
  expires_at    TIMESTAMPTZ,
  last_downloaded_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON public.downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_product_id ON public.downloads(product_id);
CREATE INDEX IF NOT EXISTS idx_downloads_status ON public.downloads(status);

-- ============================================================
-- STEP 9: USAGE TABLE (AI API usage tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES public.products(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  metric          TEXT NOT NULL DEFAULT '',
  quantity        NUMERIC(15, 4) NOT NULL DEFAULT 0,
  unit            TEXT NOT NULL DEFAULT 'tokens',
  period_start    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  period_end      TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_user_id ON public.usage(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_product_id ON public.usage(product_id);
CREATE INDEX IF NOT EXISTS idx_usage_period_start ON public.usage(period_start DESC);
CREATE INDEX IF NOT EXISTS idx_usage_metric ON public.usage(metric);

-- ============================================================
-- STEP 10: REVIEWS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rating      SMALLINT NOT NULL DEFAULT 5,
  title       TEXT DEFAULT '',
  body        TEXT DEFAULT '',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5)
);

-- One review per user per product
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_product ON public.reviews(user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews(rating);

-- ============================================================
-- STEP 11: UPDATED_AT TRIGGER FUNCTION (reuse existing or recreate)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 12: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews          ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 13: RLS POLICIES
-- ============================================================

-- PRODUCTS: publicly readable, no public write
DROP POLICY IF EXISTS "public_read_products" ON public.products;
CREATE POLICY "public_read_products"
ON public.products
FOR SELECT
TO public
USING (status = 'active'::public.product_status);

-- PRODUCT_PLANS: publicly readable
DROP POLICY IF EXISTS "public_read_product_plans" ON public.product_plans;
CREATE POLICY "public_read_product_plans"
ON public.product_plans
FOR SELECT
TO public
USING (is_active = true);

-- COUPONS: authenticated users can read active coupons (to validate at checkout)
DROP POLICY IF EXISTS "auth_read_coupons" ON public.coupons;
CREATE POLICY "auth_read_coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (is_active = true);

-- ORDERS: users manage their own
DROP POLICY IF EXISTS "users_manage_own_orders" ON public.orders;
CREATE POLICY "users_manage_own_orders"
ON public.orders
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- SUBSCRIPTIONS: users manage their own
DROP POLICY IF EXISTS "users_manage_own_subscriptions" ON public.subscriptions;
CREATE POLICY "users_manage_own_subscriptions"
ON public.subscriptions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DOWNLOADS: users manage their own
DROP POLICY IF EXISTS "users_manage_own_downloads" ON public.downloads;
CREATE POLICY "users_manage_own_downloads"
ON public.downloads
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- USAGE: users manage their own
DROP POLICY IF EXISTS "users_manage_own_usage" ON public.usage;
CREATE POLICY "users_manage_own_usage"
ON public.usage
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- REVIEWS: publicly readable; authenticated users manage their own
DROP POLICY IF EXISTS "public_read_reviews" ON public.reviews;
CREATE POLICY "public_read_reviews"
ON public.reviews
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "users_manage_own_reviews" ON public.reviews;
CREATE POLICY "users_manage_own_reviews"
ON public.reviews
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- STEP 14: UPDATED_AT TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS on_products_updated ON public.products;
CREATE TRIGGER on_products_updated
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_product_plans_updated ON public.product_plans;
CREATE TRIGGER on_product_plans_updated
  BEFORE UPDATE ON public.product_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_coupons_updated ON public.coupons;
CREATE TRIGGER on_coupons_updated
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_orders_updated ON public.orders;
CREATE TRIGGER on_orders_updated
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_subscriptions_updated ON public.subscriptions;
CREATE TRIGGER on_subscriptions_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_downloads_updated ON public.downloads;
CREATE TRIGGER on_downloads_updated
  BEFORE UPDATE ON public.downloads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_reviews_updated ON public.reviews;
CREATE TRIGGER on_reviews_updated
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- STEP 15: SEED DEMO PRODUCTS & PLANS
-- ============================================================

DO $$
DECLARE
  prod1_id UUID := gen_random_uuid();
  prod2_id UUID := gen_random_uuid();
  prod3_id UUID := gen_random_uuid();
BEGIN
  -- Products
  INSERT INTO public.products (id, name, slug, description, short_desc, category, status, thumbnail_url, tags)
  VALUES
    (prod1_id, 'SUMMECA AI Writer', 'summeca-ai-writer',
     'Generate high-quality marketing copy, blog posts, and product descriptions with advanced AI.',
     'AI-powered content generation for marketers and creators.',
     'ai_tool'::public.product_category, 'active'::public.product_status,
     'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80',
     ARRAY['ai', 'writing', 'content', 'marketing']),
    (prod2_id, 'SUMMECA Data Toolkit', 'summeca-data-toolkit',
     'A comprehensive dataset and analysis toolkit for data scientists and ML engineers.',
     'Curated datasets and preprocessing tools for ML projects.',
     'dataset'::public.product_category, 'active'::public.product_status,
     'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80',
     ARRAY['data', 'ml', 'dataset', 'analytics']),
    (prod3_id, 'SUMMECA Pro Templates', 'summeca-pro-templates',
     'Premium design templates for SaaS landing pages, dashboards, and marketing sites.',
     'Ready-to-use professional templates for modern web projects.',
     'template'::public.product_category, 'active'::public.product_status,
     'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&q=80',
     ARRAY['templates', 'design', 'saas', 'landing-page'])
  ON CONFLICT (slug) DO NOTHING;

  -- Plans for AI Writer
  INSERT INTO public.product_plans (product_id, name, description, price, currency, billing_period, features, is_active, sort_order)
  VALUES
    (prod1_id, 'Starter', 'Perfect for individuals', 9.00, 'USD', 'monthly'::public.plan_billing_period,
     ARRAY['50,000 words/month', '10 templates', 'Email support'], true, 1),
    (prod1_id, 'Pro', 'For growing teams', 29.00, 'USD', 'monthly'::public.plan_billing_period,
     ARRAY['Unlimited words', '50+ templates', 'Priority support', 'API access'], true, 2),
    (prod1_id, 'Lifetime', 'One-time purchase', 199.00, 'USD', 'lifetime'::public.plan_billing_period,
     ARRAY['Unlimited words forever', 'All templates', 'Lifetime updates', 'Priority support'], true, 3)
  ON CONFLICT (id) DO NOTHING;

  -- Plans for Data Toolkit
  INSERT INTO public.product_plans (product_id, name, description, price, currency, billing_period, features, is_active, sort_order)
  VALUES
    (prod2_id, 'Basic', 'Core datasets', 0.00, 'USD', 'one_time'::public.plan_billing_period,
     ARRAY['5 datasets', 'CSV export', 'Community support'], true, 1),
    (prod2_id, 'Professional', 'Full toolkit access', 49.00, 'USD', 'one_time'::public.plan_billing_period,
     ARRAY['50+ datasets', 'All formats', 'Preprocessing scripts', 'Priority support'], true, 2)
  ON CONFLICT (id) DO NOTHING;

  -- Plans for Pro Templates
  INSERT INTO public.product_plans (product_id, name, description, price, currency, billing_period, features, is_active, sort_order)
  VALUES
    (prod3_id, 'Single License', 'One project', 19.00, 'USD', 'one_time'::public.plan_billing_period,
     ARRAY['1 project license', 'All templates', '6 months updates'], true, 1),
    (prod3_id, 'Extended License', 'Unlimited projects', 79.00, 'USD', 'one_time'::public.plan_billing_period,
     ARRAY['Unlimited projects', 'All templates', 'Lifetime updates', 'Source files'], true, 2)
  ON CONFLICT (id) DO NOTHING;

  -- Sample coupon
  INSERT INTO public.coupons (code, coupon_type, discount_value, max_uses, valid_until, is_active)
  VALUES
    ('LAUNCH20', 'percentage'::public.coupon_type, 20.00, 500, CURRENT_TIMESTAMP + INTERVAL '90 days', true),
    ('WELCOME10', 'percentage'::public.coupon_type, 10.00, NULL, NULL, true)
  ON CONFLICT (code) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Seed data insertion failed: %', SQLERRM;
END $$;
