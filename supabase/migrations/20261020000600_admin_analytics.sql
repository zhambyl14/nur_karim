-- Nur Karim: admin analytics (dashboard), customers list, sidebar counters.
-- Revenue = orders in paid/shipped/delivered, attributed to the order date
-- (Asia/Almaty, UTC+5).

create or replace function public.admin_dashboard(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz constant text := 'Asia/Almaty';
  v_prev_from timestamptz;
  v_last_local timestamp;
  v_month_from_local timestamp;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to <= p_from then
    raise exception 'INVALID_RANGE' using errcode = '22023';
  end if;
  if p_to - p_from > interval '3 years' then
    raise exception 'RANGE_TOO_LONG' using errcode = '22023';
  end if;

  v_prev_from := p_from - (p_to - p_from);
  v_last_local := (p_to - interval '1 second') at time zone v_tz;
  v_month_from_local := date_trunc('month', v_last_local) - interval '11 months';

  with
  cur as (
    select o.* from public.orders o
    where o.created_at >= p_from and o.created_at < p_to
  ),
  cur_paid as (
    select * from cur where status in ('paid', 'shipped', 'delivered')
  ),
  prev_paid as (
    select o.* from public.orders o
    where o.created_at >= v_prev_from and o.created_at < p_from
      and o.status in ('paid', 'shipped', 'delivered')
  ),
  cur_items as (
    select oi.*, (oi.line_total - oi.promo_discount) as net
    from public.order_items oi
    join cur_paid o on o.id = oi.order_id
  )
  select jsonb_build_object(
    'range', jsonb_build_object('from', p_from, 'to', p_to, 'prev_from', v_prev_from),
    'kpis', (
      select jsonb_build_object(
        'revenue', coalesce(sum(total), 0),
        'orders', count(*),
        'aov', coalesce(round(avg(total)), 0),
        'delivery_revenue', coalesce(sum(delivery_price), 0),
        'discounts', coalesce(sum(promotion_discount + promo_discount), 0),
        'gift_orders', count(*) filter (where is_gift),
        'customers', count(distinct user_id)
      )
      from cur_paid
    ),
    'kpis_prev', (
      select jsonb_build_object(
        'revenue', coalesce(sum(total), 0),
        'orders', count(*),
        'aov', coalesce(round(avg(total)), 0),
        'customers', count(distinct user_id)
      )
      from prev_paid
    ),
    'items_sold', (select coalesce(sum(quantity), 0) from cur_items),
    'items_sold_prev', (
      select coalesce(sum(oi.quantity), 0)
      from public.order_items oi join prev_paid p on p.id = oi.order_id
    ),
    'new_customers', (
      select count(*) from public.profiles
      where role = 'client' and created_at >= p_from and created_at < p_to
    ),
    'new_customers_prev', (
      select count(*) from public.profiles
      where role = 'client' and created_at >= v_prev_from and created_at < p_from
    ),
    'customers_total', (select count(*) from public.profiles where role = 'client'),
    'orders_created', (select count(*) from cur),
    'cancelled', (select count(*) from cur where status = 'cancelled'),
    'pending', (
      select jsonb_build_object(
        'pending_payment', count(*) filter (where status = 'pending_payment'),
        'payment_review', count(*) filter (where status = 'payment_review'),
        'to_ship', count(*) filter (where status = 'paid'),
        'shipped', count(*) filter (where status = 'shipped')
      )
      from public.orders
    ),
    'by_day', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', to_char(d.day, 'YYYY-MM-DD'),
        'revenue', coalesce(x.revenue, 0),
        'orders', coalesce(x.orders, 0)
      ) order by d.day), '[]'::jsonb)
      from generate_series(
        date_trunc('day', p_from at time zone v_tz),
        date_trunc('day', v_last_local),
        interval '1 day'
      ) as d (day)
      left join (
        select date_trunc('day', created_at at time zone v_tz) as day,
               sum(total) as revenue, count(*) as orders
        from cur_paid group by 1
      ) x on x.day = d.day
    ),
    'by_month', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'month', to_char(m.month, 'YYYY-MM'),
        'revenue', coalesce(x.revenue, 0),
        'orders', coalesce(x.orders, 0)
      ) order by m.month), '[]'::jsonb)
      from generate_series(v_month_from_local, date_trunc('month', v_last_local), interval '1 month') as m (month)
      left join (
        select date_trunc('month', o.created_at at time zone v_tz) as month,
               sum(o.total) as revenue, count(*) as orders
        from public.orders o
        where o.status in ('paid', 'shipped', 'delivered')
          and o.created_at >= (v_month_from_local at time zone v_tz)
          and o.created_at < p_to
        group by 1
      ) x on x.month = m.month
    ),
    'by_city', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'city', t.city, 'orders', t.orders, 'revenue', t.revenue
      ) order by t.revenue desc), '[]'::jsonb)
      from (
        select
          case
            when delivery_method = 'digital' then '__digital'
            when coalesce(trim(delivery_city), '') = '' then '__unknown'
            else initcap(trim(delivery_city))
          end as city,
          count(*) as orders,
          sum(total) as revenue
        from cur_paid
        group by 1
        order by 3 desc
        limit 25
      ) t
    ),
    'top_books', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'book_id', t.book_id, 'title', t.title, 'units', t.units, 'revenue', t.revenue,
        'paper_units', t.paper_units, 'ebook_units', t.ebook_units
      ) order by t.revenue desc), '[]'::jsonb)
      from (
        select book_id, max(title) as title,
               sum(quantity) as units, sum(net) as revenue,
               sum(quantity) filter (where format = 'paper') as paper_units,
               sum(quantity) filter (where format = 'ebook') as ebook_units
        from cur_items
        group by book_id
        order by sum(net) desc
        limit 15
      ) t
    ),
    'by_genre', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'genre_id', t.genre_id, 'name_kk', t.name_kk, 'name_ru', t.name_ru,
        'units', t.units, 'revenue', t.revenue
      ) order by t.revenue desc), '[]'::jsonb)
      from (
        select ci.genre_id, g.name_kk, g.name_ru,
               sum(ci.quantity) as units, sum(ci.net) as revenue
        from cur_items ci
        left join public.genres g on g.id = ci.genre_id
        group by ci.genre_id, g.name_kk, g.name_ru
      ) t
    ),
    'by_format', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'format', t.format, 'units', t.units, 'revenue', t.revenue
      )), '[]'::jsonb)
      from (
        select format, sum(quantity) as units, sum(net) as revenue
        from cur_items group by format
      ) t
    ),
    'by_delivery', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'method', t.delivery_method, 'orders', t.orders, 'revenue', t.revenue
      )), '[]'::jsonb)
      from (
        select delivery_method, count(*) as orders, sum(total) as revenue
        from cur_paid group by delivery_method
      ) t
    ),
    'by_status', (
      select coalesce(jsonb_agg(jsonb_build_object('status', t.status, 'orders', t.orders)), '[]'::jsonb)
      from (select status, count(*) as orders from cur group by status) t
    ),
    'heatmap', (
      select coalesce(jsonb_agg(jsonb_build_object('dow', t.dow, 'hour', t.hour, 'orders', t.n)), '[]'::jsonb)
      from (
        select extract(isodow from created_at at time zone v_tz)::int as dow,
               extract(hour from created_at at time zone v_tz)::int as hour,
               count(*) as n
        from cur_paid group by 1, 2
      ) t
    ),
    'promo_codes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'code', t.promo_code, 'uses', t.uses, 'discount', t.discount, 'revenue', t.revenue
      ) order by t.uses desc), '[]'::jsonb)
      from (
        select promo_code, count(*) as uses, sum(promo_discount) as discount, sum(total) as revenue
        from cur_paid where promo_code is not null group by promo_code
      ) t
    ),
    'top_customers', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'user_id', t.user_id, 'full_name', t.full_name, 'phone', t.phone,
        'orders', t.orders, 'revenue', t.revenue
      ) order by t.revenue desc), '[]'::jsonb)
      from (
        select o.user_id, p.full_name, p.phone, count(*) as orders, sum(o.total) as revenue
        from cur_paid o left join public.profiles p on p.id = o.user_id
        where o.user_id is not null
        group by o.user_id, p.full_name, p.phone
        order by sum(o.total) desc
        limit 10
      ) t
    ),
    'low_stock', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', b.id, 'title', b.title, 'author', b.author, 'stock', b.stock,
        'cover_url', b.cover_url, 'cover_palette', b.cover_palette
      ) order by b.stock, b.title), '[]'::jsonb)
      from (
        select * from public.books
        where paper_enabled and is_published and stock <= 5
        order by stock, title
        limit 12
      ) b
    ),
    'recent_orders', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id, 'order_number', t.order_number, 'contact_name', t.contact_name,
        'total', t.total, 'status', t.status, 'created_at', t.created_at,
        'items_count', t.items_count, 'has_paper', t.has_paper, 'has_ebook', t.has_ebook,
        'is_gift', t.is_gift, 'delivery_city', t.delivery_city
      ) order by t.created_at desc), '[]'::jsonb)
      from (
        select o.*, (select coalesce(sum(quantity), 0) from public.order_items oi where oi.order_id = o.id) as items_count
        from public.orders o
        order by o.created_at desc
        limit 10
      ) t
    )
  )
  into v_result;

  return v_result;
