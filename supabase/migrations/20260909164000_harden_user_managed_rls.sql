-- Restrict client-writable trust fields and move sensitive writes behind validated paths.

-- Reviews: customers may write content, never moderation or verification fields.
create or replace function public.enforce_review_trust_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  caller_id uuid := auth.uid();
  caller_role text := coalesce(auth.role(), '');
  caller_is_admin boolean := coalesce(public.is_admin(), false);
begin
  if caller_role = 'service_role' then
    return new;
  end if;

  if caller_is_admin then
    if tg_op = 'UPDATE' and new.moderation_status is distinct from old.moderation_status then
      new.moderated_at := now();
      new.moderated_by := caller_id;
    end if;
    if new.moderation_status <> 'approved' then
      new.is_featured := false;
    end if;
    return new;
  end if;

  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.user_id := caller_id;
    new.moderation_status := 'pending';
    new.is_featured := false;
    new.moderated_at := null;
    new.moderated_by := null;
    new.created_at := now();
    new.updated_at := now();

    if new.order_id is null then
      new.is_verified := false;
    elsif exists (
      select 1 from public.orders o
      where o.id = new.order_id
        and o.user_id = caller_id
        and o.product_id = new.product_id
        and o.status = 'completed'
    ) then
      new.is_verified := true;
    else
      raise exception 'Review order is not an eligible completed purchase' using errcode = '42501';
    end if;
  else
    new.user_id := old.user_id;
    new.product_id := old.product_id;
    new.order_id := old.order_id;
    new.is_verified := old.is_verified;
    new.is_featured := old.is_featured;
    new.created_at := old.created_at;

    if new.rating is distinct from old.rating
       or new.title is distinct from old.title
       or new.body is distinct from old.body
       or new.reviewer_name is distinct from old.reviewer_name then
      new.moderation_status := 'pending';
      new.is_featured := false;
      new.moderated_at := null;
      new.moderated_by := null;
    else
      new.moderation_status := old.moderation_status;
      new.moderated_at := old.moderated_at;
      new.moderated_by := old.moderated_by;
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.enforce_review_trust_fields() from public, anon, authenticated;
grant execute on function public.enforce_review_trust_fields() to postgres, service_role;

drop trigger if exists enforce_review_trust_fields_before_write on public.reviews;
create trigger enforce_review_trust_fields_before_write
before insert or update on public.reviews
for each row execute function public.enforce_review_trust_fields();

drop policy if exists users_manage_own_reviews on public.reviews;
drop policy if exists users_read_own_reviews on public.reviews;
drop policy if exists reviews_admin_all on public.reviews;

create policy users_read_own_reviews on public.reviews
for select to authenticated
using ((select auth.uid()) = user_id);

create policy users_create_own_reviews on public.reviews
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and moderation_status = 'pending'
  and is_featured = false
  and moderated_at is null
  and moderated_by is null
);

create policy users_update_own_reviews on public.reviews
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy users_delete_own_reviews on public.reviews
for delete to authenticated
using ((select auth.uid()) = user_id);

create policy reviews_admin_all on public.reviews
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Support: customer-created records cannot impersonate staff or alter workflow fields.
create or replace function public.enforce_support_ticket_trust_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  caller_id uuid := auth.uid();
begin
  if coalesce(auth.role(), '') = 'service_role' or coalesce(public.is_support_admin(), false) then
    return new;
  end if;
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.user_id := caller_id;
    new.status := 'open';
    new.created_at := now();
    new.updated_at := now();
    if new.order_id is not null and not exists (
      select 1 from public.orders o where o.id = new.order_id and o.user_id = caller_id
    ) then
      raise exception 'Order not found' using errcode = 'P0002';
    end if;
  else
    new.user_id := old.user_id;
    new.subject := old.subject;
    new.category := old.category;
    new.priority := old.priority;
    new.order_id := old.order_id;
    new.created_at := old.created_at;
    if new.status is distinct from old.status and new.status <> 'closed' then
      raise exception 'Customers may only close their own tickets' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.enforce_ticket_message_trust_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  caller_id uuid := auth.uid();
begin
  if coalesce(auth.role(), '') = 'service_role' or coalesce(public.is_support_admin(), false) then
    return new;
  end if;
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.support_tickets t
    where t.id = new.ticket_id and t.user_id = caller_id and t.status <> 'closed'
  ) then
    raise exception 'Ticket is unavailable' using errcode = '42501';
  end if;

  new.sender_id := caller_id;
  new.sender_type := 'user';
  new.created_at := now();
  return new;
end;
$function$;

