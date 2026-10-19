-- Nur Karim: e-book reading (progress, devices, access log), Telegram
-- registration tokens and the auth.users -> profiles trigger.

-- ---------------------------------------------------------------------------
-- Reading progress
-- ---------------------------------------------------------------------------
create table public.reading_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  page int not null default 1 check (page >= 1),
  page_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

alter table public.reading_progress enable row level security;

create policy reading_progress_select on public.reading_progress
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy reading_progress_insert on public.reading_progress
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.entitlements e
      where e.user_id = (select auth.uid()) and e.book_id = reading_progress.book_id
    )
  );
create policy reading_progress_update on public.reading_progress
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Reader devices (limit how many devices can open the library)
-- Written only by the server (service role) from the reader API.
-- ---------------------------------------------------------------------------
create table public.ebook_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  device_id text not null check (length(device_id) between 8 and 80),
  label text not null default '',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (user_id, device_id)
);

alter table public.ebook_devices enable row level security;

create policy ebook_devices_select on public.ebook_devices
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy ebook_devices_admin_delete on public.ebook_devices
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Page access log (rate limiting + audit of leaks)
-- ---------------------------------------------------------------------------
create table public.ebook_access_log (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  book_id uuid references public.books (id) on delete set null,
  page int not null,
  device_id text,
  ip text,
  created_at timestamptz not null default now()
);
create index ebook_access_log_user_idx on public.ebook_access_log (user_id, created_at desc);
create index ebook_access_log_book_idx on public.ebook_access_log (book_id, created_at desc);

alter table public.ebook_access_log enable row level security;

create policy ebook_access_log_admin_select on public.ebook_access_log
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Telegram one-time tokens (registration / password reset).
-- No policies: only the service role (edge function + Next.js server) can use it.
-- ---------------------------------------------------------------------------
create table public.telegram_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  purpose text not null check (purpose in ('register', 'reset')),
  phone text not null,
  telegram_id bigint not null,
  telegram_username text,
  first_name text,
  last_name text,
  language_code text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index telegram_tokens_phone_idx on public.telegram_tokens (phone, created_at desc);

alter table public.telegram_tokens enable row level security;

-- ---------------------------------------------------------------------------
-- auth.users -> public.profiles
-- The server creates users with email <phone>@karim.kz and metadata
-- {phone, full_name, telegram_id, telegram_username, locale}.
-- The role is ALWAYS client here; admins are promoted manually.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
  v_locale text;
begin
  v_phone := public.normalize_phone(
    coalesce(new.raw_user_meta_data ->> 'phone', split_part(coalesce(new.email, ''), '@', 1))
  );
  if v_phone is null then
    raise exception 'PHONE_REQUIRED';
  end if;
  v_locale := case when new.raw_user_meta_data ->> 'locale' = 'ru' then 'ru' else 'kk' end;

  insert into public.profiles (id, phone, full_name, telegram_id, telegram_username, locale)
  values (
    new.id,
    v_phone,
    left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120),
    nullif(new.raw_user_meta_data ->> 'telegram_id', '')::bigint,
    nullif(new.raw_user_meta_data ->> 'telegram_username', ''),
    v_locale
  );

  perform public.attach_pending_gifts(new.id, v_phone);
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
