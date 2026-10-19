-- Nur Karim: profiles, catalog, promotions, banners, settings, cart, favorites

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users). Phone is the login (stored as 87XXXXXXXXX,
-- auth email is <phone>@karim.kz). Role can only be changed by an admin or
-- with the service role — registration always creates a client.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text not null unique,
  full_name text not null default '',
  role public.user_role not null default 'client',
  telegram_id bigint unique,
  telegram_username text,
  locale text not null default 'kk' check (locale in ('kk', 'ru')),
  saved_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  )
$$;

-- Clients may edit their name/locale/saved address only.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.id := old.id;
    new.role := old.role;
    new.phone := old.phone;
    new.telegram_id := old.telegram_id;
    new.telegram_username := old.telegram_username;
    new.created_at := old.created_at;
  end if;
  return new;
end
$$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Genres («кітап типтері» / санаттар)
-- ---------------------------------------------------------------------------
create table public.genres (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_kk text not null check (length(name_kk) between 1 and 80),
  name_ru text not null check (length(name_ru) between 1 and 80),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.genres enable row level security;

create policy genres_select on public.genres
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy genres_admin_insert on public.genres
  for insert to authenticated with check ((select public.is_admin()));
create policy genres_admin_update on public.genres
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy genres_admin_delete on public.genres
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Books. One book can be sold as paper, ebook or both.
-- Prices are whole tenge.
-- ---------------------------------------------------------------------------
create table public.books (
  id uuid primary key default gen_random_uuid(),
  catalog_no int generated always as identity (start with 1) unique,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(title) between 1 and 300),
  author text not null default '' check (length(author) <= 200),
  genre_id uuid references public.genres (id) on delete set null,
  description_kk text not null default '',
  description_ru text not null default '',
  language text not null default 'kk' check (language in ('kk', 'ru', 'ar', 'en', 'tr', 'other')),
  publisher text,
  publish_year int check (publish_year between 1000 and 2100),
  isbn text,
  pages int check (pages > 0),
  cover_type text check (cover_type in ('hard', 'soft')),
  cover_url text,
  images text[] not null default '{}',
  cover_palette smallint not null default 0 check (cover_palette between 0 and 3),
  tags text[] not null default '{}',
  paper_enabled boolean not null default true,
  paper_price int check (paper_price >= 0),
  stock int not null default 0 check (stock >= 0),
  ebook_enabled boolean not null default false,
  ebook_price int check (ebook_price >= 0),
  ebook_page_count int not null default 0 check (ebook_page_count >= 0),
  ebook_version int not null default 0,
  ebook_preview_pages int not null default 0 check (ebook_preview_pages >= 0),
  is_featured boolean not null default false,
  is_published boolean not null default false,
  is_demo boolean not null default false,
  sold_count int not null default 0,
  rating_avg numeric(3, 2) not null default 0,
  rating_count int not null default 0,
  search_text text generated always as (
    lower(
      title || ' ' || author || ' ' || coalesce(publisher, '') || ' ' || coalesce(isbn, '')
      || ' ' || public.immutable_array_to_string(tags, ' ')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint books_has_format check (paper_enabled or ebook_enabled),
  constraint books_paper_price check (not paper_enabled or paper_price is not null),
  constraint books_ebook_price check (not ebook_enabled or ebook_price is not null)
);

create index books_genre_idx on public.books (genre_id);
create index books_published_idx on public.books (is_published, created_at desc);
create index books_search_trgm on public.books using gin (search_text extensions.gin_trgm_ops);
create index books_author_idx on public.books (author);

create trigger books_updated_at before update on public.books
  for each row execute function public.set_updated_at();

alter table public.books enable row level security;

create policy books_select on public.books
  for select to anon, authenticated
  using (is_published or (select public.is_admin()));
create policy books_admin_insert on public.books
  for insert to authenticated with check ((select public.is_admin()));
create policy books_admin_update on public.books
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy books_admin_delete on public.books
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Promotions (акциялар): automatic discounts for all books / a genre / books
-- ---------------------------------------------------------------------------
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  title_kk text not null default '',
  title_ru text not null default '',
  discount_type public.discount_type not null,
  discount_value int not null check (discount_value > 0),
  scope public.promo_scope not null default 'all',
  genre_id uuid references public.genres (id) on delete cascade,
  format_scope public.format_scope not null default 'any',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint promotions_percent check (discount_type <> 'percent' or discount_value between 1 and 95),
  constraint promotions_genre check (scope <> 'genre' or genre_id is not null),
  constraint promotions_dates check (starts_at is null or ends_at is null or starts_at < ends_at)
);

create table public.promotion_books (
  promotion_id uuid not null references public.promotions (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  primary key (promotion_id, book_id)
);
create index promotion_books_book_idx on public.promotion_books (book_id);

alter table public.promotions enable row level security;
alter table public.promotion_books enable row level security;

create policy promotions_select on public.promotions
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy promotions_admin_insert on public.promotions
  for insert to authenticated with check ((select public.is_admin()));
create policy promotions_admin_update on public.promotions
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy promotions_admin_delete on public.promotions
  for delete to authenticated using ((select public.is_admin()));

create policy promotion_books_select on public.promotion_books
  for select to anon, authenticated using (true);
create policy promotion_books_admin_insert on public.promotion_books
  for insert to authenticated with check ((select public.is_admin()));
create policy promotion_books_admin_delete on public.promotion_books
  for delete to authenticated using ((select public.is_admin()));

-- Best (lowest) price for one book format after active promotions.
-- Always returns exactly one row.
create or replace function public.best_price(
  p_book_id uuid,
  p_genre_id uuid,
  p_format public.book_format,
  p_price int
)
returns table (final_price int, promotion_id uuid)
language sql
stable
set search_path = ''
as $$
  with cands as (
    select p.id,
      greatest(0,
        case when p.discount_type = 'percent'
          then p_price - floor(p_price * p.discount_value / 100.0)::int
          else p_price - p.discount_value
        end) as price
    from public.promotions p
    where p_price is not null
      and p.is_active
      and (p.starts_at is null or p.starts_at <= now())
      and (p.ends_at is null or p.ends_at > now())
      and (p.format_scope = 'any' or p.format_scope::text = p_format::text)
      and (
        p.scope = 'all'
        or (p.scope = 'genre' and p_genre_id is not null and p.genre_id = p_genre_id)
        or (p.scope = 'books' and exists (
              select 1 from public.promotion_books pb
              where pb.promotion_id = p.id and pb.book_id = p_book_id))
      )
  ),
  best as (
    select id, price from cands order by price asc, id limit 1
  )
  select coalesce((select price from best), p_price), (select id from best)
$$;

-- Catalog read model with final prices. security_invoker keeps RLS of the caller.
create view public.catalog_books
with (security_invoker = true)
as
select
  b.id, b.catalog_no, b.slug, b.title, b.author, b.genre_id,
  g.slug as genre_slug, g.name_kk as genre_name_kk, g.name_ru as genre_name_ru,
  b.description_kk, b.description_ru, b.language, b.publisher, b.publish_year, b.isbn,
  b.pages, b.cover_type, b.cover_url, b.images, b.cover_palette, b.tags,
  b.paper_enabled, b.paper_price, b.stock,
  b.ebook_enabled, b.ebook_price, b.ebook_page_count, b.ebook_preview_pages,
  (b.ebook_enabled and b.ebook_page_count > 0) as ebook_available,
  b.is_featured, b.is_published, b.is_demo, b.sold_count, b.rating_avg, b.rating_count,
  b.search_text, b.created_at, b.updated_at,
  pp.final_price as paper_final_price,
  pp.promotion_id as paper_promotion_id,
  ep.final_price as ebook_final_price,
  ep.promotion_id as ebook_promotion_id,
  least(
    case when b.paper_enabled then pp.final_price end,
    case when b.ebook_enabled and b.ebook_page_count > 0 then ep.final_price end
  ) as min_price,
  coalesce(greatest(
    case when b.paper_enabled and b.paper_price > 0
      then round(100.0 * (b.paper_price - pp.final_price) / b.paper_price) end,
    case when b.ebook_enabled and b.ebook_page_count > 0 and b.ebook_price > 0
      then round(100.0 * (b.ebook_price - ep.final_price) / b.ebook_price) end
  ), 0)::int as discount_pct
from public.books b
left join public.genres g on g.id = b.genre_id
cross join lateral public.best_price(b.id, b.genre_id, 'paper', b.paper_price) pp
cross join lateral public.best_price(b.id, b.genre_id, 'ebook', b.ebook_price) ep;

-- ---------------------------------------------------------------------------
-- Promo codes (промокодтар) — never readable by clients directly
-- ---------------------------------------------------------------------------
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,32}$'),
  description text not null default '',
  discount_type public.discount_type not null,
  discount_value int not null check (discount_value > 0),
  scope public.promo_scope not null default 'all',
  genre_id uuid references public.genres (id) on delete cascade,
  format_scope public.format_scope not null default 'any',
  min_order_amount int not null default 0 check (min_order_amount >= 0),
  max_uses int check (max_uses > 0),
  per_user_limit int default 1 check (per_user_limit > 0),
  used_count int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  constraint promo_codes_percent check (discount_type <> 'percent' or discount_value between 1 and 95),
  constraint promo_codes_genre check (scope <> 'genre' or genre_id is not null),
  constraint promo_codes_dates check (starts_at is null or ends_at is null or starts_at < ends_at)
);

