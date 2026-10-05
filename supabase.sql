-- YAROPLUGG ADMIN V1
-- Run this AFTER the first database setup SQL.

-- Add fields used by the current store/admin.
alter table public.products add column if not exists composition text;
alter table public.products add column if not exists featured boolean not null default false;

-- Add the Jackets category used by the current storefront.
insert into public.categories (name, slug, sort_order)
values ('Jackets', 'jackets', 4)
on conflict (slug) do nothing;

-- Allow authenticated admin users to manage categories.
create policy "Authenticated users can manage categories"
on public.categories
for all
to authenticated
using (true)
with check (true);

-- Allow authenticated admin users to manage products.
create policy "Authenticated users can manage products"
on public.products
for all
to authenticated
using (true)
with check (true);

-- Public product images bucket.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Anyone can view product images.
create policy "Public can view product images"
on storage.objects
for select
to public
using (bucket_id = 'product-images');

-- Logged-in admin can upload product images.
create policy "Authenticated users can upload product images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-images');

-- Logged-in admin can update product images.
create policy "Authenticated users can update product images"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');

-- Logged-in admin can delete product images.
create policy "Authenticated users can delete product images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images');
