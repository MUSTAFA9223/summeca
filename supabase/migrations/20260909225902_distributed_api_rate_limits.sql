CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  key_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT api_rate_limits_key_hash_check
    CHECK (key_hash ~ '^[0-9a-f]{64}$')
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.api_rate_limits TO service_role;

CREATE INDEX IF NOT EXISTS api_rate_limits_expires_at_idx
  ON public.api_rate_limits (expires_at);

CREATE OR REPLACE FUNCTION public.consume_api_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_ms integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_window interval;
  v_count integer;
  v_expires_at timestamptz;
BEGIN
  IF p_key_hash IS NULL OR p_key_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid rate-limit key';
  END IF;
  IF p_limit < 1 OR p_limit > 10000 THEN
    RAISE EXCEPTION 'Invalid rate-limit capacity';
  END IF;
  IF p_window_ms < 1000 OR p_window_ms > 86400000 THEN
    RAISE EXCEPTION 'Invalid rate-limit window';
  END IF;

  v_window := make_interval(secs => p_window_ms / 1000.0);

  INSERT INTO public.api_rate_limits (
    key_hash,
    window_started_at,
    expires_at,
    request_count,
    updated_at
  )
  VALUES (p_key_hash, v_now, v_now + v_window, 1, v_now)
  ON CONFLICT (key_hash) DO UPDATE
  SET window_started_at = CASE
        WHEN api_rate_limits.expires_at <= v_now THEN v_now
        ELSE api_rate_limits.window_started_at
      END,
      expires_at = CASE
        WHEN api_rate_limits.expires_at <= v_now THEN v_now + v_window
        ELSE api_rate_limits.expires_at
      END,
      request_count = CASE
        WHEN api_rate_limits.expires_at <= v_now THEN 1
        ELSE api_rate_limits.request_count + 1
      END,
      updated_at = v_now
  RETURNING request_count, expires_at
    INTO v_count, v_expires_at;

  DELETE FROM public.api_rate_limits
   WHERE key_hash IN (
     SELECT key_hash
       FROM public.api_rate_limits
      WHERE expires_at < v_now - interval '1 day'
        AND key_hash <> p_key_hash
      ORDER BY expires_at
      LIMIT 50
      FOR UPDATE SKIP LOCKED
   );

  RETURN jsonb_build_object(
    'allowed', v_count <= p_limit,
    'remaining', GREATEST(0, p_limit - v_count),
    'reset_at', v_expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_api_rate_limit(text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limit(text, integer, integer)
  TO service_role;
