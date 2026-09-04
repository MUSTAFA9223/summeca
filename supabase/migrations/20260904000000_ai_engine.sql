-- ─── SUMMECA AI Marketing Engine — Database Schema ───────────────────────────
-- Migration: 20260904000000_ai_engine.sql

-- ─── 1. ENUM TYPES ────────────────────────────────────────────────────────────

DROP TYPE IF EXISTS public.ai_generation_type CASCADE;
CREATE TYPE public.ai_generation_type AS ENUM (
  'product_description',
  'seo_optimization',
  'marketing_campaign',
  'product_analysis',
  'store_assistant',
  'email_campaign',
  'social_post'
);

-- ─── 2. TABLES ────────────────────────────────────────────────────────────────

-- AI generation history
CREATE TABLE IF NOT EXISTS public.ai_generations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  generation_type public.ai_generation_type NOT NULL,
  model           TEXT NOT NULL DEFAULT 'gpt-4.1',
  input_data      JSONB NOT NULL DEFAULT '{}',
  output_text     TEXT,
  tokens_used     INTEGER DEFAULT 0,
  duration_ms     INTEGER DEFAULT 0,
  product_id      UUID REFERENCES public.products(id) ON DELETE SET NULL,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- AI usage tracking per user per month
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  requests_count  INTEGER DEFAULT 0,
  tokens_used     INTEGER DEFAULT 0,
  monthly_limit   INTEGER DEFAULT 50,
  created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, period_start)
);

-- ─── 3. INDEXES ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id    ON public.ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_type       ON public.ai_generations(generation_type);
CREATE INDEX IF NOT EXISTS idx_ai_generations_product_id ON public.ai_generations(product_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON public.ai_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id          ON public.ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_period           ON public.ai_usage(period_start);

-- ─── 4. FUNCTIONS ─────────────────────────────────────────────────────────────

-- Reuse existing is_admin() if available, otherwise create helper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.user_profiles WHERE id = auth.uid()),
    false
  )
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_ai_usage_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Upsert or increment ai_usage for current month
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_user_id UUID, p_tokens INTEGER DEFAULT 0)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_start DATE := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end   DATE := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
  v_limit        INTEGER := 50;
BEGIN
  -- Admins get unlimited (9999)
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_user_id AND role = 'admin') THEN
    v_limit := 9999;
  END IF;

  INSERT INTO public.ai_usage (user_id, period_start, period_end, requests_count, tokens_used, monthly_limit)
  VALUES (p_user_id, v_period_start, v_period_end, 1, p_tokens, v_limit)
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET
    requests_count = public.ai_usage.requests_count + 1,
    tokens_used    = public.ai_usage.tokens_used + p_tokens,
    updated_at     = CURRENT_TIMESTAMP;
END;
$$;

-- ─── 5. ENABLE RLS ────────────────────────────────────────────────────────────

ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage       ENABLE ROW LEVEL SECURITY;

-- ─── 6. RLS POLICIES ─────────────────────────────────────────────────────────

-- ai_generations: users see own, admins see all
DROP POLICY IF EXISTS "ai_generations_user_select" ON public.ai_generations;
CREATE POLICY "ai_generations_user_select"
ON public.ai_generations FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "ai_generations_user_insert" ON public.ai_generations;
CREATE POLICY "ai_generations_user_insert"
ON public.ai_generations FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "ai_generations_admin_all" ON public.ai_generations;
CREATE POLICY "ai_generations_admin_all"
ON public.ai_generations FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ai_usage: users see own, admins see all
DROP POLICY IF EXISTS "ai_usage_user_select" ON public.ai_usage;
CREATE POLICY "ai_usage_user_select"
ON public.ai_usage FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "ai_usage_admin_all" ON public.ai_usage;
CREATE POLICY "ai_usage_admin_all"
ON public.ai_usage FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ─── 7. TRIGGERS ─────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS ai_usage_updated_at ON public.ai_usage;
CREATE TRIGGER ai_usage_updated_at
BEFORE UPDATE ON public.ai_usage
FOR EACH ROW EXECUTE FUNCTION public.handle_ai_usage_updated_at();
