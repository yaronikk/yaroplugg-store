-- Cancelling an order removes it and its line items permanently.
-- Access remains restricted to authenticated admins by RLS.
alter table public.store_order_items
  drop constraint if exists store_order_items_order_id_fkey;

alter table public.store_order_items
  add constraint store_order_items_order_id_fkey
  foreign key (order_id)
  references public.store_orders (id)
  on delete cascade;

revoke delete on public.store_orders from anon, authenticated;
grant delete on public.store_orders to authenticated;

drop policy if exists "Admins can delete store orders" on public.store_orders;
create policy "Admins can delete store orders"
  on public.store_orders
  for delete
  to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
