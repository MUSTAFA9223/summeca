begin;

create or replace function public.release_leadfollow_ai_request(
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
  update public.leadfollow_usage
  set requests_count = greatest(requests_count - 1, 0),
      updated_at = now()
  where user_id = p_user_id
    and period_start = p_period_start
  returning requests_count into v_count;

  return v_count;
end;
$$;

revoke all on function public.release_leadfollow_ai_request(uuid,date) from public, anon, authenticated;
grant execute on function public.release_leadfollow_ai_request(uuid,date) to service_role;

commit;
