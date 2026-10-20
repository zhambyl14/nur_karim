-- QA (ebook-gift): cancelling an order deletes the entitlements created by it
-- (orders_after_status). When the same reader also owns the e-book through
-- another paid order or a claimed gift (entitlement insert was skipped with
-- ON CONFLICT DO NOTHING), they must keep it. This trigger fires after
-- orders_after_status (alphabetical order) and grants those e-books back.
create or replace function public.orders_after_status_regrant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'cancelled' or old.status = 'cancelled' then
    return null;
  end if;

  -- own purchases in other paid orders
  insert into public.entitlements (user_id, book_id, source, order_id)
  select distinct on (o.user_id, oi.book_id) o.user_id, oi.book_id, 'purchase', o.id
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.format = 'ebook'
    and oi.book_id in (
      select x.book_id from public.order_items x
      where x.order_id = new.id and x.format = 'ebook' and x.book_id is not null
    )
    and o.id <> new.id
    and not o.is_gift
    and o.user_id is not null
    and o.status in ('paid', 'shipped', 'delivered')
  order by o.user_id, oi.book_id, o.created_at
  on conflict (user_id, book_id) do nothing;

  -- claimed gifts from other paid orders
  insert into public.entitlements (user_id, book_id, source, order_id, gift_id)
  select distinct on (g.recipient_user_id, oi.book_id) g.recipient_user_id, oi.book_id, 'gift', o.id, g.id
  from public.gifts g
  join public.orders o on o.id = g.order_id
  join public.order_items oi on oi.order_id = o.id
  where oi.format = 'ebook'
    and oi.book_id in (
      select x.book_id from public.order_items x
      where x.order_id = new.id and x.format = 'ebook' and x.book_id is not null
    )
    and o.id <> new.id
    and g.claimed_at is not null
    and g.recipient_user_id is not null
    and g.status = 'claimed'
    and o.status in ('paid', 'shipped', 'delivered')
  order by g.recipient_user_id, oi.book_id, g.claimed_at
  on conflict (user_id, book_id) do nothing;

  return null;
end
$$;

revoke execute on function public.orders_after_status_regrant() from public, anon, authenticated;

drop trigger if exists orders_after_status_regrant on public.orders;
create trigger orders_after_status_regrant after update of status on public.orders
  for each row execute function public.orders_after_status_regrant();
