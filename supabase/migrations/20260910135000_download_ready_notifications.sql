-- Create an in-app notification whenever a secure download entitlement is granted.
-- The entitlement itself is created only by trusted checkout/payment flows.

create or replace function public.notify_download_ready()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_product_name text;
begin
  if new.status <> 'available' or coalesce(trim(new.file_url), '') = '' then
    return new;
  end if;

  select p.name into v_product_name
  from public.products p
  where p.id = new.product_id;

  insert into public.notifications (
    user_id,
    type,
    title,
    message,
    action_url,
    read
  ) values (
    new.user_id,
    'order',
    'Your download is ready',
    coalesce(v_product_name, 'Your digital product') || ' is ready. Open Downloads to access your files.',
    '/user-dashboard/downloads',
    false
  );

  return new;
end;
$function$;

revoke all on function public.notify_download_ready() from public, anon, authenticated;
grant execute on function public.notify_download_ready() to postgres, service_role;

drop trigger if exists notify_download_ready_after_insert on public.downloads;
create trigger notify_download_ready_after_insert
after insert on public.downloads
for each row
execute function public.notify_download_ready();
