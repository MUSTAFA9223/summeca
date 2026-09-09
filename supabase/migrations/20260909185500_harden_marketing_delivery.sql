-- Keep marketing delivery idempotent and restrict log status values.
-- Production was checked for duplicate campaign/user rows before this migration.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campaign_logs_campaign_user_unique'
      and conrelid = 'public.campaign_logs'::regclass
  ) then
    alter table public.campaign_logs
      add constraint campaign_logs_campaign_user_unique unique (campaign_id, user_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'campaign_logs_email_status_check'
      and conrelid = 'public.campaign_logs'::regclass
  ) then
    alter table public.campaign_logs
      add constraint campaign_logs_email_status_check
      check (email_status in ('queued', 'sent', 'failed'));
  end if;
end $$;
