create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 100),
  description text not null check (char_length(trim(description)) between 10 and 3000),
  price numeric(10,2) not null check (price > 0),
  category text not null check (char_length(trim(category)) between 2 and 60),
  brand text not null default '' check (char_length(brand) <= 80),
  size_label text not null default '' check (char_length(size_label) <= 40),
  item_condition text not null check (item_condition in ('new_with_tags','excellent','good','defects')),
  defects text not null default '' check (char_length(defects) <= 1000),
  images text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected','sold','deleted')),
  pending_revision jsonb,
  moderation_reason text,
  moderated_at timestamptz,
  moderated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  sold_at timestamptz,
  constraint marketplace_listing_images_count check (cardinality(images) between 3 and 10)
);
create index if not exists marketplace_listings_public_idx on public.marketplace_listings (status, published_at desc) where status = 'approved';
create index if not exists marketplace_listings_seller_idx on public.marketplace_listings (seller_id, created_at desc);
alter table public.marketplace_listings enable row level security;
drop policy if exists "Public can view approved marketplace listings" on public.marketplace_listings;
create policy "Public can view approved marketplace listings" on public.marketplace_listings for select to anon, authenticated using (status = 'approved');
drop policy if exists "Sellers can view their own marketplace listings" on public.marketplace_listings;
create policy "Sellers can view their own marketplace listings" on public.marketplace_listings for select to authenticated using ((select auth.uid()) = seller_id);
drop policy if exists "Sellers can submit marketplace listings" on public.marketplace_listings;
create policy "Sellers can submit marketplace listings" on public.marketplace_listings for insert to authenticated with check ((select auth.uid()) = seller_id and status = 'pending');
drop policy if exists "Sellers can update unapproved marketplace listings" on public.marketplace_listings;
create policy "Sellers can update unapproved marketplace listings" on public.marketplace_listings for update to authenticated using ((select auth.uid()) = seller_id and status in ('pending','rejected')) with check ((select auth.uid()) = seller_id and status in ('pending','rejected'));
drop policy if exists "Sellers can delete their own marketplace listings" on public.marketplace_listings;
create policy "Sellers can delete their own marketplace listings" on public.marketplace_listings for delete to authenticated using ((select auth.uid()) = seller_id);
create or replace function public.protect_marketplace_listing() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() = old.seller_id then
    if new.seller_id <> old.seller_id then raise exception 'Seller ownership cannot be changed'; end if;
    if old.status in ('approved','sold','deleted') then raise exception 'Published listings cannot be edited directly'; end if;
    if new.status <> old.status and not (old.status = 'rejected' and new.status = 'pending') then raise exception 'Invalid listing status change'; end if;
    new.moderation_reason := null; new.moderated_at := null; new.moderated_by := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists protect_marketplace_listing on public.marketplace_listings;
create trigger protect_marketplace_listing before update on public.marketplace_listings for each row execute function public.protect_marketplace_listing();
create or replace function public.mark_marketplace_listing_sold(p_listing_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.marketplace_listings set status = 'sold', sold_at = now(), updated_at = now()
  where id = p_listing_id and seller_id = auth.uid() and status = 'approved';
  if not found then raise exception 'Listing not found or cannot be marked sold'; end if;
end;
$$;
revoke all on function public.mark_marketplace_listing_sold(uuid) from public;
grant execute on function public.mark_marketplace_listing_sold(uuid) to authenticated;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('marketplace-listings','marketplace-listings',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Marketplace sellers upload listing photos" on storage.objects;
create policy "Marketplace sellers upload listing photos" on storage.objects for insert to authenticated with check (bucket_id='marketplace-listings' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Marketplace sellers delete own listing photos" on storage.objects;
create policy "Marketplace sellers delete own listing photos" on storage.objects for delete to authenticated using (bucket_id='marketplace-listings' and (storage.foldername(name))[1]=(select auth.uid())::text);
