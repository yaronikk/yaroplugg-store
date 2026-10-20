-- Run only against a disposable or staging database after applying release/v2 migrations.
-- This transaction creates temporary fixtures and rolls them back at the end.
begin;

do $$
declare
  v_product_id uuid:=gen_random_uuid();
  v_order_id uuid:=gen_random_uuid();
begin
  insert into public.products(id,name,slug,price,stock,is_active,is_sold,resale_status)
    values(v_product_id,'RLS test product','rls-test-'||v_product_id::text,1,1,false,false,'available');
  insert into public.store_orders(id,idempotency_key,customer_name,total_cents,status,contact_type,contact_value,source,language,payment_status,stock_reserved)
    values(v_order_id,gen_random_uuid(),'RLS Test',100,'new','email','test@example.invalid','web','en','pending_payment',false);
  insert into public.store_order_items(order_id,product_id,product_name,unit_price_cents,quantity)
    values(v_order_id,v_product_id,'RLS test product',100,1);
  insert into public.store_order_status_history(order_id,old_status,new_status,old_payment_status,new_payment_status)
    values(v_order_id,'new','new','pending_payment','pending_payment');
  perform set_config('release_test.product_id',v_product_id::text,true);
  perform set_config('release_test.order_id',v_order_id::text,true);
end $$;

set local role anon;
do $$
declare v_ok boolean;
begin
  begin
    perform 1 from public.store_orders where id=current_setting('release_test.order_id')::uuid;
    v_ok:=not found;
  exception when insufficient_privilege then v_ok:=true;
  end;
  if not v_ok then raise exception 'anon can read store_orders'; end if;
  begin
    perform 1 from public.store_order_items where order_id=current_setting('release_test.order_id')::uuid;
    v_ok:=not found;
  exception when insufficient_privilege then v_ok:=true;
  end;
  if not v_ok then raise exception 'anon can read store_order_items'; end if;
  begin
    perform 1 from public.store_order_status_history where order_id=current_setting('release_test.order_id')::uuid;
    v_ok:=not found;
  exception when insufficient_privilege then v_ok:=true;
  end;
  if not v_ok then raise exception 'anon can read order history'; end if;
  select not exists(select 1 from public.products where id=current_setting('release_test.product_id')::uuid)
    into v_ok;
  if not v_ok then raise exception 'anon can read hidden products'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated","app_metadata":{"role":"customer"}}',true);
do $$
declare v_denied boolean:=false;
begin
  begin
    perform public.admin_update_store_order(current_setting('release_test.order_id')::uuid,'cancelled',null,null);
  exception when insufficient_privilege then v_denied:=true;
  end;
  if not v_denied then raise exception 'non-admin called admin_update_store_order'; end if;
end $$;

select set_config('request.jwt.claims','{"role":"authenticated","app_metadata":{"role":"admin"}}',true);
do $$
declare v_visible boolean;
begin
  select exists(select 1 from public.store_orders where id=current_setting('release_test.order_id')::uuid)
    into v_visible;
  if not v_visible then raise exception 'admin cannot read store_orders'; end if;
  select exists(select 1 from public.store_order_items where order_id=current_setting('release_test.order_id')::uuid)
    into v_visible;
  if not v_visible then raise exception 'admin cannot read store_order_items'; end if;
  select exists(select 1 from public.store_order_status_history where order_id=current_setting('release_test.order_id')::uuid)
    into v_visible;
  if not v_visible then raise exception 'admin cannot read order history'; end if;
  perform public.admin_update_store_order(current_setting('release_test.order_id')::uuid,'contacted',null,null);
end $$;

reset role;
rollback;
