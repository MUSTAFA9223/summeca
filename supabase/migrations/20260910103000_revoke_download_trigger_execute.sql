begin;

-- Internal trigger functions must not be callable directly by browser-facing roles.
-- Trigger execution itself does not require EXECUTE privilege for the DML caller.
revoke all on function public.apply_digital_product_download_asset() from public, anon, authenticated;

comment on function public.apply_digital_product_download_asset() is
  'Internal trigger-only function for private digital download fulfillment. Direct execution is restricted to trusted server/database roles.';

commit;