revoke all on function public.enforce_support_ticket_trust_fields() from public, anon, authenticated;
revoke all on function public.enforce_ticket_message_trust_fields() from public, anon, authenticated;
grant execute on function public.enforce_support_ticket_trust_fields() to postgres, service_role;
grant execute on function public.enforce_ticket_message_trust_fields() to postgres, service_role;

drop trigger if exists enforce_support_ticket_trust_fields_before_write on public.support_tickets;
create trigger enforce_support_ticket_trust_fields_before_write
before insert or update on public.support_tickets
for each row execute function public.enforce_support_ticket_trust_fields();

drop trigger if exists enforce_ticket_message_trust_fields_before_insert on public.ticket_messages;
create trigger enforce_ticket_message_trust_fields_before_insert
before insert on public.ticket_messages
for each row execute function public.enforce_ticket_message_trust_fields();

drop policy if exists users_update_own_tickets on public.support_tickets;
create policy users_close_own_tickets on public.support_tickets
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id and status = 'closed');

create policy support_admin_update_tickets on public.support_tickets
for update to authenticated
using ((select public.is_support_admin()))
with check ((select public.is_support_admin()));

drop policy if exists users_send_ticket_messages on public.ticket_messages;
create policy users_send_own_ticket_messages on public.ticket_messages
for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and sender_type = 'user'
  and exists (
    select 1 from public.support_tickets t
    where t.id = ticket_messages.ticket_id
      and t.user_id = (select auth.uid())
      and t.status <> 'closed'
  )
);

create policy support_admin_send_ticket_messages on public.ticket_messages
for insert to authenticated
with check ((select public.is_support_admin()) and sender_type = 'admin');

-- Security logs and usage are server-written audit/billing records.
drop policy if exists users_insert_own_security_logs on public.user_security_logs;

drop policy if exists users_manage_own_usage on public.usage;
create policy users_read_own_usage on public.usage
for select to authenticated
using ((select auth.uid()) = user_id);
create policy usage_admin_all on public.usage
for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Coupon codes are validated server-side; customers cannot enumerate active codes.
drop policy if exists auth_read_coupons on public.coupons;

-- Referral master codes are created atomically by a validated RPC.
create or replace function public.generate_referral_code(user_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  code text;
  caller_id uuid := auth.uid();
begin
  if caller_id is null or user_id is distinct from caller_id then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select r.referral_code into code
  from public.referrals r
  where r.referrer_user_id = caller_id and r.referred_user_id is null
  limit 1;
  if code is not null then return code; end if;

  loop
    code := 'SUMM' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into public.referrals(referrer_user_id, referral_code, status)
      values (caller_id, code, 'pending');
      return code;
    exception when unique_violation then
      -- Retry only the generated-code collision; a concurrent master row is returned below.
      select r.referral_code into code
      from public.referrals r
      where r.referrer_user_id = caller_id and r.referred_user_id is null
      limit 1;
      if code is not null then return code; end if;
    end;
  end loop;
end;
$function$;

revoke all on function public.generate_referral_code(uuid) from public, anon;
grant execute on function public.generate_referral_code(uuid) to authenticated;
drop policy if exists referrals_insert_master_code on public.referrals;

-- Add data-shape constraints after confirming current production rows comply.
do $$
begin
  if not exists (select 1 from pg_constraint where conname='reviews_moderation_status_check' and conrelid='public.reviews'::regclass) then
    alter table public.reviews add constraint reviews_moderation_status_check check (moderation_status in ('pending','approved','rejected'));
  end if;
  if not exists (select 1 from pg_constraint where conname='reviews_content_length_check' and conrelid='public.reviews'::regclass) then
    alter table public.reviews add constraint reviews_content_length_check check (
      char_length(coalesce(title,'')) <= 200
      and char_length(coalesce(body,'')) <= 5000
      and char_length(coalesce(reviewer_name,'')) <= 100
    );
  end if;
  if not exists (select 1 from pg_constraint where conname='support_tickets_values_check' and conrelid='public.support_tickets'::regclass) then
    alter table public.support_tickets add constraint support_tickets_values_check check (
      char_length(subject) between 1 and 200
      and category in ('general','billing','technical','orders','subscriptions','refunds','other')
      and priority in ('low','normal','high','urgent')
      and status in ('open','pending','resolved','closed')
    );
  end if;
  if not exists (select 1 from pg_constraint where conname='ticket_messages_values_check' and conrelid='public.ticket_messages'::regclass) then
    alter table public.ticket_messages add constraint ticket_messages_values_check check (
      char_length(message) between 1 and 5000 and sender_type in ('user','admin')
    );
  end if;
end $$;
