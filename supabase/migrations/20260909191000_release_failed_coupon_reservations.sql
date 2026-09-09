-- Release coupon reservations automatically when an unpaid order fails or is cancelled.
-- Coupon usage is reserved atomically by create_priced_order; this trigger makes
-- the reservation reversible on terminal unpaid states without trusting an API
-- route to remember a compensating write.

create or replace function public.release_coupon_reservation_on_order_failure()
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

revoke all on function public.release_coupon_reservation_on_order_failure() from public, anon, authenticated;

drop trigger if exists release_coupon_reservation_on_order_failure on public.orders;
create trigger release_coupon_reservation_on_order_failure
before update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.release_coupon_reservation_on_order_failure();
