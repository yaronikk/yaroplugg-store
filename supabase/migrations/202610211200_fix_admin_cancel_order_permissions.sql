-- Ensure admins can cancel (delete) orders from the admin panel.
-- Order line items already use ON DELETE CASCADE.
grant delete on public.store_orders to authenticated;

drop policy if exists "Admins can delete store orders" on public.store_orders;
create policy "Admins can delete store orders"
  on public.store_orders
  for delete
  to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
