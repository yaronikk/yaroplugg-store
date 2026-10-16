-- Store verified Telegram identity with each new order and limit order spam.
alter table public.store_orders
  add column if not exists telegram_user_id bigint,
  add column if not exists telegram_username text;

create index if not exists store_orders_telegram_user_created_at_idx
  on public.store_orders (telegram_user_id, created_at desc);

-- The Edge Function needs server-only catalog reads to validate products and prices.
grant select on table public.products, public.categories to service_role;

drop function if exists public.create_store_order(uuid, text, text, jsonb, integer);

create function public.create_store_order(
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
begin
  if p_telegram_user_id is null or p_telegram_user_id <= 0 then
    raise exception 'INVALID_TELEGRAM_USER_ID' using errcode = 'P0001';
  end if;

  -- Serialize requests from one Telegram account so parallel clicks cannot bypass limits.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_telegram_user_id::text, 0));

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
    where o.telegram_user_id = p_telegram_user_id;

  if v_recent_count >= 3 or v_daily_count >= 10 then
    raise exception 'ORDER_RATE_LIMITED' using errcode = 'P0001';
  end if;

  insert into public.store_orders (
    idempotency_key, customer_name, phone, total_cents, telegram_user_id, telegram_username
  ) values (
    p_idempotency_key, trim(p_customer_name), trim(p_phone), p_total_cents,
    p_telegram_user_id, nullif(trim(coalesce(p_telegram_username, '')), '')
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

revoke all on function public.create_store_order(uuid, text, text, jsonb, integer, bigint, text) from public, anon, authenticated;
grant execute on function public.create_store_order(uuid, text, text, jsonb, integer, bigint, text) to service_role;
