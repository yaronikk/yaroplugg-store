create table if not exists public.telegram_login_challenges (
  nonce text primary key check (length(nonce) between 20 and 200),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

alter table public.telegram_login_challenges enable row level security;
revoke all on table public.telegram_login_challenges from anon, authenticated;
grant all on table public.telegram_login_challenges to service_role;

create index if not exists telegram_login_challenges_created_at_idx
  on public.telegram_login_challenges (created_at);
