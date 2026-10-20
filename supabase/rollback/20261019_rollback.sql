-- Roll back the 2026-10 storefront rollout to the earlier YAROPLUGG schema.
-- Applied live through Supabase MCP on 2026-10-19 after verifying:
--   store_orders, store_order_items, store_order_status_history, reviews are empty;
--   products/categories match backup_20261019 exactly after excluding rollout columns.
-- The backup_20261019 schema is intentionally retained.
-- This removes rollout-only schema and restores the legacy Telegram-only order RPC.
-- To recover removed catalog fields, use the retained backup snapshot; dropped review/history
-- tables were empty. Existing order data was zero at rollback time.
begin;
drop trigger if exists sync_resale_product_status_before_update on public.products;
drop function if exists public.sync_resale_product_status();
drop function if exists public.admin_update_store_order(uuid,text,text,text);
drop function if exists public.create_store_order(uuid,text,text,jsonb,integer,bigint,text,text,text,text,text,text,text,text,text,text,text,boolean);
drop table if exists public.store_order_status_history;
drop table if exists public.reviews;
alter table public.products drop column if exists brand, drop column if exists condition, drop column if exists size_label, drop column if exists measurements, drop column if exists defects, drop column if exists resale_status, drop column if exists thumbnail_urls;
alter table public.categories drop column if exists category_type, drop column if exists name_ru, drop column if exists name_et, drop column if exists name_en;
alter table public.store_orders drop constraint if exists store_orders_contact_type_check, drop constraint if exists store_orders_payment_status_check, drop constraint if exists store_orders_source_check, drop constraint if exists store_orders_status_check;
alter table public.store_orders drop column if exists contact_type, drop column if exists contact_value, drop column if exists delivery_method, drop column if exists delivery_city, drop column if exists delivery_address, drop column if exists comment, drop column if exists source, drop column if exists language, drop column if exists payment_status, drop column if exists stock_reserved, drop column if exists ip_hash, drop column if exists contact_hash, drop column if exists terms_accepted_at, drop column if exists manager_note;
alter table public.store_orders alter column phone set not null;
alter table public.store_orders alter column status set default 'pending_payment';
alter table public.store_orders add constraint store_orders_status_check check(status='pending_payment');
revoke all on table public.store_orders, public.store_order_items from anon,authenticated;
grant select on table public.store_orders, public.store_order_items to authenticated;
grant update(fulfillment_status) on table public.store_orders to authenticated;
grant delete on table public.store_orders to authenticated;
commit;

-- Restore the anti-spam 7-argument create_store_order RPC from the baseline migration:
-- Apply the same order limits to the verified Telegram ID and verified username.
-- Limits: at most 3 new orders in 10 minutes and 10 in 24 hours.
create index if not exists store_orders_telegram_username_created_at_idx
  on public.store_orders (lower(telegram_username), created_at desc)
  where telegram_username is not null;

create or replace function public.create_store_order(
  p_idempotency_key uuid,
  p_customer_name text,
  p_phone text,
  p_items jsonb,
  p_total_cents integer,
  p_telegram_user_id bigint,
  p_telegram_username text
) returns table(order_id uuid, order_number bigint, total_cents integer, status text, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order_number bigint;
  v_total_cents integer;
  v_status text;
  v_existing_telegram_user_id bigint;
  v_recent_count bigint;
  v_daily_count bigint;
  v_username text;
  v_lock_key_one text;
  v_lock_key_two text;
begin
  if p_telegram_user_id is null or p_telegram_user_id <= 0 then
    raise exception 'INVALID_TELEGRAM_USER_ID' using errcode = 'P0001';
  end if;

  v_username := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_telegram_username, ''))), '');

  -- Lock both verified identity keys in a stable order to prevent parallel requests bypassing limits.
  if v_username is null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('telegram-id:' || p_telegram_user_id::text, 0)
    );
  else
    if ('telegram-id:' || p_telegram_user_id::text) < ('telegram-username:' || v_username) then
      v_lock_key_one := 'telegram-id:' || p_telegram_user_id::text;
      v_lock_key_two := 'telegram-username:' || v_username;
    else
      v_lock_key_one := 'telegram-username:' || v_username;
      v_lock_key_two := 'telegram-id:' || p_telegram_user_id::text;
    end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_lock_key_one, 0));
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_lock_key_two, 0));
  end if;

  -- Idempotent retries return the same order and do not consume the rate limit.
  select o.id, o.order_number, o.total_cents, o.status, o.telegram_user_id
    into v_order_id, v_order_number, v_total_cents, v_status, v_existing_telegram_user_id
    from public.store_orders as o
    where o.idempotency_key = p_idempotency_key;
  if found then
    if v_existing_telegram_user_id is distinct from p_telegram_user_id then
      raise exception 'ORDER_IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
    end if;
    return query select v_order_id, v_order_number, v_total_cents, v_status, false;
    return;
  end if;

  select
    count(*) filter (where o.created_at >= now() - interval '10 minutes'),
    count(*) filter (where o.created_at >= now() - interval '24 hours')
    into v_recent_count, v_daily_count
    from public.store_orders as o
    where o.telegram_user_id = p_telegram_user_id
      or (v_username is not null and pg_catalog.lower(o.telegram_username) = v_username);

  if v_recent_count >= 3 or v_daily_count >= 10 then
    raise exception 'ORDER_RATE_LIMITED' using errcode = 'P0001';
  end if;

  insert into public.store_orders (
    idempotency_key, customer_name, phone, total_cents, telegram_user_id, telegram_username
  ) values (
    p_idempotency_key, pg_catalog.btrim(p_customer_name), pg_catalog.btrim(p_phone), p_total_cents,
    p_telegram_user_id, v_username
  )
  on conflict (idempotency_key) do nothing
  returning id, store_orders.order_number into v_order_id, v_order_number;

  if v_order_id is null then
    select o.id, o.order_number, o.total_cents, o.status, o.telegram_user_id
      into v_order_id, v_order_number, v_total_cents, v_status, v_existing_telegram_user_id
      from public.store_orders as o
      where o.idempotency_key = p_idempotency_key;
    if v_existing_telegram_user_id is distinct from p_telegram_user_id then
      raise exception 'ORDER_IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
    end if;
    return query select v_order_id, v_order_number, v_total_cents, v_status, false;
    return;
  end if;

  insert into public.store_order_items(order_id, product_id, product_name, unit_price_cents, quantity, size, color, length)
  select v_order_id, (item->>'product_id')::uuid, item->>'product_name',
    (item->>'unit_price_cents')::integer, (item->>'quantity')::integer,
    nullif(item->>'size',''), nullif(item->>'color',''), nullif(item->>'length','')
  from jsonb_array_elements(p_items) as x(item);

  return query select v_order_id, v_order_number, p_total_cents, 'pending_payment'::text, true;
end;
$$;

revoke all on function public.create_store_order(uuid,text,text,jsonb,integer,bigint,text) from public,anon,authenticated;
grant execute on function public.create_store_order(uuid,text,text,jsonb,integer,bigint,text) to service_role;
