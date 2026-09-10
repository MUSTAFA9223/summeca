begin;

create or replace function public.apply_digital_product_download_asset()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_download_url text;
  v_file_name text;
  v_is_saas boolean;
begin
  if coalesce(new.file_url, '') <> '' then
    return new;
  end if;

  select
    p.metadata ->> 'download_url',
    p.metadata ->> 'download_file_name',
    coalesce((p.metadata ->> 'saas_product')::boolean, false)
  into v_download_url, v_file_name, v_is_saas
  from public.products p
  where p.id = new.product_id;

  -- Lifetime SaaS products receive an application subscription entitlement,
  -- not a fake/blank downloadable file record.
  if coalesce(v_is_saas, false) then
    return null;
  end if;

  if coalesce(v_download_url, '') like 'dbasset:%' then
    new.file_url := v_download_url;
    if coalesce(new.file_name, '') = '' then
      new.file_name := coalesce(v_file_name, 'download.zip');
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.apply_digital_product_download_asset() from public, anon, authenticated;

commit;
