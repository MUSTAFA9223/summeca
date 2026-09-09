-- Disable the original schema's demo storefront data before production launch.
-- Keep rows for audit/history; do not delete them. Future real products/coupons
-- created by administrators are unaffected.

update public.products
set status = 'draft'::public.product_status,
    updated_at = now()
where slug in (
  'summeca-ai-writer',
  'summeca-data-toolkit',
  'summeca-pro-templates'
)
and (
  coalesce(metadata, '{}'::jsonb) = '{}'::jsonb
  or name in ('SUMMECA AI Writer', 'SUMMECA Data Toolkit', 'SUMMECA Pro Templates')
);

update public.coupons
set is_active = false,
    updated_at = now()
where code in ('LAUNCH20', 'WELCOME10')
  and used_count = 0
  and applies_to is null;
