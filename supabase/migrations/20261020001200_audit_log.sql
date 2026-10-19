-- Nur Karim: admin activity log (who changed what). Filled by triggers, only for
-- changes made by signed-in admins (not by clients, cron or the service role).

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  entity text not null,
  entity_id text,
  label text not null default '',
  action text not null check (action in ('insert', 'update', 'delete')),
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id, created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);

alter table public.audit_log enable row level security;

create policy audit_log_admin_select on public.audit_log
  for select to authenticated using ((select public.is_admin()));

create or replace function public.audit_label(p_table text, p_row jsonb)
returns text
language sql
immutable
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
      when 'entitlements' then p_row ->> 'book_id'
      else p_row ->> 'title'
    end,
    p_row ->> 'title',
    p_row ->> 'id',
    ''
  ), 160)
$$;

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_changes jsonb := '{}'::jsonb;
  v_key text;
  v_ignore text[] := array['updated_at', 'search_text', 'sold_count', 'rating_avg', 'rating_count', 'used_count'];
  v_old_val jsonb;
  v_new_val jsonb;
begin
  if v_actor is null or not public.is_admin() then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    for v_key in select jsonb_object_keys(v_new) loop
      continue when v_key = any(v_ignore);
      v_old_val := v_old -> v_key;
      v_new_val := v_new -> v_key;
      if v_new_val is distinct from v_old_val then
        -- long texts and arrays: keep only a short preview
        if jsonb_typeof(v_new_val) = 'string' and length(v_new_val #>> '{}') > 140 then
          v_new_val := to_jsonb(left(v_new_val #>> '{}', 140) || '…');
        end if;
        if jsonb_typeof(v_old_val) = 'string' and length(v_old_val #>> '{}') > 140 then
          v_old_val := to_jsonb(left(v_old_val #>> '{}', 140) || '…');
        end if;
        v_changes := v_changes || jsonb_build_object(v_key, jsonb_build_array(v_old_val, v_new_val));
      end if;
    end loop;
    if v_changes = '{}'::jsonb then
      return null;
    end if;
  end if;

  insert into public.audit_log (actor_id, entity, entity_id, label, action, changes)
  values (
    v_actor,
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'book_id'),
    public.audit_label(tg_table_name, v_row),
    lower(tg_op),
    v_changes
  );
  return null;
end
$$;

revoke execute on function public.audit_row() from public, anon, authenticated;

create trigger audit_books after insert or update or delete on public.books
  for each row execute function public.audit_row();
create trigger audit_genres after insert or update or delete on public.genres
  for each row execute function public.audit_row();
create trigger audit_promotions after insert or update or delete on public.promotions
  for each row execute function public.audit_row();
create trigger audit_promo_codes after insert or update or delete on public.promo_codes
  for each row execute function public.audit_row();
create trigger audit_banners after insert or update or delete on public.banners
  for each row execute function public.audit_row();
create trigger audit_store_settings after update on public.store_settings
  for each row execute function public.audit_row();
create trigger audit_orders after update or delete on public.orders
  for each row execute function public.audit_row();
create trigger audit_reviews after update or delete on public.reviews
  for each row execute function public.audit_row();
create trigger audit_entitlements after insert or delete on public.entitlements
  for each row execute function public.audit_row();
create trigger audit_profiles after update on public.profiles
  for each row execute function public.audit_row();
