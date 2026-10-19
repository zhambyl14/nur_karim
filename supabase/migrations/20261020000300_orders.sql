-- Nur Karim: orders, items, history, entitlements, gifts, promo code uses,
-- server-side pricing (quote_cart / create_order) and status side effects.

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity (start with 1001) unique,
  user_id uuid references public.profiles (id) on delete set null,
  status public.order_status not null default 'pending_payment',
  items_subtotal int not null default 0,       -- sum(base price * qty)
  promotion_discount int not null default 0,   -- discount from automatic promotions
  promo_code_id uuid references public.promo_codes (id) on delete set null,
  promo_code text,
  promo_discount int not null default 0,       -- discount from the promo code
  delivery_method public.delivery_method not null,
  delivery_price int not null default 0,
  gift_wrap boolean not null default false,
  gift_wrap_price int not null default 0,
  total int not null,
  contact_name text not null,
  contact_phone text not null,
  recipient_name text,
  recipient_phone text,
  delivery_region text,
  delivery_city text,
  delivery_postal_code text,
  delivery_street text,
  delivery_house text,
  delivery_apartment text,
  delivery_entrance text,
  delivery_comment text,
  customer_note text,
  is_gift boolean not null default false,
  has_paper boolean not null default false,
  has_ebook boolean not null default false,
  tracking_number text,
  payment_receipt_path text,
  payment_marked_at timestamptz,
  payment_confirmed_at timestamptz,
  payment_confirmed_by uuid references public.profiles (id) on delete set null,
  admin_note text,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz
);

create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_created_idx on public.orders (created_at desc);
create index orders_city_idx on public.orders (delivery_city);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  book_id uuid references public.books (id) on delete set null,
  format public.book_format not null,
  title text not null,
  author text not null default '',
  cover_url text,
  cover_palette smallint not null default 0,
  genre_id uuid,
  unit_price int not null,
  unit_final_price int not null,
  quantity int not null check (quantity > 0),
  line_total int not null,
  promo_discount int not null default 0,
  promotion_id uuid
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_book_idx on public.order_items (book_id);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  note text,
  changed_by uuid,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table public.promo_code_uses (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  order_id uuid not null unique references public.orders (id) on delete cascade,
  discount int not null default 0,
  created_at timestamptz not null default now()
);
create index promo_code_uses_code_user_idx on public.promo_code_uses (promo_code_id, user_id);

create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  order_id uuid not null unique references public.orders (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  sender_name text not null,
  is_anonymous boolean not null default false,
  recipient_name text not null,
  recipient_phone text not null,
  recipient_user_id uuid references public.profiles (id) on delete set null,
  message text not null default '' check (length(message) <= 600),
  card_theme text not null default 'classic'
    check (card_theme in ('classic', 'birthday', 'thanks', 'congrats', 'holiday', 'teacher', 'family', 'justbecause')),
  reveal_at timestamptz,
  address_mode public.gift_address_mode not null default 'sender',
  address_submitted_at timestamptz,
  hide_price boolean not null default true,
  status public.gift_status not null default 'pending',
  opened_at timestamptz,
  claimed_at timestamptz,
  thank_you_message text check (length(thank_you_message) <= 500),
  thanked_at timestamptz,
  created_at timestamptz not null default now()
);
create index gifts_sender_idx on public.gifts (sender_id, created_at desc);
create index gifts_recipient_phone_idx on public.gifts (recipient_phone);
create index gifts_recipient_user_idx on public.gifts (recipient_user_id);

-- E-book library
create table public.entitlements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  source text not null check (source in ('purchase', 'gift', 'admin')),
  order_id uuid references public.orders (id) on delete set null,
  gift_id uuid references public.gifts (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);
create index entitlements_order_idx on public.entitlements (order_id);
create index entitlements_book_idx on public.entitlements (book_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.promo_code_uses enable row level security;
alter table public.gifts enable row level security;
alter table public.entitlements enable row level security;

create policy orders_select on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy orders_admin_update on public.orders
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy order_items_select on public.order_items
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = (select auth.uid()))
  );

create policy order_status_history_select on public.order_status_history
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.orders o where o.id = order_status_history.order_id and o.user_id = (select auth.uid()))
  );

create policy promo_code_uses_admin_select on public.promo_code_uses
  for select to authenticated using ((select public.is_admin()));

create policy gifts_select on public.gifts
  for select to authenticated
  using (
    sender_id = (select auth.uid())
    or recipient_user_id = (select auth.uid())
    or (select public.is_admin())
  );
create policy gifts_admin_update on public.gifts
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy entitlements_select on public.entitlements
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy entitlements_admin_insert on public.entitlements
  for insert to authenticated with check ((select public.is_admin()));
