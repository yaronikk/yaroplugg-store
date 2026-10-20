-- Browser checkout, contact-based abuse limits, atomic stock reservation, and admin lifecycle.
alter table public.store_orders alter column phone drop not null;
alter table public.store_orders drop constraint if exists store_orders_phone_check;
alter table public.store_orders drop constraint if exists store_orders_status_check;
alter table public.store_orders
  add column if not exists contact_type text,
  add column if not exists contact_value text,
  add column if not exists comment text,
  add column if not exists source text,
  add column if not exists language text,
  add column if not exists payment_status text,
  add column if not exists stock_reserved boolean,
  add column if not exists ip_hash text,
  add column if not exists contact_hash text,
  add column if not exists terms_accepted_at timestamptz;

update public.store_orders set
  contact_type = coalesce(contact_type, case when nullif(phone, '') is not null then 'phone' when nullif(telegram_username, '') is not null then 'telegram' else 'telegram' end),
  contact_value = coalesce(contact_value, nullif(phone, ''), nullif(telegram_username, ''), ''),
  source = coalesce(source, 'miniapp'),
  language = coalesce(language, 'en'),
  payment_status = coalesce(payment_status, 'pending_payment'),
  stock_reserved = coalesce(stock_reserved, false),
  status = case when status = 'pending_payment' then 'new' else status end;

alter table public.store_orders alter column contact_type set not null;
alter table public.store_orders alter column contact_value set not null;
alter table public.store_orders alter column status set default 'new';
alter table public.store_orders alter column source set default 'web';
alter table public.store_orders alter column source set not null;
alter table public.store_orders alter column language set default 'en';
alter table public.store_orders alter column language set not null;
alter table public.store_orders alter column payment_status set default 'pending_payment';
alter table public.store_orders alter column payment_status set not null;
alter table public.store_orders alter column stock_reserved set default false;
alter table public.store_orders alter column stock_reserved set not null;
alter table public.store_orders drop constraint if exists store_orders_status_check;
alter table public.store_orders add constraint store_orders_status_check
  check (status in ('new','contacted','reserved','shipped','completed','cancelled'));
alter table public.store_orders drop constraint if exists store_orders_payment_status_check;
alter table public.store_orders add constraint store_orders_payment_status_check
  check (payment_status in ('pending_payment','paid','refunded'));
alter table public.store_orders drop constraint if exists store_orders_contact_type_check;
alter table public.store_orders add constraint store_orders_contact_type_check
  check (contact_type in ('telegram','phone','email'));
alter table public.store_orders drop constraint if exists store_orders_source_check;
alter table public.store_orders add constraint store_orders_source_check check (source in ('miniapp','web'));
create index if not exists store_orders_contact_created_at_idx on public.store_orders(contact_hash, created_at desc);
create index if not exists store_orders_ip_created_at_idx on public.store_orders(ip_hash, created_at desc);

drop function if exists public.create_store_order(uuid, text, text, jsonb, integer, bigint, text);
drop function if exists public.create_store_order(uuid, text, text, jsonb, integer);
drop function if exists public.create_store_order(uuid,text,text,jsonb,integer,bigint,text,text,text,text,text,text,text,text,text,text,text,boolean);

