begin;

create table if not exists public.siteagent_agents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_key uuid not null default gen_random_uuid() unique,
  agent_name text not null default 'SiteAgent AI',
  business_name text not null default '',
  welcome_message text not null default 'Hi! How can I help today?',
  knowledge_text text not null default '',
  human_email text not null default '',
  allowed_domains text[] not null default '{}'::text[],
  capture_leads boolean not null default true,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.siteagent_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  visitor_key text not null default '',
  visitor_name text not null default '',
  visitor_email text not null default '',
  visitor_company text not null default '',
  page_url text not null default '',
  status text not null default 'open'
    check (status in ('open','qualified','handoff','closed')),
  lead_id uuid references public.leadfollow_leads(id) on delete set null,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists siteagent_conversations_user_updated_idx
  on public.siteagent_conversations(user_id, updated_at desc);
create index if not exists siteagent_conversations_user_status_idx
  on public.siteagent_conversations(user_id, status);

create table if not exists public.siteagent_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.siteagent_conversations(id) on delete cascade,
  role text not null check (role in ('visitor','assistant')),
  content text not null,
  model text not null default '',
  tokens_used integer not null default 0 check (tokens_used >= 0),
  created_at timestamptz not null default now()
);

create index if not exists siteagent_messages_conversation_created_idx
  on public.siteagent_messages(conversation_id, created_at asc);
create index if not exists siteagent_messages_user_created_idx
  on public.siteagent_messages(user_id, created_at desc);

create table if not exists public.siteagent_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  requests_count integer not null default 0 check (requests_count >= 0),
  tokens_used integer not null default 0 check (tokens_used >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

alter table public.siteagent_agents enable row level security;
alter table public.siteagent_conversations enable row level security;
alter table public.siteagent_messages enable row level security;
alter table public.siteagent_usage enable row level security;

revoke all on table public.siteagent_agents from anon, authenticated;
revoke all on table public.siteagent_conversations from anon, authenticated;
revoke all on table public.siteagent_messages from anon, authenticated;
revoke all on table public.siteagent_usage from anon, authenticated;

grant all on table public.siteagent_agents to service_role;
grant all on table public.siteagent_conversations to service_role;
grant all on table public.siteagent_messages to service_role;
grant all on table public.siteagent_usage to service_role;

create or replace function public.reserve_siteagent_ai_request(
  p_user_id uuid,
  p_period_start date,
  p_limit integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_limit <= 0 then
    return null;
  end if;

  insert into public.siteagent_usage(user_id, period_start, requests_count, tokens_used, updated_at)
  values (p_user_id, p_period_start, 1, 0, now())
  on conflict (user_id, period_start)
  do update set
    requests_count = public.siteagent_usage.requests_count + 1,
    updated_at = now()
  where public.siteagent_usage.requests_count < p_limit
  returning requests_count into v_count;

  return v_count;
end;
$$;

create or replace function public.record_siteagent_ai_tokens(
  p_user_id uuid,
  p_period_start date,
  p_tokens integer
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.siteagent_usage
  set tokens_used = tokens_used + greatest(coalesce(p_tokens, 0), 0),
      updated_at = now()
  where user_id = p_user_id and period_start = p_period_start;
$$;

create or replace function public.release_siteagent_ai_request(
  p_user_id uuid,
  p_period_start date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.siteagent_usage
  set requests_count = greatest(requests_count - 1, 0),
      updated_at = now()
  where user_id = p_user_id
    and period_start = p_period_start
  returning requests_count into v_count;

  return v_count;
end;
$$;

revoke all on function public.reserve_siteagent_ai_request(uuid,date,integer) from public, anon, authenticated;
revoke all on function public.record_siteagent_ai_tokens(uuid,date,integer) from public, anon, authenticated;
revoke all on function public.release_siteagent_ai_request(uuid,date) from public, anon, authenticated;
grant execute on function public.reserve_siteagent_ai_request(uuid,date,integer) to service_role;
grant execute on function public.record_siteagent_ai_tokens(uuid,date,integer) to service_role;
grant execute on function public.release_siteagent_ai_request(uuid,date) to service_role;

insert into public.products(
  name, slug, description, short_desc, category, status, thumbnail_url, demo_url, tags, metadata
)
select
  'SUMMECA SiteAgent AI',
  'summeca-siteagent-ai',
  'Add an AI website agent that answers visitor questions from your verified business knowledge, captures qualified contact details, offers a human handoff, and sends captured leads into LeadFollow AI. SiteAgent AI is designed for practical customer support and lead capture without inventing business facts.',
  'Answer website visitors, capture qualified leads, and move them into your SUMMECA sales workflow.',
  'ai_tool'::product_category,
  'active'::product_status,
  '',
  'https://summeca.com/user-dashboard/siteagent',
  array['ai agent','website chat','customer support','lead capture','sales','saas'],
  jsonb_build_object(
    'saas_product', true,
    'app_path', '/user-dashboard/siteagent',
    'version', 1,
    'connected_workflow', 'SiteAgent AI → LeadFollow AI → ProposalFlow AI → InvoiceFlow'
  )
where not exists (
  select 1 from public.products where slug = 'summeca-siteagent-ai'
);

update public.products
set
  status = 'active'::product_status,
  short_desc = 'Answer website visitors, capture qualified leads, and move them into your SUMMECA sales workflow.',
  updated_at = now()
where slug = 'summeca-siteagent-ai';

with product as (
  select id from public.products where slug='summeca-siteagent-ai'
)
insert into public.product_plans(
  product_id,name,description,price,currency,billing_period,features,is_active,sort_order
)
select product.id, v.name, v.description, v.price, 'USD', 'lifetime'::plan_billing_period, v.features, true, v.sort_order
from product cross join (values
  (
    'Starter',
    'For solo operators adding a focused AI website agent to one site.',
    39::numeric,
    array[
      'Lifetime workspace access',
      '250 AI replies per month',
      'Up to 15,000 knowledge characters',
      '1 allowed website domain',
      'Lead capture into LeadFollow AI',
      'Human handoff email'
    ]::text[],
    1
  ),
  (
    'Pro',
    'For growing businesses that need more visitor conversations and knowledge.',
    79::numeric,
    array[
      'Everything in Starter',
      '1,000 AI replies per month',
      'Up to 30,000 knowledge characters',
      'Up to 3 allowed website domains',
      'Recent conversation dashboard',
      'Higher lead-capture capacity through your LeadFollow plan'
    ]::text[],
    2
  ),
  (
    'Agency',
    'For agencies and multi-site operators managing higher conversation volume.',
    129::numeric,
    array[
      'Everything in Pro',
      '3,000 AI replies per month',
      'Up to 60,000 knowledge characters',
      'Up to 10 allowed website domains',
      'Commercial client-service use',
      'Priority product limits'
    ]::text[],
    3
  )
) as v(name,description,price,features,sort_order)
where not exists (
  select 1
  from public.product_plans pp
  where pp.product_id=product.id and pp.name=v.name
);

commit;