create policy entitlements_admin_delete on public.entitlements
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.mask_phone(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p ~ '^8[0-9]{10}$' then '+7 ' || substr(p, 2, 3) || ' *** ** ' || right(p, 2)
    when p is null then null
    else left(p, 3) || '****' || right(p, 2)
  end
$$;

-- ---------------------------------------------------------------------------
-- Pricing: the single source of truth for cart totals.
-- p_items: [{ "book_id": uuid, "format": "paper"|"ebook", "quantity": int }]
-- ---------------------------------------------------------------------------
create or replace function public._quote_cart(
  p_user uuid,
  p_items jsonb,
  p_promo_code text,
  p_delivery_method text,
  p_is_gift boolean,
  p_gift_wrap boolean
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.store_settings;
  r record;
  v_lines jsonb := '[]'::jsonb;
  v_errors jsonb := '[]'::jsonb;
  v_qty int;
  v_unit int;
  v_final int;
  v_promo_id uuid;
  v_items_subtotal int := 0;
  v_after_promotions int := 0;
  v_has_paper boolean := false;
  v_has_ebook boolean := false;
  v_delivery_method text := null;
  v_delivery_price int := 0;
  v_wrap int := 0;
  v_code text := upper(trim(coalesce(p_promo_code, '')));
  v_promo public.promo_codes;
  v_promo_json jsonb := null;
  v_promo_error text := null;
  v_promo_discount int := 0;
  v_eligible_sum int := 0;
  v_user_uses int := 0;
  v_line jsonb;
  v_idx int;
  v_alloc int;
  v_alloc_total int := 0;
  v_max_idx int := -1;
  v_max_total int := -1;
  v_line_error text;
begin
  select * into s from public.store_settings where id = 1;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    v_errors := v_errors || jsonb_build_object('code', 'EMPTY_CART');
  elsif jsonb_array_length(p_items) > 60 then
    v_errors := v_errors || jsonb_build_object('code', 'TOO_MANY_ITEMS');
  else
    for r in
      with raw as (
        select
          (e ->> 'book_id')::uuid as book_id,
          (e ->> 'format')::public.book_format as format,
          greatest(1, least(99, coalesce((e ->> 'quantity')::int, 1))) as quantity,
          ord
        from jsonb_array_elements(p_items) with ordinality as t (e, ord)
      ),
      merged as (
        select book_id, format, least(99, sum(quantity))::int as quantity, min(ord) as ord
        from raw
        group by book_id, format
      )
      select
        m.book_id, m.format, m.quantity, m.ord,
        b.id as found_id, b.slug, b.title, b.author, b.cover_url, b.cover_palette, b.genre_id,
        b.is_published, b.paper_enabled, b.paper_price, b.stock,
        b.ebook_enabled, b.ebook_price, b.ebook_page_count
      from merged m
      left join public.books b on b.id = m.book_id
      order by m.ord
    loop
      v_line_error := null;

      if r.found_id is null or not r.is_published then
        v_errors := v_errors || jsonb_build_object('code', 'BOOK_NOT_FOUND', 'book_id', r.book_id, 'format', r.format);
        continue;
      end if;

      if r.format = 'paper' then
        if not r.paper_enabled or r.paper_price is null then
          v_errors := v_errors || jsonb_build_object('code', 'FORMAT_UNAVAILABLE', 'book_id', r.book_id, 'format', r.format);
          continue;
        end if;
        v_qty := r.quantity;
        if r.stock < v_qty then
          v_line_error := 'OUT_OF_STOCK';
          v_errors := v_errors || jsonb_build_object('code', 'OUT_OF_STOCK', 'book_id', r.book_id, 'format', r.format, 'available', r.stock);
        end if;
        v_unit := r.paper_price;
        select bp.final_price, bp.promotion_id into v_final, v_promo_id
        from public.best_price(r.book_id, r.genre_id, 'paper', r.paper_price) bp;
        v_has_paper := true;
      else
        if not r.ebook_enabled or r.ebook_price is null or r.ebook_page_count = 0 then
          v_errors := v_errors || jsonb_build_object('code', 'FORMAT_UNAVAILABLE', 'book_id', r.book_id, 'format', r.format);
          continue;
        end if;
        v_qty := 1;
        if not coalesce(p_is_gift, false) and p_user is not null and exists (
          select 1 from public.entitlements en where en.user_id = p_user and en.book_id = r.book_id
        ) then
          v_errors := v_errors || jsonb_build_object('code', 'ALREADY_OWNED', 'book_id', r.book_id, 'format', r.format);
          continue;
        end if;
        v_unit := r.ebook_price;
        select bp.final_price, bp.promotion_id into v_final, v_promo_id
        from public.best_price(r.book_id, r.genre_id, 'ebook', r.ebook_price) bp;
        v_has_ebook := true;
      end if;

      v_items_subtotal := v_items_subtotal + v_unit * v_qty;
      v_after_promotions := v_after_promotions + v_final * v_qty;
      v_lines := v_lines || jsonb_build_object(
        'book_id', r.book_id,
        'format', r.format,
        'slug', r.slug,
        'title', r.title,
        'author', r.author,
        'cover_url', r.cover_url,
        'cover_palette', r.cover_palette,
        'genre_id', r.genre_id,
        'unit_price', v_unit,
        'unit_final_price', v_final,
        'quantity', v_qty,
        'line_total', v_final * v_qty,
        'promo_discount', 0,
        'promotion_id', v_promo_id,
        'stock', case when r.format = 'paper' then r.stock end,
        'error', v_line_error
      );
    end loop;
  end if;

  -- Promo code
  if v_code <> '' then
    select * into v_promo from public.promo_codes where code = v_code;
    if not found or not v_promo.is_active then
      v_promo_error := 'PROMO_INVALID';
    elsif v_promo.starts_at is not null and v_promo.starts_at > now() then
      v_promo_error := 'PROMO_INVALID';
    elsif v_promo.ends_at is not null and v_promo.ends_at <= now() then
      v_promo_error := 'PROMO_EXPIRED';
    elsif v_promo.max_uses is not null and v_promo.used_count >= v_promo.max_uses then
      v_promo_error := 'PROMO_LIMIT';
    else
      if p_user is not null and v_promo.per_user_limit is not null then
        select count(*) into v_user_uses
        from public.promo_code_uses u
        where u.promo_code_id = v_promo.id and u.user_id = p_user;
        if v_user_uses >= v_promo.per_user_limit then
          v_promo_error := 'PROMO_ALREADY_USED';
        end if;
      end if;

      if v_promo_error is null and v_after_promotions < v_promo.min_order_amount then
        v_promo_error := 'PROMO_MIN_AMOUNT';
      end if;

      if v_promo_error is null then
        select coalesce(sum((l ->> 'line_total')::int), 0) into v_eligible_sum
        from jsonb_array_elements(v_lines) l
        where (v_promo.format_scope = 'any' or v_promo.format_scope::text = l ->> 'format')
          and (
            v_promo.scope = 'all'
            or (v_promo.scope = 'genre' and (l ->> 'genre_id') is not null and (l ->> 'genre_id')::uuid = v_promo.genre_id)
            or (v_promo.scope = 'books' and exists (
                  select 1 from public.promo_code_books pcb
                  where pcb.promo_code_id = v_promo.id and pcb.book_id = (l ->> 'book_id')::uuid))
          );

        if v_eligible_sum <= 0 then
          v_promo_error := 'PROMO_NOT_APPLICABLE';
        else
          if v_promo.discount_type = 'percent' then
            v_promo_discount := floor(v_eligible_sum * v_promo.discount_value / 100.0)::int;
          else
            v_promo_discount := least(v_promo.discount_value, v_eligible_sum);
          end if;

          -- allocate the discount proportionally over eligible lines
          for v_idx in 0 .. jsonb_array_length(v_lines) - 1 loop
            v_line := v_lines -> v_idx;
            if (v_promo.format_scope = 'any' or v_promo.format_scope::text = v_line ->> 'format')
              and (
                v_promo.scope = 'all'
                or (v_promo.scope = 'genre' and (v_line ->> 'genre_id') is not null and (v_line ->> 'genre_id')::uuid = v_promo.genre_id)
                or (v_promo.scope = 'books' and exists (
                      select 1 from public.promo_code_books pcb
                      where pcb.promo_code_id = v_promo.id and pcb.book_id = (v_line ->> 'book_id')::uuid))
              )
            then
              v_alloc := floor(v_promo_discount::numeric * (v_line ->> 'line_total')::int / v_eligible_sum)::int;
              v_lines := jsonb_set(v_lines, array[v_idx::text, 'promo_discount'], to_jsonb(v_alloc));
              v_alloc_total := v_alloc_total + v_alloc;
              if (v_line ->> 'line_total')::int > v_max_total then
                v_max_total := (v_line ->> 'line_total')::int;
                v_max_idx := v_idx;
              end if;
            end if;
          end loop;
          if v_max_idx >= 0 and v_alloc_total < v_promo_discount then
            v_lines := jsonb_set(
              v_lines,
              array[v_max_idx::text, 'promo_discount'],
              to_jsonb(((v_lines -> v_max_idx) ->> 'promo_discount')::int + v_promo_discount - v_alloc_total)
            );
          end if;
        end if;
      end if;
    end if;

    if v_promo_error is not null then
      v_promo_discount := 0;
      v_promo_json := jsonb_build_object(
        'code', v_code, 'valid', false, 'error', v_promo_error,
        'min_order_amount', case when v_promo_error = 'PROMO_MIN_AMOUNT' then v_promo.min_order_amount end
      );
    else
      v_promo_json := jsonb_build_object(
        'code', v_code, 'valid', true, 'id', v_promo.id,
        'discount', v_promo_discount,
        'discount_type', v_promo.discount_type,
        'discount_value', v_promo.discount_value
      );
    end if;
  end if;

  -- Delivery
  if v_has_paper then
    if p_delivery_method in ('astana_courier', 'kazpost') then
      v_delivery_method := p_delivery_method;
      v_delivery_price := case
        when p_delivery_method = 'astana_courier' then s.delivery_astana_price
        else s.delivery_kazpost_price
      end;
      if s.free_delivery_threshold is not null
        and (v_after_promotions - v_promo_discount) >= s.free_delivery_threshold then
        v_delivery_price := 0;
      end if;
    end if;
  elsif jsonb_array_length(v_lines) > 0 then
    v_delivery_method := 'digital';
  end if;

  if coalesce(p_is_gift, false) and coalesce(p_gift_wrap, false) and v_has_paper and s.gift_enabled then
    v_wrap := s.gift_wrap_price;
  end if;

  return jsonb_build_object(
    'ok', jsonb_array_length(v_errors) = 0,
    'lines', v_lines,
    'errors', v_errors,
    'items_subtotal', v_items_subtotal,
    'promotion_discount', v_items_subtotal - v_after_promotions,
    'subtotal', v_after_promotions,
    'promo', v_promo_json,
    'promo_discount', v_promo_discount,
    'delivery_method', v_delivery_method,
    'delivery_required', v_has_paper and v_delivery_method is null,
    'delivery_price', v_delivery_price,
    'delivery_prices', jsonb_build_object(
      'astana_courier', s.delivery_astana_price,
      'kazpost', s.delivery_kazpost_price,
      'free_threshold', s.free_delivery_threshold
    ),
    'gift_wrap_price', v_wrap,
    'gift_wrap_available', s.gift_enabled and v_has_paper,
    'gift_wrap_unit_price', s.gift_wrap_price,
    'total', v_after_promotions - v_promo_discount + v_delivery_price + v_wrap,
    'has_paper', v_has_paper,
    'has_ebook', v_has_ebook
  );
end
$$;

create or replace function public.quote_cart(
  p_items jsonb,
  p_promo_code text default null,
  p_delivery_method text default null,
  p_is_gift boolean default false,
  p_gift_wrap boolean default false
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public._quote_cart((select auth.uid()), p_items, p_promo_code, p_delivery_method, p_is_gift, p_gift_wrap)
$$;

-- ---------------------------------------------------------------------------
-- create_order: validates everything server-side and reserves stock.
-- payload = {
--   items: [...], promo_code, delivery_method, expected_total,
--   contact: {name, phone},
--   address: {recipient_name, recipient_phone, region, city, postal_code, street, house, apartment, entrance, comment},
--   customer_note,
--   gift: {recipient_name, recipient_phone, sender_name, is_anonymous, message, card_theme,
--          reveal_at, address_mode: 'sender'|'recipient', gift_wrap, hide_price} | null
-- }
-- ---------------------------------------------------------------------------
create or replace function public.create_order(p_payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_items jsonb := p_payload -> 'items';
  v_gift jsonb := case when jsonb_typeof(p_payload -> 'gift') = 'object' then p_payload -> 'gift' end;
  v_is_gift boolean;
  v_wrap boolean;
  v_method text := nullif(p_payload ->> 'delivery_method', '');
  v_addr jsonb := case when jsonb_typeof(p_payload -> 'address') = 'object' then p_payload -> 'address' else '{}'::jsonb end;
  v_contact jsonb := case when jsonb_typeof(p_payload -> 'contact') = 'object' then p_payload -> 'contact' else '{}'::jsonb end;
  v_expected int := nullif(p_payload ->> 'expected_total', '')::int;
  v_quote jsonb;
  v_promo jsonb;
  v_order_id uuid;
  v_order_number bigint;
  v_contact_name text;
  v_contact_phone text;
  v_rec_name text;
  v_rec_phone text;
  v_region text;
  v_city text;
  v_postal text;
  v_street text;
  v_house text;
  v_apartment text;
  v_entrance text;
  v_comment text;
  v_addr_mode text := 'sender';
  v_gift_name text;
  v_gift_phone text;
  v_theme text;
  v_reveal timestamptz;
  v_line jsonb;
  v_updated int;
  v_has_paper boolean;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('code', 'AUTH_REQUIRED')));
  end if;

  v_is_gift := v_gift is not null;
  v_wrap := v_is_gift and coalesce((v_gift ->> 'gift_wrap')::boolean, false);

  -- serialize stock and promo usage
  perform 1 from public.books b
  where b.id in (
    select (e ->> 'book_id')::uuid
    from jsonb_array_elements(case when jsonb_typeof(v_items) = 'array' then v_items else '[]'::jsonb end) e
    where e ->> 'format' = 'paper'
  )
  order by b.id
  for update;

  if nullif(trim(coalesce(p_payload ->> 'promo_code', '')), '') is not null then
    perform 1 from public.promo_codes where code = upper(trim(p_payload ->> 'promo_code')) for update;
  end if;

  v_quote := public._quote_cart(v_uid, v_items, p_payload ->> 'promo_code', v_method, v_is_gift, v_wrap);

  if not (v_quote ->> 'ok')::boolean then
    return jsonb_build_object('ok', false, 'errors', v_quote -> 'errors', 'quote', v_quote);
  end if;

  v_promo := v_quote -> 'promo';
  if jsonb_typeof(v_promo) = 'object' and not coalesce((v_promo ->> 'valid')::boolean, false) then
    return jsonb_build_object('ok', false,
      'errors', jsonb_build_array(jsonb_build_object('code', v_promo ->> 'error')), 'quote', v_quote);
  end if;

  if (v_quote ->> 'delivery_required')::boolean then
    return jsonb_build_object('ok', false,
      'errors', jsonb_build_array(jsonb_build_object('code', 'DELIVERY_REQUIRED')), 'quote', v_quote);
  end if;

  if v_expected is not null and v_expected <> (v_quote ->> 'total')::int then
    return jsonb_build_object('ok', false,
      'errors', jsonb_build_array(jsonb_build_object('code', 'PRICE_CHANGED')), 'quote', v_quote);
  end if;

  v_has_paper := (v_quote ->> 'has_paper')::boolean;

  -- contact
  v_contact_name := nullif(trim(v_contact ->> 'name'), '');
  v_contact_phone := public.normalize_phone(v_contact ->> 'phone');
  if v_contact_name is null or length(v_contact_name) > 120
    or v_contact_phone is null or length(v_contact_phone) < 10 or length(v_contact_phone) > 15 then
    return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('code', 'CONTACT_INVALID')));
  end if;

  -- gift
  if v_is_gift then
    v_gift_name := nullif(trim(v_gift ->> 'recipient_name'), '');
    v_gift_phone := public.normalize_phone(v_gift ->> 'recipient_phone');
    v_theme := coalesce(nullif(v_gift ->> 'card_theme', ''), 'classic');
    v_reveal := nullif(v_gift ->> 'reveal_at', '')::timestamptz;
    v_addr_mode := coalesce(nullif(v_gift ->> 'address_mode', ''), 'sender');
    if v_addr_mode not in ('sender', 'recipient') then
      v_addr_mode := 'sender';
    end if;
    if not v_has_paper then
      v_addr_mode := 'sender';
    end if;
    if v_gift_name is null or length(v_gift_name) > 120
      or v_gift_phone is null or length(v_gift_phone) < 10 or length(v_gift_phone) > 15 then
      return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('code', 'GIFT_RECIPIENT_INVALID')));
    end if;
    if v_theme not in ('classic', 'birthday', 'thanks', 'congrats', 'holiday', 'teacher', 'family', 'justbecause') then
      v_theme := 'classic';
    end if;
    if length(coalesce(v_gift ->> 'message', '')) > 600 then
      return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('code', 'GIFT_MESSAGE_TOO_LONG')));
    end if;
    if v_reveal is not null and (v_reveal < now() - interval '1 hour' or v_reveal > now() + interval '366 days') then
      return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('code', 'GIFT_REVEAL_INVALID')));
    end if;
  end if;

  -- delivery address
  if v_has_paper then
    v_street := nullif(trim(v_addr ->> 'street'), '');
    v_house := nullif(trim(v_addr ->> 'house'), '');
    v_apartment := nullif(trim(v_addr ->> 'apartment'), '');
    v_entrance := nullif(trim(v_addr ->> 'entrance'), '');
    v_comment := nullif(left(trim(coalesce(v_addr ->> 'comment', '')), 500), '');

    if v_addr_mode = 'sender' then
      v_rec_name := coalesce(nullif(trim(v_addr ->> 'recipient_name'), ''), case when v_is_gift then v_gift_name end, v_contact_name);
      v_rec_phone := coalesce(public.normalize_phone(v_addr ->> 'recipient_phone'), case when v_is_gift then v_gift_phone end, v_contact_phone);
      if v_quote ->> 'delivery_method' = 'astana_courier' then
        v_region := 'Астана';
        v_city := 'Астана';
        if v_street is null or v_house is null then
          return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('code', 'ADDRESS_INVALID')));
        end if;
      else
        v_region := nullif(trim(v_addr ->> 'region'), '');
        v_city := nullif(trim(v_addr ->> 'city'), '');
        v_postal := nullif(regexp_replace(coalesce(v_addr ->> 'postal_code', ''), '\s', '', 'g'), '');
        if v_region is null or v_city is null or v_postal is null or v_postal !~ '^[0-9]{6}$'
          or v_street is null or v_house is null or v_rec_name is null then
          return jsonb_build_object('ok', false, 'errors', jsonb_build_array(jsonb_build_object('code', 'ADDRESS_INVALID')));
        end if;
      end if;
    else
      -- the gift recipient will fill the address; sender only picks the delivery type
      v_rec_name := v_gift_name;
      v_rec_phone := v_gift_phone;
      if v_quote ->> 'delivery_method' = 'astana_courier' then
        v_region := 'Астана';
        v_city := 'Астана';
      else
        v_region := nullif(trim(v_addr ->> 'region'), '');
        v_city := nullif(trim(v_addr ->> 'city'), '');
      end if;
      v_street := null;
      v_house := null;
      v_apartment := null;
      v_entrance := null;
    end if;
  end if;

  insert into public.orders (
    user_id, status, items_subtotal, promotion_discount, promo_code_id, promo_code, promo_discount,
    delivery_method, delivery_price, gift_wrap, gift_wrap_price, total,
    contact_name, contact_phone, recipient_name, recipient_phone,
    delivery_region, delivery_city, delivery_postal_code, delivery_street, delivery_house,
    delivery_apartment, delivery_entrance, delivery_comment, customer_note,
    is_gift, has_paper, has_ebook
  ) values (
    v_uid, 'pending_payment',
    (v_quote ->> 'items_subtotal')::int,
    (v_quote ->> 'promotion_discount')::int,
    case when jsonb_typeof(v_promo) = 'object' then (v_promo ->> 'id')::uuid end,
    case when jsonb_typeof(v_promo) = 'object' then v_promo ->> 'code' end,
    (v_quote ->> 'promo_discount')::int,
    (v_quote ->> 'delivery_method')::public.delivery_method,
    (v_quote ->> 'delivery_price')::int,
    (v_quote ->> 'gift_wrap_price')::int > 0,
    (v_quote ->> 'gift_wrap_price')::int,
    (v_quote ->> 'total')::int,
    v_contact_name, v_contact_phone, v_rec_name, v_rec_phone,
    v_region, v_city, v_postal, v_street, v_house, v_apartment, v_entrance, v_comment,
    nullif(left(trim(coalesce(p_payload ->> 'customer_note', '')), 500), ''),
    v_is_gift, v_has_paper, (v_quote ->> 'has_ebook')::boolean
  )
  returning id, order_number into v_order_id, v_order_number;

  insert into public.order_items (
    order_id, book_id, format, title, author, cover_url, cover_palette, genre_id,
    unit_price, unit_final_price, quantity, line_total, promo_discount, promotion_id
  )
  select
    v_order_id,
    (l ->> 'book_id')::uuid,
    (l ->> 'format')::public.book_format,
    l ->> 'title',
    coalesce(l ->> 'author', ''),
    l ->> 'cover_url',
    coalesce((l ->> 'cover_palette')::smallint, 0),
    nullif(l ->> 'genre_id', '')::uuid,
    (l ->> 'unit_price')::int,
    (l ->> 'unit_final_price')::int,
    (l ->> 'quantity')::int,
    (l ->> 'line_total')::int,
    (l ->> 'promo_discount')::int,
    nullif(l ->> 'promotion_id', '')::uuid
  from jsonb_array_elements(v_quote -> 'lines') l;

  -- reserve stock
  for v_line in select value from jsonb_array_elements(v_quote -> 'lines') loop
    if v_line ->> 'format' = 'paper' then
      update public.books
      set stock = stock - (v_line ->> 'quantity')::int
      where id = (v_line ->> 'book_id')::uuid and stock >= (v_line ->> 'quantity')::int;
      get diagnostics v_updated = row_count;
      if v_updated = 0 then
        raise exception 'OUT_OF_STOCK';
      end if;
    end if;
  end loop;

  if jsonb_typeof(v_promo) = 'object' and coalesce((v_promo ->> 'valid')::boolean, false) then
    insert into public.promo_code_uses (promo_code_id, user_id, order_id, discount)
    values ((v_promo ->> 'id')::uuid, v_uid, v_order_id, (v_quote ->> 'promo_discount')::int);
    update public.promo_codes set used_count = used_count + 1 where id = (v_promo ->> 'id')::uuid;
  end if;

  if v_is_gift then
    insert into public.gifts (
      code, order_id, sender_id, sender_name, is_anonymous, recipient_name, recipient_phone,
      message, card_theme, reveal_at, address_mode, hide_price, status
    ) values (
      public.random_code(9), v_order_id, v_uid,
      coalesce(nullif(left(trim(coalesce(v_gift ->> 'sender_name', '')), 120), ''), v_contact_name),
      coalesce((v_gift ->> 'is_anonymous')::boolean, false),
      v_gift_name, v_gift_phone,
      coalesce(v_gift ->> 'message', ''),
      v_theme, v_reveal, v_addr_mode::public.gift_address_mode,
      coalesce((v_gift ->> 'hide_price')::boolean, true),
      'pending'
    );
  end if;

  -- clear ordered items from the synced cart
  delete from public.cart_items c
  using jsonb_array_elements(v_quote -> 'lines') l
  where c.user_id = v_uid
    and c.book_id = (l ->> 'book_id')::uuid
    and c.format::text = l ->> 'format';

  -- remember the address for the next checkout (own orders only)
  if v_has_paper and v_addr_mode = 'sender' and not v_is_gift then
    update public.profiles
    set saved_address = jsonb_build_object(
      'delivery_method', v_quote ->> 'delivery_method',
      'recipient_name', v_rec_name, 'recipient_phone', v_rec_phone,
      'region', v_region, 'city', v_city, 'postal_code', v_postal,
      'street', v_street, 'house', v_house, 'apartment', v_apartment, 'entrance', v_entrance
    )
    where id = v_uid;
  end if;

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total', (v_quote ->> 'total')::int
  );
