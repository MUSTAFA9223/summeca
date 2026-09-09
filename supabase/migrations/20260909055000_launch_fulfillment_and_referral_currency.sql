-- Launch hardening: truthful download delivery and multi-currency referral rewards.
-- Non-destructive: invalid legacy download rows are revoked, never deleted.

alter table public.referrals
  add column if not exists reward_currency text;

update public.referrals r
set reward_currency = upper(o.currency)
from public.orders o
where r.reward_order_id = o.id
  and coalesce(r.reward_amount, 0) > 0
  and r.reward_currency is null;

create or replace function public.apply_referral_reward()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update public.referrals r
      set status = 'rewarded',
          reward_amount = round((coalesce(new.amount,0)::numeric * 0.05), 2),
          reward_currency = upper(coalesce(new.currency, 'USD')),
          reward_order_id = new.id,
          updated_at = now()
    where r.id = (
      select x.id from public.referrals x
      where x.referred_user_id = new.user_id
        and x.status in ('registered','purchased')
        and x.reward_order_id is null
      order by x.created_at asc
      limit 1
    );
  elsif new.status = 'refunded' and old.status = 'completed' then
    update public.referrals
      set status = 'registered',
          reward_amount = 0,
          reward_currency = null,
          reward_order_id = null,
          updated_at = now()
    where reward_order_id = new.id;
  end if;
  return new;
end;
$function$;

revoke all on function public.apply_referral_reward() from public, anon, authenticated;
grant execute on function public.apply_referral_reward() to postgres, service_role;

-- Existing placeholder rows must never appear as downloadable files.
update public.downloads
set status = 'revoked'
where status = 'available'
  and coalesce(trim(file_url), '') = '';

create or replace function public.prepare_download_entitlement()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  cfg jsonb;
  configured_path text;
  configured_name text;
  configured_size bigint;
begin
  -- Explicit paths created by trusted server/admin code are preserved.
  if coalesce(trim(new.file_url), '') <> '' then
    return new;
  end if;

  select metadata -> 'download'
    into cfg
  from public.products
  where id = new.product_id;

  if cfg is null or jsonb_typeof(cfg) <> 'object' then
    -- A one-time/lifetime purchase is not automatically a file download.
    -- Skipping the row is safer than creating a fake, unusable entitlement.
    return null;
  end if;

  configured_path := trim(coalesce(cfg ->> 'path', ''));
  if configured_path = ''
     or configured_path ~* '^[a-z][a-z0-9+.-]*://'
     or configured_path like '%..%'
     or configured_path like E'%\\%' then
    return null;
  end if;

  configured_name := trim(coalesce(cfg ->> 'name', ''));
  if configured_name = '' then
    configured_name := regexp_replace(configured_path, '^.*/', '');
  end if;

  begin
    configured_size := greatest(0, coalesce((cfg ->> 'size')::bigint, 0));
  exception when others then
    configured_size := 0;
  end;

  new.file_url := configured_path;
  new.file_name := configured_name;
  new.file_size := configured_size;
  new.status := 'available';
  return new;
end;
$function$;

revoke all on function public.prepare_download_entitlement() from public, anon, authenticated;
grant execute on function public.prepare_download_entitlement() to postgres, service_role;

drop trigger if exists prepare_download_entitlement_before_insert on public.downloads;
create trigger prepare_download_entitlement_before_insert
before insert on public.downloads
for each row
execute function public.prepare_download_entitlement();
