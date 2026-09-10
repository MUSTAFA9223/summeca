create or replace function public.finalize_manual_refund(
  p_refund_id uuid,
  p_admin_user_id uuid,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_refund public.refunds%rowtype;
  v_order public.orders%rowtype;
  v_now timestamptz := now();
  v_event_ref text;
begin
  select * into v_refund
  from public.refunds
  where id = p_refund_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Refund not found.');
  end if;

  if v_refund.status = 'completed' then
    return jsonb_build_object('ok', true, 'already_completed', true);
  end if;

  if v_refund.status <> 'processing' then
    return jsonb_build_object('ok', false, 'error', 'Refund must be processing before completion.');
  end if;

  select * into v_order
  from public.orders
  where id = v_refund.order_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Order not found.');
  end if;

  if v_order.status <> 'completed' then
    return jsonb_build_object('ok', false, 'error', 'Order is not eligible for refund completion.');
  end if;

  if coalesce(v_refund.amount, 0) <> coalesce(v_order.amount, 0)
     or upper(coalesce(v_refund.currency, '')) <> upper(coalesce(v_order.currency, '')) then
    return jsonb_build_object('ok', false, 'error', 'Refund amount or currency does not match the order.');
  end if;

  v_event_ref := 'manual-refund-' || v_refund.id::text;

  update public.refunds
  set status = 'completed',
      provider_refund_id = coalesce(provider_refund_id, v_event_ref),
      admin_note = coalesce(nullif(btrim(p_admin_note), ''), admin_note),
      reviewed_at = coalesce(reviewed_at, v_now),
      completed_at = coalesce(completed_at, v_now),
      updated_at = v_now
  where id = v_refund.id;

  update public.orders
  set status = 'refunded',
      updated_at = v_now
  where id = v_order.id;

  insert into public.payment_events (
    order_id,
    provider,
    event_type,
    provider_payment_ref,
    metadata
  ) values (
    v_order.id,
    'manual',
    'refunded',
    v_event_ref,
    jsonb_build_object(
      'refund_id', v_refund.id,
      'refund_amount', v_refund.amount,
      'currency', v_refund.currency,
      'completed_by', p_admin_user_id,
      'source', 'admin_manual_refund'
    )
  ) on conflict do nothing;

  update public.downloads
  set status = 'revoked',
      updated_at = v_now
  where order_id = v_order.id
    and status <> 'revoked';

  update public.subscriptions
  set status = 'cancelled',
      cancelled_at = coalesce(cancelled_at, v_now),
      current_period_end = least(coalesce(current_period_end, v_now), v_now),
      cancel_reason = coalesce(cancel_reason, 'Order refunded'),
      updated_at = v_now
  where order_id = v_order.id
    and status <> 'cancelled';

  return jsonb_build_object(
    'ok', true,
    'already_completed', false,
    'provider_refund_id', v_event_ref
  );
end;
$$;

revoke all on function public.finalize_manual_refund(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.finalize_manual_refund(uuid, uuid, text)
  to service_role;
