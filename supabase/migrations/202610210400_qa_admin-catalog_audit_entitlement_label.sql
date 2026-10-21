-- QA admin-catalog: the activity log labelled e-book access rows with the raw
-- book id. Store the book title instead (falls back to the id), so the entry
-- stays readable even after the book is deleted. Reading a table means the
-- function can no longer be immutable.

create or replace function public.audit_label(p_table text, p_row jsonb)
returns text
language sql
stable
set search_path = ''
as $$
  select left(coalesce(
    case p_table
      when 'orders' then '#' || (p_row ->> 'order_number')
      when 'promo_codes' then p_row ->> 'code'
      when 'genres' then p_row ->> 'name_kk'
      when 'promotions' then nullif(p_row ->> 'title_kk', '')
      when 'banners' then nullif(p_row ->> 'title_kk', '')
      when 'profiles' then coalesce(nullif(p_row ->> 'full_name', ''), p_row ->> 'phone')
      when 'store_settings' then 'store_settings'
      when 'reviews' then p_row ->> 'author_name'
      when 'entitlements' then coalesce(
        (select b.title from public.books b where b.id::text = p_row ->> 'book_id'),
        p_row ->> 'book_id'
      )
      else p_row ->> 'title'
    end,
    p_row ->> 'title',
    p_row ->> 'id',
    ''
  ), 160)
$$;
