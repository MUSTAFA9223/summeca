begin;

create table if not exists public.leadfollow_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leadfollow_leads(id) on delete cascade,
  message_id uuid not null references public.leadfollow_messages(id) on delete cascade,
  recipient_email text not null,
  subject text not null,
  body_text text not null,
  status text not null default 'sending' check (status in ('sending','sent','failed')),
  provider_message_id text not null default '',
  error_message text not null default '',
  attempt_count integer not null default 1 check (attempt_count >= 1),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, message_id)
);

create index if not exists leadfollow_email_deliveries_user_created_idx
  on public.leadfollow_email_deliveries(user_id, created_at desc);
create index if not exists leadfollow_email_deliveries_lead_created_idx
  on public.leadfollow_email_deliveries(lead_id, created_at desc);

alter table public.leadfollow_email_deliveries enable row level security;
revoke all on table public.leadfollow_email_deliveries from anon, authenticated;
grant all on table public.leadfollow_email_deliveries to service_role;

comment on table public.leadfollow_email_deliveries is
  'Server-only audit state for one-to-one LeadFollow email sends. Browser roles have no direct access.';

commit;
