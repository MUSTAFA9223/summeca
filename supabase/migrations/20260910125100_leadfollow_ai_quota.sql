begin;

create or replace function public.reserve_leadfollow_ai_request(
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

  insert into public.leadfollow_usage(user_id, period_start, requests_count, tokens_used, updated_at)
  values (p_user_id, p_period_start, 1, 0, now())
  on conflict (user_id, period_start)
  do update set
    requests_count = public.leadfollow_usage.requests_count + 1,
    updated_at = now()
  where public.leadfollow_usage.requests_count < p_limit
  returning requests_count into v_count;

  return v_count;
end;
$$;

create or replace function public.record_leadfollow_ai_tokens(
  p_user_id uuid,
  p_period_start date,
  p_tokens integer
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.leadfollow_usage
  set tokens_used = tokens_used + greatest(coalesce(p_tokens, 0), 0),
      updated_at = now()
  where user_id = p_user_id and period_start = p_period_start;
$$;

revoke all on function public.reserve_leadfollow_ai_request(uuid,date,integer) from public, anon, authenticated;
revoke all on function public.record_leadfollow_ai_tokens(uuid,date,integer) from public, anon, authenticated;
grant execute on function public.reserve_leadfollow_ai_request(uuid,date,integer) to service_role;
grant execute on function public.record_leadfollow_ai_tokens(uuid,date,integer) to service_role;

commit;
