-- Public catalog consumers may only see plans that are active AND whose parent
-- product is published. Admin policies remain unchanged.

drop policy if exists public_read_product_plans on public.product_plans;
create policy public_read_product_plans
on public.product_plans
for select
to public
using (
  is_active = true
  and exists (
    select 1
    from public.products p
    where p.id = product_plans.product_id
      and p.status = 'active'::public.product_status
  )
);