create table public.promo_code_books (
  promo_code_id uuid not null references public.promo_codes (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  primary key (promo_code_id, book_id)
);
create index promo_code_books_book_idx on public.promo_code_books (book_id);

alter table public.promo_codes enable row level security;
alter table public.promo_code_books enable row level security;

create policy promo_codes_admin_all on public.promo_codes
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy promo_code_books_admin_all on public.promo_code_books
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Banners (басты беттегі жылжымалы баннерлер)
-- ---------------------------------------------------------------------------
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title_kk text not null default '',
  title_ru text not null default '',
  subtitle_kk text not null default '',
  subtitle_ru text not null default '',
  button_kk text not null default '',
  button_ru text not null default '',
  link_url text,
  image_url text not null,
  image_mobile_url text,
  text_theme text not null default 'light' check (text_theme in ('light', 'dark')),
  overlay boolean not null default true,
  sort_order int not null default 0,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.banners enable row level security;

create policy banners_select on public.banners
  for select to anon, authenticated
  using (
    (is_active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now()))
    or (select public.is_admin())
  );
create policy banners_admin_insert on public.banners
  for insert to authenticated with check ((select public.is_admin()));
create policy banners_admin_update on public.banners
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy banners_admin_delete on public.banners
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Store settings (single row)
-- ---------------------------------------------------------------------------
create table public.store_settings (
  id smallint primary key default 1 check (id = 1),
  store_name text not null default 'Nur Karim',
  contact_phone text not null default '+7 700 000 00 00',
  contact_email text,
  address_kk text not null default '',
  address_ru text not null default '',
  instagram_url text,
  telegram_url text,
  whatsapp_phone text,
  payment_phone text not null default '+7 700 000 00 00',
  payment_recipient text not null default '',
  payment_bank text not null default 'Kaspi Bank',
  payment_note_kk text not null default '',
  payment_note_ru text not null default '',
  delivery_astana_price int not null default 1000 check (delivery_astana_price >= 0),
  delivery_kazpost_price int not null default 1500 check (delivery_kazpost_price >= 0),
  free_delivery_threshold int check (free_delivery_threshold > 0),
  gift_enabled boolean not null default true,
  gift_wrap_price int not null default 500 check (gift_wrap_price >= 0),
  ebook_max_devices int not null default 3 check (ebook_max_devices between 1 and 20),
  ebook_pages_per_10min int not null default 150 check (ebook_pages_per_10min between 10 and 5000),
  ebook_watermark boolean not null default true,
  hero_label_kk text not null default 'ХАДИС',
  hero_label_ru text not null default 'ХАДИС',
  hero_quote_kk text not null default '«Кім білім іздеу жолына түссе, Алла оған жәннатқа апарар жолды жеңілдетеді»',
  hero_quote_ru text not null default '«Тому, кто встал на путь поиска знаний, Аллах облегчит путь в Рай»',
  hero_sub_kk text not null default 'Осы хадисті еске алып, бүгін бір кітаптан бастаңыз.',
  hero_sub_ru text not null default 'Вспомните этот хадис и начните сегодня с одной книги.',
  order_auto_cancel_hours int not null default 72 check (order_auto_cancel_hours between 1 and 720),
  telegram_notify_admins boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

alter table public.store_settings enable row level security;

create policy store_settings_select on public.store_settings
  for select to anon, authenticated using (true);
create policy store_settings_admin_update on public.store_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.store_settings (id) values (1);

-- ---------------------------------------------------------------------------
-- Cart (synced across devices for signed-in users) and favorites
-- ---------------------------------------------------------------------------
create table public.cart_items (
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  format public.book_format not null,
  quantity int not null default 1 check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  primary key (user_id, book_id, format)
);

alter table public.cart_items enable row level security;

create policy cart_items_own on public.cart_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
create index favorites_book_idx on public.favorites (book_id);

alter table public.favorites enable row level security;

create policy favorites_own on public.favorites
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Public read helpers
-- ---------------------------------------------------------------------------
create or replace function public.catalog_stats()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'books', (select count(*) from public.books where is_published),
    'ebooks', (select count(*) from public.books
               where is_published and ebook_enabled and ebook_page_count > 0)
  )
$$;

create or replace function public.list_authors()
returns table (author text, books_count bigint)
language sql
stable
set search_path = ''
as $$
  select b.author, count(*) as books_count
  from public.books b
  where b.is_published and b.author <> ''
  group by b.author
  order by b.author
$$;
