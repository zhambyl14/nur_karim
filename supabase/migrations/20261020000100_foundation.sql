-- Nur Karim: foundation (extensions, enums, helper functions)

create extension if not exists pg_trgm with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('client', 'admin');
create type public.book_format as enum ('paper', 'ebook');
create type public.order_status as enum (
  'pending_payment',  -- тапсырыс жасалды, төлем күтілуде
  'payment_review',   -- клиент «Төледім» деді, админ тексереді
  'paid',             -- админ төлемді растады
  'shipped',          -- жолда (курьер / Қазпошта)
  'delivered',        -- жеткізілді / аяқталды
  'cancelled'         -- бас тартылды
);
create type public.delivery_method as enum ('astana_courier', 'kazpost', 'digital');
create type public.discount_type as enum ('percent', 'fixed');
create type public.promo_scope as enum ('all', 'genre', 'books');
create type public.format_scope as enum ('any', 'paper', 'ebook');
create type public.gift_address_mode as enum ('sender', 'recipient');
create type public.gift_status as enum ('pending', 'active', 'opened', 'claimed', 'cancelled');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Phone numbers are stored as digits in local format: 87XXXXXXXXX.
-- Must stay identical to normalizePhone() in src/lib/phone.ts.
create or replace function public.normalize_phone(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when d ~ '^7[0-9]{10}$' then '8' || substr(d, 2)
    when d ~ '^8[0-9]{10}$' then d
    when d ~ '^7[0-9]{9}$' then '8' || d
    when d = '' then null
    else d
  end
  from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) s
$$;

create or replace function public.immutable_array_to_string(arr text[], sep text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$ select array_to_string(arr, sep) $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create or replace function public.random_code(n_bytes int default 9)
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(n_bytes), 'base64'), '+/=', '-_')
$$;
