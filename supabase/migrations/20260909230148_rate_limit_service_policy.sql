DROP POLICY IF EXISTS api_rate_limits_service_only ON public.api_rate_limits;
CREATE POLICY api_rate_limits_service_only
  ON public.api_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
