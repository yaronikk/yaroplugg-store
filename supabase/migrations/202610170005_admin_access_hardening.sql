-- Remove legacy policies that allowed every authenticated user to manage store data.
-- Authorization remains enforced by RLS and the trusted app_metadata role claim.
drop policy if exists "Authenticated users can manage categories" on public.categories;
drop policy if exists "Authenticated users can manage products" on public.products;
drop policy if exists "Authenticated users can upload product images" on storage.objects;
drop policy if exists "Authenticated users can update product images" on storage.objects;
drop policy if exists "Authenticated users can delete product images" on storage.objects;

drop policy if exists "Admins can manage categories" on public.categories;
create policy "Admins can manage categories" on public.categories
for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products" on public.products
for all to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images" on storage.objects
for insert to authenticated
with check (bucket_id = 'product-images' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images" on storage.objects
for update to authenticated
using (bucket_id = 'product-images' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
with check (bucket_id = 'product-images' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images" on storage.objects
for delete to authenticated
using (bucket_id = 'product-images' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
