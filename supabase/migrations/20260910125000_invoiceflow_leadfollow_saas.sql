begin;

create table if not exists public.invoiceflow_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null default '',
  legal_name text not null default '',
  email text not null default '',
  phone text not null default '',
  website text not null default '',
  address text not null default '',
  logo_url text not null default '',
  accent_hex text not null default '#0f9f95',
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  footer_note text not null default 'Thank you for your business.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoiceflow_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  company text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoiceflow_clients_user_created_idx
  on public.invoiceflow_clients(user_id, created_at desc);

create table if not exists public.invoiceflow_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.invoiceflow_clients(id) on delete restrict,
  invoice_number text not null,
  issue_date date not null default current_date,
  due_date date,
  status text not null default 'draft' check (status in ('draft','sent','paid','cancelled')),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  tax_rate numeric(6,3) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  notes text not null default '',
  terms text not null default '',
  sent_at timestamptz,
  paid_at timestamptz,
  share_token uuid not null default gen_random_uuid(),
  share_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, invoice_number),
  unique(share_token)
);

create index if not exists invoiceflow_invoices_user_created_idx
  on public.invoiceflow_invoices(user_id, created_at desc);
create index if not exists invoiceflow_invoices_user_status_idx
  on public.invoiceflow_invoices(user_id, status);

create table if not exists public.leadfollow_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null default '',
  offer text not null default '',
  target_audience text not null default '',
  value_proposition text not null default '',
  default_tone text not null default 'professional',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leadfollow_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  company text not null default '',
  email text not null default '',
  phone text not null default '',
  source text not null default '',
  status text not null default 'new' check (status in ('new','contacted','replied','won','lost')),
  notes text not null default '',
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leadfollow_leads_user_created_idx
  on public.leadfollow_leads(user_id, created_at desc);
create index if not exists leadfollow_leads_user_followup_idx
  on public.leadfollow_leads(user_id, next_follow_up_at);
create index if not exists leadfollow_leads_user_status_idx
  on public.leadfollow_leads(user_id, status);

create table if not exists public.leadfollow_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leadfollow_leads(id) on delete cascade,
  channel text not null default 'email' check (channel in ('email','linkedin','whatsapp','sms','generic')),
  stage text not null default 'follow_up' check (stage in ('first_contact','follow_up','objection','close','revive')),
  tone text not null default 'professional',
  language text not null default 'English',
  input_context text not null default '',
  output_text text not null,
  model text not null default '',
  tokens_used integer not null default 0 check (tokens_used >= 0),
  created_at timestamptz not null default now()
);

create index if not exists leadfollow_messages_user_created_idx
  on public.leadfollow_messages(user_id, created_at desc);
create index if not exists leadfollow_messages_lead_created_idx
  on public.leadfollow_messages(lead_id, created_at desc);

