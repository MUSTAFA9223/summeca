-- Launch hardening: private file delivery for user downloads.
-- Existing download rows are preserved. The bucket is created only if absent.

INSERT INTO storage.buckets (id, name, public)
SELECT 'downloads', 'downloads', false
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'downloads'
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'downloads' AND public = true
  ) THEN
    RAISE EXCEPTION 'Refusing to use a public downloads bucket';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_download_access(
  p_download_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.downloads
  SET
    download_count = COALESCE(download_count, 0) + 1,
    last_downloaded_at = now()
  WHERE id = p_download_id
    AND user_id = p_user_id
    AND status = 'available'
    AND (expires_at IS NULL OR expires_at > now());

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.record_download_access(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_download_access(uuid, uuid) TO service_role;
