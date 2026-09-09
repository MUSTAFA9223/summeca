-- Performance-only RLS hardening: evaluate auth.uid() once per statement rather than once per row.
-- Policy semantics and permitted roles/actions are intentionally unchanged.

alter policy ai_generations_user_insert on public.ai_generations
  with check ((user_id = (select auth.uid())) or is_admin());
alter policy ai_generations_user_select on public.ai_generations
  using ((user_id = (select auth.uid())) or is_admin());
alter policy ai_usage_user_select on public.ai_usage
  using ((user_id = (select auth.uid())) or is_admin());

alter policy users_read_own_downloads on public.downloads
  using (user_id = (select auth.uid()));
alter policy users_manage_own_notification_preferences on public.notification_preferences
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy users_delete_own_notifications on public.notifications
  using (user_id = (select auth.uid()));
alter policy users_read_own_notifications on public.notifications
  using (user_id = (select auth.uid()));
alter policy users_update_own_notifications on public.notifications
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy users_read_own_orders on public.orders
  using (user_id = (select auth.uid()));
alter policy users_read_own_payment_events on public.payment_events
  using (exists (
    select 1 from public.orders o
    where o.id = payment_events.order_id
      and o.user_id = (select auth.uid())
  ));
alter policy referrals_select_own on public.referrals
  using ((select auth.uid()) = referrer_user_id);
alter policy users_read_own_refunds on public.refunds
  using (user_id = (select auth.uid()));

alter policy users_insert_own_security_settings on public.security_settings
  with check (user_id = (select auth.uid()));
alter policy users_update_own_security_settings on public.security_settings
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy users_view_own_security_settings on public.security_settings
  using ((user_id = (select auth.uid())) or is_security_admin());

alter policy admin_full_sub_audit on public.subscription_audit_logs
  using (exists (
    select 1 from public.user_profiles
    where user_profiles.id = (select auth.uid())
      and user_profiles.is_admin = true
  ))
  with check (exists (
    select 1 from public.user_profiles
    where user_profiles.id = (select auth.uid())
      and user_profiles.is_admin = true
  ));
alter policy users_read_own_sub_audit on public.subscription_audit_logs
  using (subscription_id in (
    select subscriptions.id from public.subscriptions
    where subscriptions.user_id = (select auth.uid())
  ));
alter policy users_read_own_subscriptions on public.subscriptions
  using (user_id = (select auth.uid()));

alter policy users_create_own_tickets on public.support_tickets
  with check (user_id = (select auth.uid()));
alter policy users_view_own_tickets on public.support_tickets
  using ((user_id = (select auth.uid())) or is_support_admin());
alter policy users_view_ticket_messages on public.ticket_messages
  using (is_support_admin() or exists (
    select 1 from public.support_tickets t
    where t.id = ticket_messages.ticket_id
      and t.user_id = (select auth.uid())
  ));

alter policy users_read_own_user_profiles on public.user_profiles
  using (id = (select auth.uid()));
alter policy users_update_own_user_profiles on public.user_profiles
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
alter policy users_view_own_security_logs on public.user_security_logs
  using ((user_id = (select auth.uid())) or is_security_admin());

alter policy wishlist_admin_select on public.wishlist_items
  using (exists (
    select 1 from public.user_profiles
    where user_profiles.id = (select auth.uid())
      and user_profiles.is_admin = true
  ));
alter policy wishlist_delete_own on public.wishlist_items
  using ((select auth.uid()) = user_id);
alter policy wishlist_insert_own on public.wishlist_items
  with check ((select auth.uid()) = user_id);
alter policy wishlist_select_own on public.wishlist_items
  using ((select auth.uid()) = user_id);