create table if not exists public.leadfollow_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  requests_count integer not null default 0 check (requests_count >= 0),
  tokens_used integer not null default 0 check (tokens_used >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

alter table public.invoiceflow_profiles enable row level security;
alter table public.invoiceflow_clients enable row level security;
alter table public.invoiceflow_invoices enable row level security;
alter table public.leadfollow_profiles enable row level security;
alter table public.leadfollow_leads enable row level security;
alter table public.leadfollow_messages enable row level security;
alter table public.leadfollow_usage enable row level security;

revoke all on table public.invoiceflow_profiles from anon, authenticated;
revoke all on table public.invoiceflow_clients from anon, authenticated;
revoke all on table public.invoiceflow_invoices from anon, authenticated;
revoke all on table public.leadfollow_profiles from anon, authenticated;
revoke all on table public.leadfollow_leads from anon, authenticated;
revoke all on table public.leadfollow_messages from anon, authenticated;
revoke all on table public.leadfollow_usage from anon, authenticated;

grant all on table public.invoiceflow_profiles to service_role;
grant all on table public.invoiceflow_clients to service_role;
grant all on table public.invoiceflow_invoices to service_role;
grant all on table public.leadfollow_profiles to service_role;
grant all on table public.leadfollow_leads to service_role;
grant all on table public.leadfollow_messages to service_role;
grant all on table public.leadfollow_usage to service_role;

create or replace function public.increment_leadfollow_usage(
  p_user_id uuid,
  p_period_start date,
  p_tokens integer default 0
)
returns table(requests_count integer, tokens_used integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.leadfollow_usage(user_id, period_start, requests_count, tokens_used, updated_at)
  values (p_user_id, p_period_start, 1, greatest(coalesce(p_tokens, 0), 0), now())
  on conflict (user_id, period_start)
  do update set
    requests_count = public.leadfollow_usage.requests_count + 1,
    tokens_used = public.leadfollow_usage.tokens_used + greatest(coalesce(p_tokens, 0), 0),
    updated_at = now();

  return query
  select u.requests_count, u.tokens_used
  from public.leadfollow_usage u
  where u.user_id = p_user_id and u.period_start = p_period_start;
end;
$$;

revoke all on function public.increment_leadfollow_usage(uuid,date,integer) from public, anon, authenticated;
grant execute on function public.increment_leadfollow_usage(uuid,date,integer) to service_role;

insert into public.products(name, slug, description, short_desc, category, status, thumbnail_url, demo_url, tags, metadata)
select
  'SUMMECA InvoiceFlow',
  'summeca-invoiceflow',
  'Create professional invoices, manage clients, track payment status, calculate totals and tax, prepare reminders, export records, and save invoices as PDF from one focused workspace. InvoiceFlow is a self-serve SUMMECA SaaS application; customers use it directly after verified purchase.',
  'Create invoices, track payment status, manage clients, and keep billing organized in one focused workspace.',
  'other'::product_category,
  'draft'::product_status,
  'https://summeca.com/assets/products/invoiceflow.svg',
  'https://summeca.com/user-dashboard/invoiceflow',
  array['invoicing','billing','clients','small business','saas'],
  jsonb_build_object('saas_product', true, 'app_path', '/user-dashboard/invoiceflow', 'version', 1)
where not exists (select 1 from public.products where slug = 'summeca-invoiceflow');

insert into public.products(name, slug, description, short_desc, category, status, thumbnail_url, demo_url, tags, metadata)
select
  'SUMMECA LeadFollow AI',
  'summeca-leadfollow-ai',
  'Organize leads, schedule follow-ups, manage pipeline status, and generate factual AI-assisted outreach drafts for email, LinkedIn, WhatsApp, SMS, and general follow-up. LeadFollow AI never sends messages automatically and never invents testimonials, guarantees, discounts, or business facts.',
  'Track leads and generate focused AI follow-up drafts without losing the next action.',
  'ai_tool'::product_category,
  'draft'::product_status,
  'https://summeca.com/assets/products/leadfollow-ai.svg',
  'https://summeca.com/user-dashboard/leadfollow',
  array['lead follow-up','crm','sales','ai','outreach'],
  jsonb_build_object('saas_product', true, 'app_path', '/user-dashboard/leadfollow', 'version', 1)
where not exists (select 1 from public.products where slug = 'summeca-leadfollow-ai');

with product as (select id from public.products where slug='summeca-invoiceflow')
insert into public.product_plans(product_id,name,description,price,currency,billing_period,features,is_active,sort_order)
select product.id, v.name, v.description, v.price, 'USD', 'lifetime'::plan_billing_period, v.features, true, v.sort_order
from product cross join (values
  ('Starter','For solo businesses starting a clean invoice workflow.',49::numeric,array['Lifetime access','Up to 50 clients','Up to 250 invoices','Professional invoice builder','Payment-status tracking','Print or save invoices as PDF']::text[],1),
  ('Pro','For active businesses that need higher limits and reporting.',89::numeric,array['Everything in Starter','Up to 5,000 clients','Up to 10,000 invoices','Custom logo, accent and invoice footer','CSV invoice export','Overdue and payment summary dashboard','Ready-to-send payment reminders']::text[],2),
  ('Agency','For agencies and client-service operators with high-volume billing.',149::numeric,array['Everything in Pro','Up to 20,000 clients','Up to 50,000 invoices','Commercial client-service use','High-volume records and exports','Priority product limits']::text[],3)
) as v(name,description,price,features,sort_order)
where not exists (
  select 1 from public.product_plans pp where pp.product_id=product.id and pp.name=v.name
);

with product as (select id from public.products where slug='summeca-leadfollow-ai')
insert into public.product_plans(product_id,name,description,price,currency,billing_period,features,is_active,sort_order)
select product.id, v.name, v.description, v.price, 'USD', 'lifetime'::plan_billing_period, v.features, true, v.sort_order
from product cross join (values
  ('Starter','For freelancers and small teams building a consistent follow-up habit.',59::numeric,array['Lifetime access','Up to 100 leads','50 AI drafts per month','Email, LinkedIn, WhatsApp, SMS and generic drafts','Follow-up scheduling','Pipeline status tracking']::text[],1),
  ('Pro','For active sales workflows that need more leads and AI capacity.',99::numeric,array['Everything in Starter','Up to 1,000 leads','200 AI drafts per month','Pipeline analytics','Message history','Tone, stage and language controls']::text[],2),
  ('Agency','For high-volume client-service and outreach operations.',129::numeric,array['Everything in Pro','Up to 5,000 leads','500 AI drafts per month','Commercial client-service use','High-volume pipeline management','Priority product limits']::text[],3)
) as v(name,description,price,features,sort_order)
where not exists (
  select 1 from public.product_plans pp where pp.product_id=product.id and pp.name=v.name
);

commit;
