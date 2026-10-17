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
