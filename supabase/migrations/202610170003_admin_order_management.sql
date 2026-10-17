-- Separate fulfillment handling from payment state and restrict order access to admins.
alter table public.store_orders
  add column if not exists fulfillment_status text not null default 'pending'
  check (fulfillment_status in ('pending', 'completed', 'not_completed', 'cancelled'));

comment on column public.store_orders.fulfillment_status is
  'Admin-managed fulfillment state; payment status remains in store_orders.status.';

create index if not exists store_order_items_order_id_idx
  on public.store_order_items (order_id);

-- Keep order records private. Admins may read orders and items, and may only
-- update the fulfillment_status column from the browser.
revoke all on public.store_orders, public.store_order_items from anon, authenticated;
grant select on public.store_orders, public.store_order_items to authenticated;
grant update (fulfillment_status) on public.store_orders to authenticated;

drop policy if exists "Admins can read store orders" on public.store_orders;
create policy "Admins can read store orders"
  on public.store_orders
  for select
  to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update order fulfillment" on public.store_orders;
create policy "Admins can update order fulfillment"
  on public.store_orders
  for update
  to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can read store order items" on public.store_order_items;
create policy "Admins can read store order items"
  on public.store_order_items
  for select
  to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