end
$$;

-- Customers with aggregates (search by phone digits, name or telegram username)
create or replace function public.admin_customers(
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0,
  p_sort text default 'recent'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(lower(trim(coalesce(p_search, ''))), '');
  v_digits text := nullif(regexp_replace(coalesce(p_search, ''), '[^0-9]', '', 'g'), '');
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  with base as (
    select
      p.id, p.phone, p.full_name, p.telegram_username, p.telegram_id is not null as has_telegram,
      p.role, p.created_at,
      count(o.id) as orders,
      count(o.id) filter (where o.status in ('paid', 'shipped', 'delivered')) as paid_orders,
      coalesce(sum(o.total) filter (where o.status in ('paid', 'shipped', 'delivered')), 0) as total_spent,
      max(o.created_at) as last_order_at,
      (select count(*) from public.entitlements e where e.user_id = p.id) as ebooks
    from public.profiles p
    left join public.orders o on o.user_id = p.id
    where v_q is null
      or (v_digits is not null and length(v_digits) >= 3 and p.phone like '%' || v_digits || '%')
      or lower(p.full_name) like '%' || v_q || '%'
      or lower(coalesce(p.telegram_username, '')) like '%' || ltrim(v_q, '@') || '%'
    group by p.id
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'rows', coalesce((
      select jsonb_agg(to_jsonb(b))
      from (
        select * from base
        order by
          case when p_sort = 'spent' then total_spent end desc nulls last,
          case when p_sort = 'orders' then orders end desc nulls last,
          case when p_sort = 'last_order' then last_order_at end desc nulls last,
          created_at desc
        limit greatest(1, least(coalesce(p_limit, 50), 200))
        offset greatest(0, coalesce(p_offset, 0))
      ) b
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end
$$;

-- Badges for the admin navigation
create or replace function public.admin_counters()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'pending_payment', (select count(*) from public.orders where status = 'pending_payment'),
    'payment_review', (select count(*) from public.orders where status = 'payment_review'),
    'to_ship', (select count(*) from public.orders where status = 'paid'),
    'unread_messages', (select coalesce(sum(admin_unread), 0) from public.conversations),
    'low_stock', (select count(*) from public.books where paper_enabled and is_published and stock <= 5),
    'new_reviews', (select count(*) from public.reviews where created_at > now() - interval '7 days'),
    'gifts_waiting_address', (
      select count(*) from public.gifts g join public.orders o on o.id = g.order_id
      where g.address_mode = 'recipient' and g.address_submitted_at is null
        and g.status in ('active', 'opened', 'claimed') and o.has_paper
    )
  );
end
$$;

revoke execute on function public.admin_dashboard(timestamptz, timestamptz) from public, anon;
revoke execute on function public.admin_customers(text, int, int, text) from public, anon;
revoke execute on function public.admin_counters() from public, anon;
grant execute on function public.admin_dashboard(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_customers(text, int, int, text) to authenticated;
grant execute on function public.admin_counters() to authenticated;
