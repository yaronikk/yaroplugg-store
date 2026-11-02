-- Harden profile creation against missing or oversized OAuth claims.
-- Keep the trigger callable only by the database trigger, not by API roles.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
  v_telegram_username text;
begin
  v_display_name := left(
    trim(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'given_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Yaroplugg user'
    )),
    80
  );

  v_telegram_username := regexp_replace(
    coalesce(
      new.raw_user_meta_data ->> 'preferred_username',
      new.raw_user_meta_data ->> 'username',
      new.raw_user_meta_data ->> 'user_name',
      ''
    ),
    '^@',
    ''
  );

  if v_telegram_username !~ '^[A-Za-z0-9_]{5,32}$' then
    v_telegram_username := null;
  end if;

  insert into public.profiles (id, display_name, avatar_url, telegram_username)
  values (
    new.id,
    coalesce(nullif(v_display_name, ''), 'Yaroplugg user'),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    ),
    v_telegram_username
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user_profile() from public, anon, authenticated;

-- Keep profiles private by default while exposing seller cards only for
-- profiles that belong to a currently approved marketplace listing.
drop policy if exists "Authenticated users can view marketplace profiles" on public.profiles;
drop policy if exists "Marketplace profile visibility" on public.profiles;
drop policy if exists "Public can view marketplace seller profiles" on public.profiles;

create policy "Marketplace profile visibility"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.marketplace_listings as listing
    where listing.seller_id = profiles.id
      and listing.status = 'approved'
  )
  or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

create policy "Public can view marketplace seller profiles"
on public.profiles
for select
to anon
using (
  exists (
    select 1
    from public.marketplace_listings as listing
    where listing.seller_id = profiles.id
      and listing.status = 'approved'
  )
);

-- Consolidate marketplace read/update rules while preserving the existing
-- public, seller-owned, and administrator access model.
drop policy if exists "Admins can view all marketplace listings" on public.marketplace_listings;
drop policy if exists "Public can view approved marketplace listings" on public.marketplace_listings;
drop policy if exists "Sellers can view their own marketplace listings" on public.marketplace_listings;

create policy "Marketplace listings visibility"
on public.marketplace_listings
for select
to authenticated
using (
  status = 'approved'
  or (select auth.uid()) = seller_id
  or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

create policy "Public can view approved marketplace listings"
on public.marketplace_listings
for select
to anon
using (status = 'approved');

drop policy if exists "Admins can moderate marketplace listings" on public.marketplace_listings;
drop policy if exists "Sellers can update unapproved marketplace listings" on public.marketplace_listings;

create policy "Marketplace listings update"
on public.marketplace_listings
for update
to authenticated
using (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  or (
    (select auth.uid()) = seller_id
    and status in ('pending', 'rejected')
  )
)
with check (
  (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  or (
    (select auth.uid()) = seller_id
    and status in ('pending', 'rejected')
  )
);

-- Cover the marketplace_listings.moderated_by foreign key.
create index if not exists marketplace_listings_moderated_by_idx
  on public.marketplace_listings (moderated_by)
  where moderated_by is not null;
