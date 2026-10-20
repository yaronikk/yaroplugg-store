-- Order records for the existing products schema used by the storefront.
create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_name text not null check (length(trim(customer_name)) between 1 and 120),
  phone text not null check (length(trim(phone)) between 5 and 40),
  total_cents integer not null check (total_cents > 0),
  status text not null default 'pending_payment' check (status in ('pending_payment')),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid not null,
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity between 1 and 20),
  size text,
  color text,
  length text
);

alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;

-- Orders are created only by the Edge Function using the service role.
revoke all on public.store_orders, public.store_order_items from anon, authenticated;

create or replace function public.create_store_order(
  p_idempotency_key uuid,
  p_customer_name text,
  p_phone text,
  p_items jsonb,
  p_total_cents integer
) returns table(order_id uuid, order_number bigint, total_cents integer, status text, created boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_order_id uuid;
  v_order_number bigint;
begin
  insert into public.store_orders(idempotency_key, customer_name, phone, total_cents)
  values (p_idempotency_key, trim(p_customer_name), trim(p_phone), p_total_cents)
  on conflict (idempotency_key) do nothing
  returning id, store_orders.order_number into v_order_id, v_order_number;

  if v_order_id is null then
    return query select o.id, o.order_number, o.total_cents, o.status, false
      from public.store_orders o where o.idempotency_key = p_idempotency_key;
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

revoke all on function public.create_store_order(uuid, text, text, jsonb, integer) from public, anon, authenticated;
grant execute on function public.create_store_order(uuid, text, text, jsonb, integer) to service_role;