end
$$;

-- ---------------------------------------------------------------------------
-- Status side effects
-- ---------------------------------------------------------------------------
create or replace function public.orders_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    -- digital-only orders are complete as soon as the payment is confirmed
    if new.status = 'paid' and not new.has_paper then
      new.status := 'delivered';
    end if;
    if new.status in ('paid', 'shipped', 'delivered') and old.status not in ('paid', 'shipped', 'delivered') then
      new.payment_confirmed_at := coalesce(new.payment_confirmed_at, now());
      new.payment_confirmed_by := coalesce(new.payment_confirmed_by, (select auth.uid()));
    end if;
    if new.status = 'shipped' then
      new.shipped_at := coalesce(new.shipped_at, now());
    end if;
    if new.status = 'delivered' then
      new.delivered_at := coalesce(new.delivered_at, now());
    end if;
    if new.status = 'cancelled' then
      new.cancelled_at := now();
    end if;
  end if;
  return new;
end
$$;

create or replace function public.orders_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.order_status_history (order_id, status, note, changed_by)
  values (new.id, new.status, null, new.user_id);
  return null;
end
$$;

create or replace function public.orders_after_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_was_paid boolean := old.status in ('paid', 'shipped', 'delivered');
  v_is_paid boolean := new.status in ('paid', 'shipped', 'delivered');
