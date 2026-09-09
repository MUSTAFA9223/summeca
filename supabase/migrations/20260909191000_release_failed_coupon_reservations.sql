-- Keep the existing production coupon-release trigger idempotent and safe.
-- create_priced_order reserves coupon usage when an order is created. If an
-- unpaid order later fails or is cancelled, release exactly that reservation.

-- Clean up the alternate name from an interrupted/pre-production migration so
-- environments can never end up with two triggers decrementing the same coupon.
drop trigger if exists release_coupon_reservation_on_order_failure on public.orders;
drop function if exists public.release_coupon_reservation_on_order_failure();

create or replace function public.release_failed_order_coupon()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status in ('pending'::public.order_status, 'pending_payment'::public.order_status)
     and new.status in ('failed'::public.order_status, 'cancelled'::public.order_status)
     and new.coupon_id is not null
     and coalesce(old.metadata, '{}'::jsonb) @> '{"coupon_reserved": true}'::jsonb
  then
    update public.coupons
       set used_count = greatest(coalesce(used_count, 0) - 1, 0)
     where id = new.coupon_id;

    new.metadata := coalesce(new.metadata, '{}'::jsonb)
      || jsonb_build_object(
        'coupon_reserved', false,
        'coupon_reservation_released_at', now()
      );
  end if;

  return new;
end;
$$;

revoke all on function public.release_failed_order_coupon() from public, anon, authenticated;
grant execute on function public.release_failed_order_coupon() to service_role;

drop trigger if exists release_failed_order_coupon on public.orders;
create trigger release_failed_order_coupon
before update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.release_failed_order_coupon();
