create table if not exists public.analytics_visits (
  id bigint generated always as identity primary key,
  session_key text not null unique,
  user_id uuid null references auth.users(id) on delete set null,
  first_path text not null default '/',
  referrer text null,
  source text null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  session_key text null,
  user_id uuid null references auth.users(id) on delete set null,
  event_type text not null,
  path text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.telegram_admin_chats (
  chat_id bigint primary key,
  username text null,
  first_name text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists analytics_visits_started_at_idx on public.analytics_visits(started_at desc);
create index if not exists analytics_visits_source_idx on public.analytics_visits(source);
create index if not exists analytics_events_created_at_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_type_idx on public.analytics_events(event_type);

alter table public.analytics_visits enable row level security;
alter table public.analytics_events enable row level security;
alter table public.telegram_admin_chats enable row level security;

revoke all on public.analytics_visits from anon, authenticated;
revoke all on public.analytics_events from anon, authenticated;
revoke all on public.telegram_admin_chats from anon, authenticated;

grant select on public.analytics_visits to authenticated;
grant select on public.analytics_events to authenticated;
grant select on public.telegram_admin_chats to authenticated;

drop policy if exists admin_read_analytics_visits on public.analytics_visits;
create policy admin_read_analytics_visits on public.analytics_visits
for select to authenticated using (public.is_admin());

drop policy if exists admin_read_analytics_events on public.analytics_events;
create policy admin_read_analytics_events on public.analytics_events
for select to authenticated using (public.is_admin());

drop policy if exists admin_read_telegram_admin_chats on public.telegram_admin_chats;
create policy admin_read_telegram_admin_chats on public.telegram_admin_chats
for select to authenticated using (public.is_admin());
