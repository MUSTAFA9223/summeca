-- Restrict referral SECURITY DEFINER RPCs to the trusted server client.

create or replace function public.generate_referral_code(user_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  code text;
begin
  if coalesce(auth.role(), '') <> 'service_role' or user_id is null then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  select r.referral_code into code
  from public.referrals r
  where r.referrer_user_id = user_id and r.referred_user_id is null
  limit 1;
  if code is not null then return code; end if;

  loop
    code := 'SUMM' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into public.referrals(referrer_user_id, referral_code, status)
      values (user_id, code, 'pending');
      return code;
    exception when unique_violation then
      select r.referral_code into code
      from public.referrals r
      where r.referrer_user_id = user_id and r.referred_user_id is null
      limit 1;
      if code is not null then return code; end if;
    end;
  end loop;
end;
$function$;

revoke all on function public.generate_referral_code(uuid) from public, anon, authenticated;
grant execute on function public.generate_referral_code(uuid) to service_role;

drop function if exists public.claim_referral_code(text);

create function public.claim_referral_code_for_user(code text, user_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  normalized_code text := upper(trim(coalesce(code, '')));
  referrer uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' or user_id is null or normalized_code = '' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  select r.referrer_user_id into referrer
  from public.referrals r
  where r.referral_code = normalized_code and r.referred_user_id is null
  limit 1;

  if referrer is null or referrer = user_id then return false; end if;

  insert into public.referrals(referrer_user_id, referred_user_id, referral_code, status)
  values (referrer, user_id, normalized_code, 'registered')
  on conflict do nothing;

  return exists (
    select 1 from public.referrals r
    where r.referred_user_id = user_id and r.referrer_user_id = referrer
  );
end;
$function$;

revoke all on function public.claim_referral_code_for_user(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_referral_code_for_user(text, uuid) to service_role;
