create table if not exists public.marketplace_likes (
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (listing_id, user_id)
);
create index if not exists marketplace_likes_user_idx on public.marketplace_likes(user_id, created_at desc);
create index if not exists marketplace_likes_listing_idx on public.marketplace_likes(listing_id, created_at desc);
alter table public.marketplace_likes enable row level security;
grant select, insert, delete on public.marketplace_likes to authenticated;
drop policy if exists "Users can view their own marketplace likes" on public.marketplace_likes;
create policy "Users can view their own marketplace likes" on public.marketplace_likes
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Sellers can view likes on their listings" on public.marketplace_likes;
create policy "Sellers can view likes on their listings" on public.marketplace_likes
for select to authenticated using (
  exists (select 1 from public.marketplace_listings l where l.id = listing_id and l.seller_id = (select auth.uid()))
);
drop policy if exists "Users can like approved listings" on public.marketplace_likes;
create policy "Users can like approved listings" on public.marketplace_likes
for insert to authenticated with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.marketplace_listings l
    where l.id = listing_id and l.status = 'approved' and l.seller_id <> (select auth.uid())
  )
);
drop policy if exists "Users can unlike their own likes" on public.marketplace_likes;
create policy "Users can unlike their own likes" on public.marketplace_likes
for delete to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.marketplace_notifications (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid references public.marketplace_listings(id) on delete set null,
  listing_title text not null,
  type text not null check (type in ('listing_liked','listing_deleted')),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  message text not null default '',
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists marketplace_notifications_seller_idx
  on public.marketplace_notifications(seller_id, created_at desc);
alter table public.marketplace_notifications enable row level security;
grant select on public.marketplace_notifications to authenticated;
grant update (read_at) on public.marketplace_notifications to authenticated;
drop policy if exists "Sellers can view their marketplace notifications" on public.marketplace_notifications;
create policy "Sellers can view their marketplace notifications" on public.marketplace_notifications
for select to authenticated using ((select auth.uid()) = seller_id);
drop policy if exists "Sellers can mark their notifications read" on public.marketplace_notifications;
create policy "Sellers can mark their notifications read" on public.marketplace_notifications
for update to authenticated using ((select auth.uid()) = seller_id)
with check ((select auth.uid()) = seller_id);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.notify_marketplace_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_listing public.marketplace_listings%rowtype;
  v_actor_name text;
begin
  select * into v_listing from public.marketplace_listings where id = new.listing_id;
  if not found or v_listing.status <> 'approved' or v_listing.seller_id = new.user_id then
    raise exception 'This listing cannot be liked';
  end if;
  select coalesce(nullif(trim(display_name), ''), 'Telegram user')
    into v_actor_name from public.profiles where id = new.user_id;
  insert into public.marketplace_notifications
    (seller_id, listing_id, listing_title, type, actor_id, actor_name, message)
  values
    (v_listing.seller_id, v_listing.id, v_listing.title, 'listing_liked', new.user_id,
     coalesce(v_actor_name, 'Telegram user'), 'liked your listing');
  return new;
end;
$$;
revoke all on function private.notify_marketplace_like() from public, anon, authenticated;
drop trigger if exists marketplace_like_notification on public.marketplace_likes;
create trigger marketplace_like_notification
after insert on public.marketplace_likes
for each row execute function private.notify_marketplace_like();

create or replace function private.notify_marketplace_listing_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'approved' and new.status = 'deleted' then
    if nullif(trim(new.moderation_reason), '') is null then
      raise exception 'A deletion reason is required';
    end if;
    insert into public.marketplace_notifications
      (seller_id, listing_id, listing_title, type, actor_id, message)
    values
      (new.seller_id, new.id, new.title, 'listing_deleted', new.moderated_by,
       trim(new.moderation_reason));
  end if;
  return new;
end;
$$;
revoke all on function private.notify_marketplace_listing_deleted() from public, anon, authenticated;
drop trigger if exists marketplace_listing_deleted_notification on public.marketplace_listings;
create trigger marketplace_listing_deleted_notification
after update of status on public.marketplace_listings
for each row execute function private.notify_marketplace_listing_deleted();

create index if not exists marketplace_listings_status_seller_idx
  on public.marketplace_listings(seller_id, status, created_at desc);
