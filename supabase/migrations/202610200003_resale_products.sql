-- Resale-specific product details and lifecycle.
alter table public.categories add column if not exists category_type text not null default 'clothing';
alter table public.categories drop constraint if exists categories_category_type_check;
alter table public.categories add constraint categories_category_type_check
  check (category_type in ('clothing','footwear','accessories'));

alter table public.products
  add column if not exists brand text not null default '',
  add column if not exists condition text not null default 'good',
  add column if not exists size_label text not null default '',
  add column if not exists measurements text not null default '',
  add column if not exists defects text not null default '',
  add column if not exists resale_status text not null default 'available';

alter table public.products drop constraint if exists products_condition_check;
alter table public.products add constraint products_condition_check
  check (condition in ('new_with_tags','excellent','good','defects'));
alter table public.products drop constraint if exists products_resale_status_check;
alter table public.products add constraint products_resale_status_check
  check (resale_status in ('available','reserved','sold'));
create index if not exists products_resale_status_idx on public.products(resale_status, sort_order, created_at desc);

-- Keep single-piece goods reserved when their last unit is reserved by an order.
create or replace function public.sync_resale_product_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op='UPDATE' and new.stock<old.stock and old.resale_status<>'available' then
    raise exception 'PRODUCT_UNAVAILABLE' using errcode='P0001';
  end if;
  if new.resale_status='sold' then
    new.stock := 0;
  elsif new.stock<=0 and old.resale_status='available' then
    new.resale_status := 'reserved';
  elsif new.stock>0 and old.resale_status='reserved' then
    new.resale_status := 'available';
  end if;
  return new;
end $$;
drop trigger if exists sync_resale_product_status_before_update on public.products;
create trigger sync_resale_product_status_before_update
before update of stock,resale_status on public.products
for each row execute function public.sync_resale_product_status();

-- Re-selling status is display metadata and must not expose draft fields.
comment on column public.products.resale_status is 'available, reserved, or sold resale lifecycle state';
