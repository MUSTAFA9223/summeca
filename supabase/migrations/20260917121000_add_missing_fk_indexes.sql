-- Add covering indexes for foreign keys reported by the Supabase performance advisor.
-- These are additive, non-destructive indexes and do not change RLS or application behavior.

create index if not exists analytics_events_user_id_idx
  on public.analytics_events (user_id);

create index if not exists analytics_visits_user_id_idx
  on public.analytics_visits (user_id);

create index if not exists leadfollow_email_deliveries_message_id_idx
  on public.leadfollow_email_deliveries (message_id);
