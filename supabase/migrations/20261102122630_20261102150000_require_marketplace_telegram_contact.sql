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
  if tg_op = 'INSERT' then
    if new.telegram_username is null
       or new.telegram_username !~ '^[A-Za-z0-9_]{5,32}$' then
      raise exception 'A valid Telegram username is required (5-32 characters)';
    end if;
  elsif new.telegram_username is distinct from old.telegram_username then
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