begin
  if new.status is not distinct from old.status then
    return null;
  end if;

  insert into public.order_status_history (order_id, status, note, changed_by)
  values (new.id, new.status, nullif(current_setting('app.status_note', true), ''), (select auth.uid()));

  if v_is_paid and not v_was_paid then
    update public.books b
    set sold_count = b.sold_count + x.qty
    from (
      select book_id, sum(quantity)::int as qty
      from public.order_items
      where order_id = new.id and book_id is not null
      group by book_id
    ) x
    where b.id = x.book_id;

    if not new.is_gift and new.user_id is not null then
      insert into public.entitlements (user_id, book_id, source, order_id)
      select new.user_id, oi.book_id, 'purchase', new.id
      from public.order_items oi
      where oi.order_id = new.id and oi.format = 'ebook' and oi.book_id is not null
      on conflict (user_id, book_id) do nothing;
    end if;

    if new.is_gift then
      update public.gifts set status = 'active' where order_id = new.id and status = 'pending';
      update public.gifts g
      set recipient_user_id = p.id
      from public.profiles p
      where g.order_id = new.id and g.recipient_user_id is null and p.phone = g.recipient_phone;
    end if;
  end if;

  if new.status = 'cancelled' then
    if old.status not in ('shipped', 'delivered') then
      update public.books b
      set stock = b.stock + x.qty
      from (
        select book_id, sum(quantity)::int as qty
        from public.order_items
        where order_id = new.id and format = 'paper' and book_id is not null
        group by book_id
      ) x
      where b.id = x.book_id;
    end if;

    if v_was_paid then
      update public.books b
      set sold_count = greatest(0, b.sold_count - x.qty)
      from (
        select book_id, sum(quantity)::int as qty
        from public.order_items
        where order_id = new.id and book_id is not null
        group by book_id
      ) x
      where b.id = x.book_id;
    end if;

    delete from public.entitlements where order_id = new.id;
    update public.gifts set status = 'cancelled' where order_id = new.id;

    with u as (
      delete from public.promo_code_uses where order_id = new.id returning promo_code_id
    )
    update public.promo_codes pc
    set used_count = greatest(0, pc.used_count - 1)
    from u
    where pc.id = u.promo_code_id;
  end if;

  return null;
