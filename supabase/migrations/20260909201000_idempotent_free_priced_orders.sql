-- Make zero-value checkout use the same atomic pricing/coupon path as paid checkout
-- without consuming the same free entitlement more than once.

create or replace function public.create_priced_order(
  p_user uuid,
  p_plan uuid,
  p_coupon uuid default null,
  p_expected numeric default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.product_plans;
  q jsonb;
  o public.orders;
  pr public.products;
  final_amount numeric;
begin
  if not exists(select 1 from public.user_profiles where id = p_user) then
    raise exception 'Customer unavailable';
  end if;

  -- Serialize checkout mutations for one customer. This also makes the
  -- zero-value duplicate check below safe against double-clicks/concurrency.
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 41));

  select * into p
  from public.product_plans
  where id = p_plan
  for share;

  select * into pr
  from public.products
  where id = p.product_id and status = 'active'
  for share;

  if p.id is null or not p.is_active or pr.id is null then
    raise exception 'Plan unavailable';
  end if;

  if p_coupon is not null then
    perform id from public.coupons where id = p_coupon for update;
  end if;

  q := public.quote_product_price(p_plan, p_coupon);
  final_amount := (q->>'final_amount')::numeric;

  if p_expected is not null and p_expected is distinct from final_amount then
    raise exception 'Price changed. Review the updated total and try again.';
  end if;

  -- A free plan / 100%-discount redemption is an entitlement, not a consumable
  -- checkout attempt. Return the existing completed zero-value order before
  -- reserving another coupon use or inserting duplicate entitlements.
  if final_amount = 0 then
    select * into o
    from public.orders
    where user_id = p_user
      and product_id = p.product_id
      and plan_id = p.id
      and status = 'completed'::public.order_status
      and amount = 0
    order by created_at desc
    limit 1;

    if o.id is not null then
      return o;
    end if;
  end if;

  if (
    select count(*)
    from public.orders
    where user_id = p_user
      and created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'Order limit reached';
  end if;

  if p_coupon is not null then
    update public.coupons
    set used_count = used_count + 1
    where id = p_coupon;
  end if;

  insert into public.orders(
    user_id, product_id, plan_id, coupon_id, status, amount, currency,
    discount_amount, metadata
  ) values (
    p_user,
    p.product_id,
    p.id,
    p_coupon,
    case when final_amount = 0
      then 'completed'::public.order_status
      else 'pending_payment'::public.order_status
    end,
    final_amount,
    p.currency,
    p.price - final_amount,
    q || jsonb_build_object(
      'provider', case when final_amount = 0 then 'free' else 'payoneer' end,
      'plan_name', p.name,
      'product_name', pr.name,
      'coupon_reserved', p_coupon is not null
    )
  ) returning * into o;

  if o.amount = 0 then
    if p.billing_period in ('monthly', 'yearly', 'lifetime') then
      insert into public.subscriptions(
        user_id, product_id, plan_id, order_id, status,
        current_period_start, current_period_end, payment_provider
      ) values (
        p_user,
        p.product_id,
        p.id,
        o.id,
        'active',
        now(),
        case p.billing_period
          when 'monthly' then now() + interval '1 month'
          when 'yearly' then now() + interval '1 year'
          else null
        end,
        'free'
      );
    end if;

    if p.billing_period in ('one_time', 'lifetime') then
      insert into public.downloads(
        user_id, product_id, order_id, file_name, file_url, status
      ) values (
        p_user,
        p.product_id,
        o.id,
        pr.name,
        coalesce(pr.metadata->>'download_url', ''),
        'available'
      );
    end if;
  end if;

  return o;
end;
$$;

revoke all on function public.create_priced_order(uuid, uuid, uuid, numeric)
  from public, anon, authenticated;
grant execute on function public.create_priced_order(uuid, uuid, uuid, numeric)
  to service_role;
