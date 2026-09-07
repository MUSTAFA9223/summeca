-- Defense-in-depth protection for the privileged user_profiles.is_admin flag.
-- The existing protect_user_privileged_fields trigger remains in place and
-- protects additional privileged fields. This private trigger independently
-- ensures a regular authenticated user cannot self-promote by updating their
-- own profile row.

create or replace function private.protect_user_profile_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_admin is distinct from old.is_admin then
    if coalesce((select auth.role()), '') <> 'service_role'
       and not coalesce((select private.is_admin()), false) then
      raise exception 'Only administrators may change is_admin.' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_user_profile_admin_flag on public.user_profiles;
create trigger protect_user_profile_admin_flag
before update of is_admin on public.user_profiles
for each row
execute function private.protect_user_profile_admin_flag();