end
$$;

create trigger orders_before_update before update on public.orders
  for each row execute function public.orders_before_update();
create trigger orders_after_insert after insert on public.orders
  for each row execute function public.orders_after_insert();
create trigger orders_after_status after update of status on public.orders
  for each row execute function public.orders_after_status();

-- ---------------------------------------------------------------------------
-- Client order actions
-- ---------------------------------------------------------------------------
create or replace function public.mark_order_paid(p_order_id uuid, p_receipt_path text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  o public.orders;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED');
  end if;
  select * into o from public.orders where id = p_order_id and user_id = v_uid for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;
  if o.status not in ('pending_payment', 'payment_review') then
    return jsonb_build_object('ok', false, 'error', 'INVALID_STATUS');
  end if;
  if p_receipt_path is not null and p_receipt_path not like v_uid::text || '/%' then
    return jsonb_build_object('ok', false, 'error', 'INVALID_RECEIPT');
  end if;
  perform set_config('app.status_note', 'client: payment sent', true);
  update public.orders
  set status = 'payment_review',
      payment_marked_at = now(),
      payment_receipt_path = coalesce(p_receipt_path, payment_receipt_path)
  where id = o.id;
  return jsonb_build_object('ok', true, 'order_number', o.order_number);
end
$$;

create or replace function public.cancel_my_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  o public.orders;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED');
  end if;
  select * into o from public.orders where id = p_order_id and user_id = v_uid for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;
  if o.status <> 'pending_payment' then
    return jsonb_build_object('ok', false, 'error', 'INVALID_STATUS');
  end if;
  perform set_config('app.status_note', 'client: cancelled', true);
  update public.orders set status = 'cancelled', cancel_reason = 'CLIENT_CANCELLED' where id = o.id;
  return jsonb_build_object('ok', true);
end
$$;

-- ---------------------------------------------------------------------------
-- Admin order actions (validated status transitions)
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_order(
  p_order_id uuid,
  p_status public.order_status default null,
  p_note text default null,
  p_tracking_number text default null,
  p_admin_note text default null,
  p_cancel_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  v_allowed boolean;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;

  if p_status is not null and p_status <> o.status then
    v_allowed := case o.status
      when 'pending_payment' then p_status in ('payment_review', 'paid', 'cancelled')
      when 'payment_review' then p_status in ('pending_payment', 'paid', 'cancelled')
      when 'paid' then p_status in ('shipped', 'delivered', 'cancelled')
      when 'shipped' then p_status in ('delivered', 'cancelled')
      when 'delivered' then p_status in ('cancelled')
      else false
    end;
    if not v_allowed then
      return jsonb_build_object('ok', false, 'error', 'INVALID_TRANSITION');
    end if;
    perform set_config('app.status_note', coalesce(left(p_note, 500), ''), true);
    update public.orders
    set status = p_status,
        tracking_number = coalesce(nullif(trim(p_tracking_number), ''), tracking_number),
        admin_note = coalesce(p_admin_note, admin_note),
        cancel_reason = case
          when p_status = 'cancelled' then coalesce(nullif(trim(p_cancel_reason), ''), cancel_reason, 'ADMIN_CANCELLED')
          else cancel_reason
        end
    where id = p_order_id;
  else
    update public.orders
    set tracking_number = coalesce(nullif(trim(p_tracking_number), ''), tracking_number),
        admin_note = coalesce(p_admin_note, admin_note)
    where id = p_order_id;
  end if;

  select * into o from public.orders where id = p_order_id;
  return jsonb_build_object('ok', true, 'status', o.status);
end
$$;

-- Auto-cancel unpaid orders (scheduled with pg_cron)
create or replace function public.cancel_stale_orders()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hours int;
  v_count int;
begin
  select order_auto_cancel_hours into v_hours from public.store_settings where id = 1;
  perform set_config('app.status_note', 'auto: payment timeout', true);
  update public.orders
  set status = 'cancelled', cancel_reason = coalesce(cancel_reason, 'AUTO_TIMEOUT')
  where status = 'pending_payment'
    and created_at < now() - make_interval(hours => coalesce(v_hours, 72));
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

-- ---------------------------------------------------------------------------
-- Gifts («Досыңа сыйла»)
-- ---------------------------------------------------------------------------
create or replace function public.get_gift(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  g public.gifts;
  o public.orders;
  v_phone text;
  v_is_sender boolean;
  v_is_recipient boolean;
  v_revealed boolean;
  v_items jsonb := '[]'::jsonb;
begin
  select * into g from public.gifts where code = p_code;
  if not found then
    return null;
  end if;
  v_is_sender := v_uid is not null and g.sender_id = v_uid;
  if g.status in ('pending', 'cancelled') and not v_is_sender and not public.is_admin() then
    return null;
  end if;

  select * into o from public.orders where id = g.order_id;
  if v_uid is not null then
    select phone into v_phone from public.profiles where id = v_uid;
  end if;
  v_is_recipient := v_uid is not null and (g.recipient_user_id = v_uid or v_phone = g.recipient_phone);
  v_revealed := g.reveal_at is null or g.reveal_at <= now();

  if v_revealed or v_is_sender then
    select coalesce(jsonb_agg(jsonb_build_object(
      'book_id', oi.book_id, 'slug', b.slug, 'title', oi.title, 'author', oi.author,
      'cover_url', oi.cover_url, 'cover_palette', oi.cover_palette,
      'format', oi.format, 'quantity', oi.quantity
    ) order by oi.format, oi.title), '[]'::jsonb)
    into v_items
    from public.order_items oi
    left join public.books b on b.id = oi.book_id
    where oi.order_id = g.order_id;
  end if;

  return jsonb_build_object(
    'code', g.code,
    'status', g.status,
    'card_theme', g.card_theme,
    'message', case when v_revealed or v_is_sender then g.message else '' end,
    'sender_name', case when g.is_anonymous and not v_is_sender then null else g.sender_name end,
    'is_anonymous', g.is_anonymous,
    'recipient_name', g.recipient_name,
    'recipient_phone_masked', public.mask_phone(g.recipient_phone),
    'reveal_at', g.reveal_at,
    'revealed', v_revealed,
    'is_sender', v_is_sender,
    'is_recipient', v_is_recipient,
    'has_paper', o.has_paper,
    'has_ebook', o.has_ebook,
    'delivery_method', o.delivery_method,
    'delivery_city', o.delivery_city,
    'address_mode', g.address_mode,
    'needs_address', g.address_mode = 'recipient' and o.has_paper and g.address_submitted_at is null
                     and g.status in ('active', 'opened', 'claimed'),
    'address_submitted', g.address_submitted_at is not null,
    'order_status', o.status,
    'tracking_number', case when v_is_sender or v_is_recipient then o.tracking_number end,
    'opened_at', g.opened_at,
    'claimed', g.claimed_at is not null,
    'claimed_by_me', g.recipient_user_id is not null and g.recipient_user_id = v_uid and g.claimed_at is not null,
    'thank_you_message', g.thank_you_message,
    'thanked_at', g.thanked_at,
    'created_at', g.created_at,
    'items', v_items
  );
end
$$;

create or replace function public.open_gift(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  g public.gifts;
begin
  select * into g from public.gifts where code = p_code for update;
  if not found or g.status not in ('active', 'opened', 'claimed') then
    return jsonb_build_object('ok', false, 'error', 'NOT_AVAILABLE');
  end if;
  if g.reveal_at is not null and g.reveal_at > now() then
    return jsonb_build_object('ok', false, 'error', 'NOT_REVEALED');
  end if;
  if v_uid is not null and g.sender_id = v_uid then
    return jsonb_build_object('ok', true, 'first_open', false);
  end if;
  update public.gifts
  set opened_at = coalesce(opened_at, now()),
      status = case when status = 'active' then 'opened'::public.gift_status else status end
  where id = g.id;
  return jsonb_build_object('ok', true, 'first_open', g.opened_at is null);
end
$$;

create or replace function public.claim_gift(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  g public.gifts;
  v_phone text;
  v_count int := 0;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED');
  end if;
  select * into g from public.gifts where code = p_code for update;
  if not found or g.status not in ('active', 'opened', 'claimed') then
    return jsonb_build_object('ok', false, 'error', 'NOT_AVAILABLE');
  end if;
  if g.reveal_at is not null and g.reveal_at > now() then
    return jsonb_build_object('ok', false, 'error', 'NOT_REVEALED');
  end if;
  select phone into v_phone from public.profiles where id = v_uid;
  if v_phone is distinct from g.recipient_phone then
    return jsonb_build_object('ok', false, 'error', 'PHONE_MISMATCH',
      'recipient_phone_masked', public.mask_phone(g.recipient_phone));
  end if;
  if g.recipient_user_id is not null and g.recipient_user_id <> v_uid then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_CLAIMED');
  end if;

  insert into public.entitlements (user_id, book_id, source, order_id, gift_id)
  select v_uid, oi.book_id, 'gift', g.order_id, g.id
  from public.order_items oi
  where oi.order_id = g.order_id and oi.format = 'ebook' and oi.book_id is not null
  on conflict (user_id, book_id) do nothing;
  get diagnostics v_count = row_count;

  update public.gifts
  set recipient_user_id = v_uid,
      claimed_at = coalesce(claimed_at, now()),
      opened_at = coalesce(opened_at, now()),
      status = 'claimed'
  where id = g.id;

  return jsonb_build_object('ok', true, 'ebooks', v_count, 'first_claim', g.claimed_at is null);
end
$$;

create or replace function public.submit_gift_address(p_code text, p_phone text, p_address jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.gifts;
  o public.orders;
  v_phone text := public.normalize_phone(p_phone);
  v_region text;
  v_city text;
  v_postal text;
  v_street text := nullif(trim(p_address ->> 'street'), '');
  v_house text := nullif(trim(p_address ->> 'house'), '');
  v_name text := nullif(left(trim(coalesce(p_address ->> 'recipient_name', '')), 120), '');
begin
  select * into g from public.gifts where code = p_code for update;
  if not found or g.status not in ('active', 'opened', 'claimed') then
    return jsonb_build_object('ok', false, 'error', 'NOT_AVAILABLE');
  end if;
  if g.address_mode <> 'recipient' then
    return jsonb_build_object('ok', false, 'error', 'NOT_ALLOWED');
  end if;
  if g.address_submitted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_SUBMITTED');
  end if;
  if v_phone is distinct from g.recipient_phone then
    return jsonb_build_object('ok', false, 'error', 'PHONE_MISMATCH');
  end if;
  select * into o from public.orders where id = g.order_id for update;
  if not o.has_paper or o.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'error', 'NOT_ALLOWED');
  end if;

  if o.delivery_method = 'astana_courier' then
    v_region := 'Астана';
    v_city := 'Астана';
    if v_street is null or v_house is null then
      return jsonb_build_object('ok', false, 'error', 'ADDRESS_INVALID');
    end if;
  else
    v_region := nullif(trim(p_address ->> 'region'), '');
    v_city := nullif(trim(p_address ->> 'city'), '');
    v_postal := nullif(regexp_replace(coalesce(p_address ->> 'postal_code', ''), '\s', '', 'g'), '');
    if v_region is null or v_city is null or v_postal is null or v_postal !~ '^[0-9]{6}$'
      or v_street is null or v_house is null then
      return jsonb_build_object('ok', false, 'error', 'ADDRESS_INVALID');
    end if;
  end if;

  update public.orders
  set recipient_name = coalesce(v_name, g.recipient_name),
      recipient_phone = g.recipient_phone,
      delivery_region = v_region,
      delivery_city = v_city,
      delivery_postal_code = v_postal,
      delivery_street = v_street,
      delivery_house = v_house,
      delivery_apartment = nullif(trim(p_address ->> 'apartment'), ''),
      delivery_entrance = nullif(trim(p_address ->> 'entrance'), ''),
      delivery_comment = nullif(left(trim(coalesce(p_address ->> 'comment', '')), 500), '')
  where id = o.id;

  update public.gifts
  set address_submitted_at = now(),
      opened_at = coalesce(opened_at, now()),
      status = case when status = 'active' then 'opened'::public.gift_status else status end
  where id = g.id;

  return jsonb_build_object('ok', true, 'order_number', o.order_number);
end
$$;

create or replace function public.send_gift_thanks(p_code text, p_phone text, p_message text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  g public.gifts;
  v_msg text := nullif(trim(coalesce(p_message, '')), '');
begin
  select * into g from public.gifts where code = p_code for update;
  if not found or g.status not in ('active', 'opened', 'claimed') then
    return jsonb_build_object('ok', false, 'error', 'NOT_AVAILABLE');
  end if;
  if g.reveal_at is not null and g.reveal_at > now() then
    return jsonb_build_object('ok', false, 'error', 'NOT_REVEALED');
  end if;
  if not ((v_uid is not null and g.recipient_user_id = v_uid)
          or public.normalize_phone(p_phone) = g.recipient_phone) then
    return jsonb_build_object('ok', false, 'error', 'PHONE_MISMATCH');
  end if;
  if v_msg is null or length(v_msg) > 500 then
    return jsonb_build_object('ok', false, 'error', 'MESSAGE_INVALID');
  end if;
  update public.gifts set thank_you_message = v_msg, thanked_at = now() where id = g.id;
  return jsonb_build_object('ok', true);
end
$$;

-- Gifts addressed to the signed-in user (by account or by phone)
create or replace function public.received_gifts()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_phone text;
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;
  select phone into v_phone from public.profiles where id = v_uid;
  return coalesce((
    select jsonb_agg(x.j order by x.created_at desc)
    from (
      select g.created_at, jsonb_build_object(
        'code', g.code,
        'status', g.status,
        'card_theme', g.card_theme,
        'sender_name', case when g.is_anonymous then null else g.sender_name end,
        'revealed', g.reveal_at is null or g.reveal_at <= now(),
        'reveal_at', g.reveal_at,
        'claimed', g.claimed_at is not null,
        'created_at', g.created_at,
        'items', case when g.reveal_at is null or g.reveal_at <= now() then (
          select coalesce(jsonb_agg(jsonb_build_object(
            'title', oi.title, 'author', oi.author, 'cover_url', oi.cover_url,
            'cover_palette', oi.cover_palette, 'format', oi.format)), '[]'::jsonb)
          from public.order_items oi where oi.order_id = g.order_id
        ) else '[]'::jsonb end
      ) as j
      from public.gifts g
      where (g.recipient_user_id = v_uid or g.recipient_phone = v_phone)
        and g.status in ('active', 'opened', 'claimed')
    ) x
  ), '[]'::jsonb);
end
$$;

-- Called when a new account is created: link gifts sent to this phone.
create or replace function public.attach_pending_gifts(p_user uuid, p_phone text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.gifts
  set recipient_user_id = p_user
  where recipient_phone = p_phone
    and recipient_user_id is null
    and status in ('active', 'opened')
$$;

-- ---------------------------------------------------------------------------
-- Grants: internal functions are not callable from the API
-- ---------------------------------------------------------------------------
revoke execute on function public._quote_cart(uuid, jsonb, text, text, boolean, boolean) from public, anon, authenticated;
revoke execute on function public.cancel_stale_orders() from public, anon, authenticated;
revoke execute on function public.attach_pending_gifts(uuid, text) from public, anon, authenticated;
revoke execute on function public.orders_after_status() from public, anon, authenticated;
revoke execute on function public.orders_after_insert() from public, anon, authenticated;

grant execute on function public.quote_cart(jsonb, text, text, boolean, boolean) to anon, authenticated;
grant execute on function public.create_order(jsonb) to authenticated;
grant execute on function public.mark_order_paid(uuid, text) to authenticated;
grant execute on function public.cancel_my_order(uuid) to authenticated;
grant execute on function public.admin_update_order(uuid, public.order_status, text, text, text, text) to authenticated;
grant execute on function public.get_gift(text) to anon, authenticated;
grant execute on function public.open_gift(text) to anon, authenticated;
grant execute on function public.claim_gift(text) to authenticated;
grant execute on function public.submit_gift_address(text, text, jsonb) to anon, authenticated;
grant execute on function public.send_gift_thanks(text, text, text) to anon, authenticated;
grant execute on function public.received_gifts() to authenticated;
revoke execute on function public.create_order(jsonb) from anon;
revoke execute on function public.claim_gift(text) from anon;
revoke execute on function public.received_gifts() from anon;
revoke execute on function public.mark_order_paid(uuid, text) from anon;
revoke execute on function public.cancel_my_order(uuid) from anon;
revoke execute on function public.admin_update_order(uuid, public.order_status, text, text, text, text) from anon;
