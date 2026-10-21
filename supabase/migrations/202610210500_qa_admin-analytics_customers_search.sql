-- QA (admin-analytics): admin_customers search fixes
--  * "+7 700 000 55 01" / "77000005501" did not find 87000005501 (phones are stored with a leading 8)
--  * "%", "_" were LIKE wildcards and "@" matched every customer (empty telegram pattern)

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
  v_like text;
  v_tg text;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if v_digits is not null and length(v_digits) = 11 and left(v_digits, 1) = '7' then
    v_digits := '8' || substr(v_digits, 2);
  end if;
  v_like := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');
  v_tg := nullif(ltrim(v_like, '@'), '');

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
      or lower(p.full_name) like '%' || v_like || '%'
      or (v_tg is not null and lower(coalesce(p.telegram_username, '')) like '%' || v_tg || '%')
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

revoke execute on function public.admin_customers(text, int, int, text) from public, anon;
grant execute on function public.admin_customers(text, int, int, text) to authenticated;
