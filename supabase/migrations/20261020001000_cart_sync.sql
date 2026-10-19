-- Nur Karim: cart sync across devices + per-user counters for header badges

create or replace function public.replace_cart(p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return;
  end if;
  delete from public.cart_items where user_id = v_uid;
  insert into public.cart_items (user_id, book_id, format, quantity)
  select v_uid, x.book_id, x.format,
         case when x.format = 'ebook' then 1 else least(99, greatest(1, x.quantity)) end
  from (
    select (e ->> 'book_id')::uuid as book_id,
           (e ->> 'format')::public.book_format as format,
           max(coalesce((e ->> 'quantity')::int, 1)) as quantity
    from jsonb_array_elements(
      case when jsonb_typeof(p_items) = 'array' then p_items else '[]'::jsonb end
    ) e
    group by 1, 2
    limit 60
  ) x
  where exists (select 1 from public.books b where b.id = x.book_id);
end
$$;

create or replace function public.my_counters()
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
    return jsonb_build_object('unread_messages', 0, 'gifts_waiting', 0, 'orders_active', 0);
  end if;
  select phone into v_phone from public.profiles where id = v_uid;
  return jsonb_build_object(
    'unread_messages', (
      select coalesce(sum(user_unread), 0) from public.conversations where user_id = v_uid
    ),
    'gifts_waiting', (
      select count(*) from public.gifts g
      where (g.recipient_user_id = v_uid or g.recipient_phone = v_phone)
        and g.status in ('active', 'opened')
        and g.claimed_at is null
        and (g.sender_id is distinct from v_uid)
    ),
    'orders_active', (
      select count(*) from public.orders
      where user_id = v_uid and status in ('pending_payment', 'payment_review', 'paid', 'shipped')
    )
  );
end
$$;

revoke execute on function public.replace_cart(jsonb) from public, anon;
revoke execute on function public.my_counters() from public, anon;
grant execute on function public.replace_cart(jsonb) to authenticated;
grant execute on function public.my_counters() to authenticated;
