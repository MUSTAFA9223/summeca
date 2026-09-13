create table if not exists public.telegram_pairing_tokens (
  token_hash text primary key,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists telegram_pairing_tokens_expires_at_idx
  on public.telegram_pairing_tokens(expires_at);

alter table public.telegram_pairing_tokens enable row level security;
revoke all on public.telegram_pairing_tokens from anon, authenticated;
