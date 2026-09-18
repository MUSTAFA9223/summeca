begin;

create table if not exists public.proposalflow_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_lead_id uuid references public.leadfollow_leads(id) on delete set null,
  client_name text not null,
  client_company text not null default '',
  template text not null default 'general',
  language text not null default 'English',
  tone text not null default 'professional',
  project text not null,
  deliverables text not null,
  timeline text not null default '',
  price text not null,
  extra_context text not null default '',
  output jsonb not null,
  status text not null default 'draft' check (status = any (array['draft'::text,'sent'::text,'accepted'::text,'declined'::text])),
  share_token uuid not null default gen_random_uuid() unique,
  share_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.proposalflow_proposals is
'Server-managed ProposalFlow records for authenticated SUMMECA users. Browser roles do not receive direct table policies.';

alter table public.proposalflow_proposals enable row level security;

create index if not exists proposalflow_proposals_user_created_idx
  on public.proposalflow_proposals(user_id, created_at desc);

create index if not exists proposalflow_proposals_source_lead_idx
  on public.proposalflow_proposals(source_lead_id)
  where source_lead_id is not null;

alter table public.leadfollow_leads
  drop constraint if exists leadfollow_leads_status_check;

alter table public.leadfollow_leads
  add constraint leadfollow_leads_status_check
  check (status = any (array[
    'new'::text,
    'contacted'::text,
    'proposal_sent'::text,
    'replied'::text,
    'won'::text,
    'lost'::text
  ]));

commit;
