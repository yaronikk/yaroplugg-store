alter table public.products add column if not exists thumbnail_urls text[] not null default '{}';
alter table public.store_orders add column if not exists manager_note text not null default '';

create table if not exists public.store_order_status_history (
 id bigint generated always as identity primary key,
 order_id uuid not null references public.store_orders(id) on delete cascade,
 old_status text,
 new_status text,
 old_payment_status text,
 new_payment_status text,
 changed_by uuid references auth.users(id) on delete set null,
 changed_at timestamptz not null default now()
);
alter table public.store_order_status_history enable row level security;
grant select on public.store_order_status_history to authenticated;
drop policy if exists "Admins can read order status history" on public.store_order_status_history;
create policy "Admins can read order status history" on public.store_order_status_history for select to authenticated
using ((select auth.jwt()->'app_metadata'->>'role')='admin');
revoke insert,update,delete on public.store_order_status_history from anon,authenticated;

drop function if exists public.admin_update_store_order(uuid,text,text);
create function public.admin_update_store_order(p_order_id uuid,p_status text default null,p_payment_status text default null,p_manager_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_old_status text; v_old_payment text; v_stock_reserved boolean; v_item record;
begin
  if coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  select status,payment_status,stock_reserved into v_old_status,v_old_payment,v_stock_reserved from public.store_orders where id=p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode='P0002'; end if;
  if p_status is not null and p_status not in ('new','contacted','reserved','shipped','completed','cancelled') then raise exception 'INVALID_STATUS'; end if;
  if p_payment_status is not null and p_payment_status not in ('pending_payment','paid','refunded') then raise exception 'INVALID_PAYMENT_STATUS'; end if;
  if p_payment_status='paid' and v_old_payment<>'pending_payment' then raise exception 'INVALID_PAYMENT_TRANSITION'; end if;
  if p_payment_status='refunded' and v_old_payment<>'paid' then raise exception 'INVALID_PAYMENT_TRANSITION'; end if;
  if v_old_status='cancelled' and p_status is not null and p_status<>'cancelled' then raise exception 'CANCELLED_ORDER_IS_FINAL'; end if;
  if p_status is not null and p_status<>v_old_status and p_status<>'cancelled' and not (
    (v_old_status='new' and p_status='contacted') or (v_old_status='contacted' and p_status='reserved') or
    (v_old_status='reserved' and p_status='shipped') or (v_old_status='shipped' and p_status='completed')
  ) then raise exception 'INVALID_STATUS_TRANSITION'; end if;
  if v_old_status='completed' and p_status='cancelled' then raise exception 'COMPLETED_ORDER_CANNOT_BE_CANCELLED'; end if;
  if p_status='cancelled' and v_old_status<>'cancelled' and v_stock_reserved then
    for v_item in select product_id,sum(quantity)::integer as quantity from public.store_order_items where order_id=p_order_id group by product_id order by product_id loop
      update public.products set stock=stock+v_item.quantity where id=v_item.product_id;
    end loop;
    update public.store_orders set stock_reserved=false where id=p_order_id;
  end if;
  if p_status is not null then update public.store_orders set status=p_status where id=p_order_id; end if;
  if p_payment_status is not null then update public.store_orders set payment_status=p_payment_status where id=p_order_id; end if;
  if p_manager_note is not null then update public.store_orders set manager_note=left(trim(p_manager_note),4000) where id=p_order_id; end if;
  if (p_status is not null and p_status<>v_old_status) or (p_payment_status is not null and p_payment_status<>v_old_payment) then
    insert into public.store_order_status_history(order_id,old_status,new_status,old_payment_status,new_payment_status,changed_by)
    values(p_order_id,v_old_status,coalesce(p_status,v_old_status),v_old_payment,coalesce(p_payment_status,v_old_payment),auth.uid());
  end if;
end $$;
revoke all on function public.admin_update_store_order(uuid,text,text,text) from public,anon;
grant execute on function public.admin_update_store_order(uuid,text,text,text) to authenticated;

-- Admins change order state only through the RPC; direct table mutations stay closed.
drop policy if exists "Admins can delete store orders" on public.store_orders;
drop policy if exists "Admins can update order fulfillment" on public.store_orders;
revoke delete,update on public.store_orders from anon,authenticated;
revoke delete on public.store_orders from public;
revoke insert,update,delete on public.store_order_items from anon,authenticated;
revoke all on public.store_order_status_history from anon,public;

create or replace function public.release_stale_reservations()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_order record;
  v_item record;
  v_released integer:=0;
  v_hold_time constant interval:=interval '48 hours';
begin
  for v_order in
    select id,status,payment_status,stock_reserved
      from public.store_orders
      where status='new' and created_at<=now()-v_hold_time
      order by created_at,id for update skip locked
  loop
    if v_order.stock_reserved then
      for v_item in
        select product_id,sum(quantity)::integer as quantity from public.store_order_items
          where order_id=v_order.id group by product_id order by product_id
      loop
        update public.products set stock=stock+v_item.quantity where id=v_item.product_id;
      end loop;
    end if;
    update public.store_orders set status='cancelled',stock_reserved=false where id=v_order.id;
    insert into public.store_order_status_history(order_id,old_status,new_status,old_payment_status,new_payment_status,changed_by)
      values(v_order.id,v_order.status,'cancelled',v_order.payment_status,v_order.payment_status,null);
    v_released:=v_released+1;
  end loop;
  return v_released;
end $$;
revoke all on function public.release_stale_reservations() from public,anon,authenticated;
grant execute on function public.release_stale_reservations() to service_role;

create or replace function public.anonymize_old_orders()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_retention constant interval:=interval '12 months';
  v_count integer;
begin
  update public.store_orders
    set customer_name='Customer',phone=null,telegram_user_id=null,telegram_username=null,
        contact_value='',contact_hash=null,ip_hash=null,comment=null,manager_note=''
    where status in ('completed','cancelled') and created_at<now()-v_retention
      and (contact_value<>'' or phone is not null or telegram_user_id is not null or comment is not null or manager_note<>'');
  get diagnostics v_count=row_count;
  return v_count;
end $$;
revoke all on function public.anonymize_old_orders() from public,anon,authenticated;
grant execute on function public.anonymize_old_orders() to service_role;

create or replace function public.admin_release_stale_reservations()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' then raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  v_count:=public.release_stale_reservations();
  perform public.anonymize_old_orders();
  return v_count;
end $$;
revoke all on function public.admin_release_stale_reservations() from public,anon;
grant execute on function public.admin_release_stale_reservations() to authenticated;

-- Use pg_cron when installed. The order RPC and admin panel also run the
-- maintenance functions lazily when this extension is unavailable.
do $$
declare v_job_id bigint;
begin
  if exists(select 1 from pg_catalog.pg_extension where extname='pg_cron') then
    execute 'select jobid from cron.job where jobname=$1' into v_job_id using 'release-stale-reservations';
    if v_job_id is not null then execute 'select cron.unschedule($1)' using v_job_id; end if;
    execute 'select cron.schedule($1,$2,$3)' using 'release-stale-reservations','0 * * * *','select public.release_stale_reservations()';
    v_job_id:=null;
    execute 'select jobid from cron.job where jobname=$1' into v_job_id using 'anonymize-old-orders';
    if v_job_id is not null then execute 'select cron.unschedule($1)' using v_job_id; end if;
    execute 'select cron.schedule($1,$2,$3)' using 'anonymize-old-orders','20 3 * * *','select public.anonymize_old_orders()';
  end if;
end $$;
