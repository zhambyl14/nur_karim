-- Registration started on the site and confirmed in Telegram.
--
-- The site creates a request with a random code (kept in an httpOnly cookie)
-- and opens t.me/<bot>?start=r_<code>. The bot remembers which Telegram user
-- opened it and, once the phone is shared, attaches the registration token to
-- the request. The site tab polls the request and continues the registration
-- in the same browser, so the client never has to come back from Telegram by
-- a second link. Only SHA-256 of the code is stored. Server-side access only.
create table public.telegram_auth_requests (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  telegram_id bigint,
  token_id uuid references public.telegram_tokens (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes'
);

create index telegram_auth_requests_telegram_idx
  on public.telegram_auth_requests (telegram_id, created_at desc)
  where token_id is null;

alter table public.telegram_auth_requests enable row level security;
-- no policies: only the service role (site server, bot) can read or write

revoke all on public.telegram_auth_requests from anon, authenticated;

create or replace function public.cleanup_housekeeping()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.ebook_access_log where created_at < now() - interval '120 days';
  delete from public.telegram_auth_requests where expires_at < now() - interval '1 day';
  delete from public.telegram_tokens where expires_at < now() - interval '7 days';
$$;

revoke execute on function public.cleanup_housekeeping() from public, anon, authenticated;
