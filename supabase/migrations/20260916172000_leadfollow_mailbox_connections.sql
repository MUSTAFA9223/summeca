begin;

create table if not exists public.leadfollow_email_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google','microsoft')),
  email text not null,
  encrypted_refresh_token text not null,
  scopes text[] not null default '{}'::text[],
  status text not null default 'active' check (status in ('active','error','revoked')),
  last_error text not null default '',
  last_used_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leadfollow_email_connections_provider_email_idx
  on public.leadfollow_email_connections(provider, lower(email));

alter table public.leadfollow_email_connections enable row level security;
revoke all on table public.leadfollow_email_connections from anon, authenticated;
grant all on table public.leadfollow_email_connections to service_role;

comment on table public.leadfollow_email_connections is
  'Server-only OAuth mailbox connection state for LeadFollow. Refresh tokens are encrypted before storage and browser roles have no direct access.';

alter table public.leadfollow_email_deliveries
  add column if not exists sender_provider text not null default 'summeca',
  add column if not exists sender_email text not null default '';

comment on column public.leadfollow_email_deliveries.sender_provider is
  'Mailbox provider used for the send: google, microsoft, or legacy summeca delivery.';
comment on column public.leadfollow_email_deliveries.sender_email is
  'Sender mailbox address recorded for delivery audit.';

commit;
