begin;

create table if not exists public.digital_product_assets (
  asset_key text primary key,
  file_name text not null,
  mime_type text not null default 'application/octet-stream',
  content_base64 text not null,
  byte_size bigint not null default 0 check (byte_size >= 0),
  sha256 text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint digital_product_assets_key_format
    check (asset_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

alter table public.digital_product_assets enable row level security;
revoke all on table public.digital_product_assets from anon, authenticated;
grant select on table public.digital_product_assets to service_role;

comment on table public.digital_product_assets is
  'Private server-only digital product payloads. Never expose this table to anon/authenticated clients.';

create or replace function public.apply_digital_product_download_asset()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_download_url text;
  v_file_name text;
begin
  if coalesce(new.file_url, '') <> '' then
    return new;
  end if;

  select
    p.metadata ->> 'download_url',
    p.metadata ->> 'download_file_name'
  into v_download_url, v_file_name
  from public.products p
  where p.id = new.product_id;

  if coalesce(v_download_url, '') like 'dbasset:%' then
    new.file_url := v_download_url;
    if coalesce(new.file_name, '') = '' then
      new.file_name := coalesce(v_file_name, 'download.zip');
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.apply_digital_product_download_asset() from public;

DROP TRIGGER IF EXISTS apply_digital_product_download_asset_before_insert ON public.downloads;
create trigger apply_digital_product_download_asset_before_insert
before insert on public.downloads
for each row
execute function public.apply_digital_product_download_asset();

commit;
