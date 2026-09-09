-- Create support tickets and their initial user message atomically.
-- The function runs with the caller's privileges so existing RLS policies remain authoritative.

create or replace function public.create_support_ticket_with_message(
  p_subject text,
  p_message text,
  p_category text default 'general',
  p_priority text default 'normal',
  p_order_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_ticket_id uuid;
  v_subject text := btrim(coalesce(p_subject, ''));
  v_message text := btrim(coalesce(p_message, ''));
  v_category text := coalesce(nullif(btrim(p_category), ''), 'general');
  v_priority text := coalesce(nullif(btrim(p_priority), ''), 'normal');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if v_subject = '' or char_length(v_subject) > 200 then
    raise exception 'Invalid support ticket subject' using errcode = '22023';
  end if;

  if v_message = '' or char_length(v_message) > 5000 then
    raise exception 'Invalid support ticket message' using errcode = '22023';
  end if;

  if v_category not in ('general', 'billing', 'technical', 'orders', 'subscriptions', 'refunds', 'other') then
    raise exception 'Invalid support ticket category' using errcode = '22023';
  end if;

  if v_priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'Invalid support ticket priority' using errcode = '22023';
  end if;

  if p_order_id is not null and not exists (
    select 1 from public.orders o where o.id = p_order_id and o.user_id = v_user_id
  ) then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  insert into public.support_tickets (
    user_id,
    subject,
    category,
    priority,
    status,
    order_id
  ) values (
    v_user_id,
    v_subject,
    v_category,
    v_priority,
    'open',
    p_order_id
  )
  returning id into v_ticket_id;

  insert into public.ticket_messages (
    ticket_id,
    sender_id,
    sender_type,
    message
  ) values (
    v_ticket_id,
    v_user_id,
    'user',
    v_message
  );

  return v_ticket_id;
end;
$$;

revoke all on function public.create_support_ticket_with_message(text, text, text, text, uuid) from public, anon;
grant execute on function public.create_support_ticket_with_message(text, text, text, text, uuid) to authenticated;
