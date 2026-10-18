-- Give only users whose JWT app_metadata.role is admin read access to customer orders.
-- Orders and order items remain inaccessible to anon and non-admin authenticated users.
grant select on table public.store_orders, public.store_order_items to authenticated;

drop policy if exists "Admins can read store orders" on public.store_orders;
create policy "Admins can read store orders"
on public.store_orders
for select
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can read store order items" on public.store_order_items;
create policy "Admins can read store order items"
on public.store_order_items
for select
to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
