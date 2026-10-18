alter table public.categories
  add column if not exists name_ru text,
  add column if not exists name_et text,
  add column if not exists name_en text;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check(length(trim(customer_name)) between 1 and 100),
  body text not null check(length(trim(body)) between 1 and 1200),
  rating smallint not null default 5 check(rating between 1 and 5),
  language text not null default 'en' check(language in ('ru','et','en')),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
grant select on public.reviews to anon,authenticated;
grant insert,update,delete on public.reviews to authenticated;
drop policy if exists "Public can read published reviews" on public.reviews;
create policy "Public can read published reviews" on public.reviews for select to anon,authenticated
  using (is_published or (select auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists "Admins can create reviews" on public.reviews;
create policy "Admins can create reviews" on public.reviews for insert to authenticated
  with check ((select auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists "Admins can update reviews" on public.reviews;
create policy "Admins can update reviews" on public.reviews for update to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role')='admin')
  with check ((select auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists "Admins can delete reviews" on public.reviews;
create policy "Admins can delete reviews" on public.reviews for delete to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role')='admin');
