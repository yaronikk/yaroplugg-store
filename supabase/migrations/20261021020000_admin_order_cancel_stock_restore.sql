-- Keep the transactional admin order action in source control.
-- Cancellation is a status change, not a delete: reserved inventory is restored
-- once under the order row lock and the order remains available for audit/history.
create or replace function public.admin_update_store_order(
  p_order_id uuid,
  p_status text default null,
  p_payment_status text default null,
  p_manager_note text default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_old_status text;
  v_old_payment text;
  v_stock_reserved boolean;
  v_item record;
begin
  if coalesce(auth.jwt()->'app_metadata'->>'role','') <> 'admin' then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select status, payment_status, stock_reserved
    into v_old_status, v_old_payment, v_stock_reserved
    from public.store_orders
    where id = p_order_id
    for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_status is not null and p_status not in ('new','contacted','reserved','shipped','completed','cancelled') then
    raise exception 'INVALID_STATUS';
  end if;
  if p_payment_status is not null and p_payment_status not in ('pending_payment','paid','refunded') then
    raise exception 'INVALID_PAYMENT_STATUS';
  end if;
  if p_payment_status = 'paid' and v_old_payment <> 'pending_payment' then
    raise exception 'INVALID_PAYMENT_TRANSITION';
  end if;
  if p_payment_status = 'refunded' and v_old_payment <> 'paid' then
    raise exception 'INVALID_PAYMENT_TRANSITION';
  end if;
  if v_old_status = 'cancelled' and p_status is not null and p_status <> 'cancelled' then
    raise exception 'CANCELLED_ORDER_IS_FINAL';
  end if;
  if p_status is not null and p_status <> v_old_status and p_status <> 'cancelled' and not (
    (v_old_status = 'new' and p_status = 'contacted') or
    (v_old_status = 'contacted' and p_status = 'reserved') or
    (v_old_status = 'reserved' and p_status = 'shipped') or
    (v_old_status = 'shipped' and p_status = 'completed')
  ) then
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;
  if v_old_status = 'completed' and p_status = 'cancelled' then
    raise exception 'COMPLETED_ORDER_CANNOT_BE_CANCELLED';
  end if;

  if p_status = 'cancelled' and v_old_status <> 'cancelled' and v_stock_reserved then
    for v_item in
      select product_id, sum(quantity)::integer as quantity
      from public.store_order_items
      where order_id = p_order_id
      group by product_id
      order by product_id
    loop
      update public.products
      set stock = stock + v_item.quantity
      where id = v_item.product_id;
    end loop;
    update public.store_orders set stock_reserved = false where id = p_order_id;
  end if;

  if p_status is not null then
    update public.store_orders set status = p_status where id = p_order_id;
  end if;
  if p_payment_status is not null then
    update public.store_orders set payment_status = p_payment_status where id = p_order_id;
  end if;
  if p_manager_note is not null then
    update public.store_orders set manager_note = left(trim(p_manager_note), 4000) where id = p_order_id;
  end if;

  if (p_status is not null and p_status <> v_old_status) or
     (p_payment_status is not null and p_payment_status <> v_old_payment) then
    insert into public.store_order_status_history(
      order_id, old_status, new_status, old_payment_status, new_payment_status, changed_by
    )
    values (
      p_order_id, v_old_status, coalesce(p_status, v_old_status),
      v_old_payment, coalesce(p_payment_status, v_old_payment), auth.uid()
    );
  end if;
end
$function$;

revoke all on function public.admin_update_store_order(uuid, text, text, text) from public, anon;
grant execute on function public.admin_update_store_order(uuid, text, text, text) to authenticated;
