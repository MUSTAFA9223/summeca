alter table public.product_plans
  add column if not exists sale_price numeric(10,2),
  add column if not exists sale_discount_type text,
  add column if not exists sale_discount_value numeric(10,2),
  add column if not exists sale_starts_at timestamptz,
  add column if not exists sale_ends_at timestamptz;

alter table public.product_plans
  drop constraint if exists product_plans_price_nonnegative,
  add constraint product_plans_price_nonnegative check (price >= 0),
  drop constraint if exists product_plans_sale_price_nonnegative,
  add constraint product_plans_sale_price_nonnegative check (sale_price is null or sale_price >= 0),
  drop constraint if exists product_plans_sale_price_lte_regular,
  add constraint product_plans_sale_price_lte_regular check (sale_price is null or sale_price <= price),
  drop constraint if exists product_plans_sale_discount_type_valid,
  add constraint product_plans_sale_discount_type_valid check (sale_discount_type is null or sale_discount_type in ('percentage','fixed_amount')),
  drop constraint if exists product_plans_sale_discount_value_valid,
  add constraint product_plans_sale_discount_value_valid check (
    sale_discount_value is null
    or (sale_discount_type = 'percentage' and sale_discount_value > 0 and sale_discount_value <= 100)
    or (sale_discount_type = 'fixed_amount' and sale_discount_value > 0)
  ),
  drop constraint if exists product_plans_sale_dates_valid,
  add constraint product_plans_sale_dates_valid check (sale_ends_at is null or sale_starts_at is null or sale_ends_at > sale_starts_at),
  drop constraint if exists product_plans_currency_valid,
  add constraint product_plans_currency_valid check (currency ~ '^[A-Z]{3}$');

alter table public.coupons
  drop constraint if exists coupons_discount_value_valid,
  add constraint coupons_discount_value_valid check (
    (coupon_type = 'percentage' and discount_value > 0 and discount_value <= 100)
    or (coupon_type = 'fixed_amount' and discount_value > 0)
  ),
  drop constraint if exists coupons_dates_valid,
  add constraint coupons_dates_valid check (valid_until is null or valid_from is null or valid_until > valid_from);

create unique index if not exists coupons_code_unique_ci on public.coupons (lower(code));
