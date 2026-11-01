create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Yaroplugg user',
  avatar_url text,
  telegram_username text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 80),
  constraint profiles_telegram_username_format check (
    telegram_username is null or telegram_username ~ '^[A-Za-z0-9_]{5,32}$'
  )
);

alter table public.profiles enable row level security;

grant select, insert, update on public.profiles to authenticated;

create policy "Authenticated users can view marketplace profiles"
on public.profiles
for select
to authenticated
using (true);

create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, telegram_username)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Yaroplugg user'
    ),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    ),
    nullif(
      regexp_replace(
        coalesce(
          new.raw_user_meta_data ->> 'preferred_username',
          new.raw_user_meta_data ->> 'username',
          ''
        ),
        '^@',
        ''
      ),
      ''
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();
