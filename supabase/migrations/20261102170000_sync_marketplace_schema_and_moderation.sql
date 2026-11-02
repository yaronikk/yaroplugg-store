-- Bring marketplace schema changes made directly in the database into version control.
-- All additions are idempotent so this can safely run against the current database
-- as well as a fresh environment after the preceding marketplace migrations.

alter table public.marketplace_listings
  add column if not exists colors jsonb not null default '[]'::jsonb;

alter table public.marketplace_listings
  add column if not exists is_legit boolean not null default false;

alter table public.marketplace_listings
  add column if not exists telegram_username text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.marketplace_listings'::regclass
      and conname = 'marketplace_listing_telegram_username_format'
  ) then
    alter table public.marketplace_listings
      add constraint marketplace_listing_telegram_username_format
      check (
        telegram_username is null
        or telegram_username ~ '^[A-Za-z0-9_]{5,32}$'
      );
  end if;
end;
$$;

create or replace function public.require_marketplace_telegram_contact()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.telegram_username is distinct from old.telegram_username then
    if new.telegram_username is null
       or new.telegram_username !~ '^[A-Za-z0-9_]{5,32}$' then
      raise exception 'A valid Telegram username is required (5-32 characters)';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists require_marketplace_telegram_contact on public.marketplace_listings;
create trigger require_marketplace_telegram_contact
before insert or update of telegram_username on public.marketplace_listings
for each row execute function public.require_marketplace_telegram_contact();

create index if not exists marketplace_listings_telegram_username_idx
  on public.marketplace_listings (telegram_username);

-- Admin moderation may change listing status; sellers remain restricted to
-- their own unapproved/rejected listings and cannot transfer ownership.
create or replace function public.protect_marketplace_listing()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() = old.seller_id
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    if new.seller_id <> old.seller_id then
      raise exception 'Seller ownership cannot be changed';
    end if;
    if old.status in ('approved','sold','deleted') then
      raise exception 'Published listings cannot be edited directly';
    end if;
    if new.status <> old.status
       and not (old.status = 'rejected' and new.status = 'pending') then
      raise exception 'Invalid listing status change';
    end if;
    new.moderation_reason := null;
    new.moderated_at := null;
    new.moderated_by := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