create function public.create_store_order(
  p_idempotency_key uuid, p_customer_name text, p_phone text, p_items jsonb, p_total_cents integer,
  p_telegram_user_id bigint, p_telegram_username text, p_contact_type text, p_contact_value text,
  p_comment text, p_source text, p_language text, p_ip_hash text, p_contact_hash text, p_terms_accepted boolean
) returns table(order_id uuid, order_number bigint, total_cents integer, status text, payment_status text, created boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_order_id uuid; v_order_number bigint; v_total_cents integer; v_status text; v_payment_status text;
  v_existing_telegram_user_id bigint; v_existing_contact_hash text;
  v_recent_count bigint; v_daily_count bigint; v_product record; v_requested integer;
begin
  perform public.release_stale_reservations();
  perform public.anonymize_old_orders();
  if p_source not in ('web','miniapp') or p_contact_type not in ('telegram','phone','email') or not p_terms_accepted
     or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>5
     or (select coalesce(sum((item->>'quantity')::integer),0) from jsonb_array_elements(p_items) x(item))>5 then
    raise exception 'INVALID_ORDER' using errcode='P0001';
  end if;
  -- Acquire stable, sorted identity locks to serialize concurrent submissions.
  for v_product in
    select distinct lock_key from unnest(array[
      coalesce(p_ip_hash,''), coalesce(p_contact_hash,''), coalesce(p_telegram_user_id::text,'')
    ]) as identities(lock_key) where lock_key <> '' order by lock_key
  loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_product.lock_key,0));
  end loop;

  select o.id,o.order_number,o.total_cents,o.status,o.payment_status,o.telegram_user_id,o.contact_hash
    into v_order_id,v_order_number,v_total_cents,v_status,v_payment_status,v_existing_telegram_user_id,v_existing_contact_hash
    from public.store_orders o where o.idempotency_key=p_idempotency_key;
  if found then
    if v_existing_telegram_user_id is distinct from p_telegram_user_id or v_existing_contact_hash is distinct from p_contact_hash then
      raise exception 'ORDER_IDEMPOTENCY_CONFLICT' using errcode='P0001';
    end if;
    return query select v_order_id,v_order_number,v_total_cents,v_status,v_payment_status,false; return;
  end if;

  select count(*) filter(where created_at>=now()-interval '10 minutes'),count(*) filter(where created_at>=now()-interval '24 hours')
    into v_recent_count,v_daily_count from public.store_orders o
    where (p_ip_hash is not null and o.ip_hash=p_ip_hash)
       or (p_contact_hash is not null and o.contact_hash=p_contact_hash)
       or (p_telegram_user_id is not null and o.telegram_user_id=p_telegram_user_id);
  if v_recent_count>=3 or v_daily_count>=10 then raise exception 'ORDER_RATE_LIMITED' using errcode='P0001'; end if;

  insert into public.store_orders(idempotency_key,customer_name,phone,total_cents,telegram_user_id,telegram_username,
    contact_type,contact_value,comment,source,language,payment_status,stock_reserved,
    ip_hash,contact_hash,terms_accepted_at)
  values(p_idempotency_key,trim(p_customer_name),case when p_contact_type='phone' then trim(p_contact_value) else null end,
    p_total_cents,p_telegram_user_id,nullif(trim(coalesce(p_telegram_username,'')),''),p_contact_type,trim(p_contact_value),
    nullif(trim(coalesce(p_comment,'')),''),p_source,p_language,'pending_payment',true,p_ip_hash,p_contact_hash,now())
  returning id,store_orders.order_number into v_order_id,v_order_number;

  for v_product in
    select distinct (item->>'product_id')::uuid as product_id from jsonb_array_elements(p_items) x(item) order by product_id
  loop
    perform 1 from public.products p where p.id=v_product.product_id for update;
    if not found then raise exception 'PRODUCT_UNAVAILABLE' using errcode='P0001'; end if;
    select coalesce(sum((item->>'quantity')::integer),0)::integer into v_requested
      from jsonb_array_elements(p_items) x(item) where (item->>'product_id')::uuid=v_product.product_id;
    if not exists(select 1 from public.products p where p.id=v_product.product_id and p.is_active=true and p.stock>=v_requested) then
      raise exception 'INSUFFICIENT_STOCK' using errcode='P0001';
    end if;
    if exists(select 1 from jsonb_array_elements(p_items) x(item) join public.products p on p.id=(item->>'product_id')::uuid
      where p.id=v_product.product_id and round(p.price*100)::integer<>(item->>'unit_price_cents')::integer) then
      raise exception 'PRICE_CHANGED' using errcode='P0001';
    end if;
    update public.products set stock=stock-v_requested where id=v_product.product_id;
  end loop;
  insert into public.store_order_items(order_id,product_id,product_name,unit_price_cents,quantity,size,color,length)
  select v_order_id,(item->>'product_id')::uuid,item->>'product_name',(item->>'unit_price_cents')::integer,
    (item->>'quantity')::integer,nullif(item->>'size',''),nullif(item->>'color',''),nullif(item->>'length','')
  from jsonb_array_elements(p_items) x(item);
  return query select v_order_id,v_order_number,p_total_cents,'new'::text,'pending_payment'::text,true;
end $$;
revoke all on function public.create_store_order(uuid,text,text,jsonb,integer,bigint,text,text,text,text,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.create_store_order(uuid,text,text,jsonb,integer,bigint,text,text,text,text,text,text,text,text,boolean) to service_role;

create or replace function public.admin_update_store_order(p_order_id uuid,p_status text default null,p_payment_status text default null)
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
    (v_old_status='new' and p_status='contacted') or
    (v_old_status='contacted' and p_status='reserved') or
    (v_old_status='reserved' and p_status='shipped') or
    (v_old_status='shipped' and p_status='completed')
  ) then raise exception 'INVALID_STATUS_TRANSITION'; end if;
  if v_old_status='completed' and p_status='cancelled' then raise exception 'COMPLETED_ORDER_CANNOT_BE_CANCELLED'; end if;
  if p_status='cancelled' and v_old_status<>'cancelled' and v_stock_reserved then
    for v_item in select product_id,sum(quantity)::integer as quantity from public.store_order_items where order_id=p_order_id group by product_id order by product_id loop
      update public.products set stock=stock+v_item.quantity where id=v_item.product_id;
    end loop;
  end if;
  if p_status is not null then update public.store_orders set status=p_status where id=p_order_id; end if;
  if p_payment_status is not null then update public.store_orders set payment_status=p_payment_status where id=p_order_id; end if;
end $$;
revoke all on function public.admin_update_store_order(uuid,text,text) from public,anon;
grant execute on function public.admin_update_store_order(uuid,text,text) to authenticated;
