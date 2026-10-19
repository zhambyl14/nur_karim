-- Nur Karim: reviews (only buyers) and private client <-> seller conversations

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null default '',
  rating smallint not null check (rating between 1 and 5),
  body text not null default '' check (length(body) <= 2000),
  is_hidden boolean not null default false,
  admin_reply text check (length(admin_reply) <= 2000),
  admin_reply_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, user_id)
);
create index reviews_book_idx on public.reviews (book_id, created_at desc);

-- true if the signed-in user bought the book (paid order) or owns it as an e-book
create or replace function public.has_purchased(p_book_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where o.user_id = (select auth.uid())
        and oi.book_id = p_book_id
        and o.status in ('paid', 'shipped', 'delivered')
    )
    or exists (
      select 1 from public.entitlements e
      where e.user_id = (select auth.uid()) and e.book_id = p_book_id
    )
  )
$$;

create or replace function public.reviews_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_admin boolean := public.is_admin() or coalesce((select auth.jwt()) ->> 'role', '') = 'service_role';
begin
  if tg_op = 'INSERT' then
    select full_name into v_name from public.profiles where id = new.user_id;
    v_name := trim(coalesce(v_name, ''));
    -- «Айдана Қасым» -> «Айдана Қ.»
    if position(' ' in v_name) > 0 then
      v_name := split_part(v_name, ' ', 1) || ' ' || left(split_part(v_name, ' ', 2), 1) || '.';
    end if;
    new.author_name := coalesce(nullif(v_name, ''), 'Оқырман');
    if not v_admin then
      new.is_hidden := false;
      new.admin_reply := null;
      new.admin_reply_at := null;
    end if;
  else
    new.updated_at := now();
    if not v_admin then
      new.user_id := old.user_id;
      new.book_id := old.book_id;
      new.author_name := old.author_name;
      new.is_hidden := old.is_hidden;
      new.admin_reply := old.admin_reply;
      new.admin_reply_at := old.admin_reply_at;
    elsif new.admin_reply is distinct from old.admin_reply then
      new.admin_reply_at := case when new.admin_reply is null then null else now() end;
    end if;
  end if;
  return new;
end
$$;

create or replace function public.reviews_refresh_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_book uuid := coalesce(new.book_id, old.book_id);
begin
  update public.books b
  set rating_avg = coalesce((
        select round(avg(r.rating)::numeric, 2) from public.reviews r
        where r.book_id = v_book and not r.is_hidden), 0),
      rating_count = (
        select count(*) from public.reviews r
        where r.book_id = v_book and not r.is_hidden)
  where b.id = v_book;
  return null;
end
$$;

create trigger reviews_before_write before insert or update on public.reviews
  for each row execute function public.reviews_before_write();
create trigger reviews_refresh_rating after insert or update or delete on public.reviews
  for each row execute function public.reviews_refresh_rating();

alter table public.reviews enable row level security;

create policy reviews_select on public.reviews
  for select to anon, authenticated
  using (not is_hidden or user_id = (select auth.uid()) or (select public.is_admin()));

create policy reviews_insert on public.reviews
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.has_purchased(book_id));

create policy reviews_update on public.reviews
  for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

create policy reviews_delete on public.reviews
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Conversations: visible only to the client and the store admins
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid references public.books (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  subject text not null default '' check (length(subject) <= 200),
  last_message_at timestamptz not null default now(),
  last_message_preview text not null default '',
  last_sender_is_admin boolean not null default false,
  user_unread int not null default 0,
  admin_unread int not null default 0,
  is_closed boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index conversations_user_book_uniq on public.conversations (user_id, book_id)
  where book_id is not null;
create unique index conversations_user_general_uniq on public.conversations (user_id)
  where book_id is null and order_id is null;
create unique index conversations_user_order_uniq on public.conversations (user_id, order_id)
  where order_id is not null and book_id is null;
create index conversations_last_idx on public.conversations (last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  is_admin boolean not null default false,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create or replace function public.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      last_message_preview = left(regexp_replace(new.body, '\s+', ' ', 'g'), 140),
      last_sender_is_admin = new.is_admin,
      user_unread = case when new.is_admin then user_unread + 1 else user_unread end,
      admin_unread = case when new.is_admin then admin_unread else admin_unread + 1 end,
      is_closed = false
  where id = new.conversation_id;
  return null;
end
$$;

create trigger messages_after_insert after insert on public.messages
  for each row execute function public.messages_after_insert();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy conversations_select on public.conversations
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy conversations_admin_update on public.conversations
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy messages_select on public.messages
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = (select auth.uid())
    )
  );

create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (
      (is_admin and (select public.is_admin()))
      or (not is_admin and exists (
        select 1 from public.conversations c
        where c.id = messages.conversation_id and c.user_id = (select auth.uid())
      ))
    )
  );

-- Start (or reuse) a conversation about a book / order / in general and post the first message.
create or replace function public.start_conversation(
  p_body text,
  p_book_id uuid default null,
  p_order_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_conv uuid;
  v_subject text := '';
  v_body text := nullif(trim(coalesce(p_body, '')), '');
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if v_body is null or length(v_body) > 4000 then
    raise exception 'MESSAGE_INVALID' using errcode = '22023';
  end if;

  if p_book_id is not null then
    select id into v_conv from public.conversations where user_id = v_uid and book_id = p_book_id;
    select title into v_subject from public.books where id = p_book_id and is_published;
    if v_subject is null then
      raise exception 'BOOK_NOT_FOUND' using errcode = '22023';
    end if;
  elsif p_order_id is not null then
    if not exists (select 1 from public.orders where id = p_order_id and user_id = v_uid) then
      raise exception 'ORDER_NOT_FOUND' using errcode = '22023';
    end if;
    select id into v_conv from public.conversations
    where user_id = v_uid and order_id = p_order_id and book_id is null;
    select '#' || order_number::text into v_subject from public.orders where id = p_order_id;
  else
    select id into v_conv from public.conversations
    where user_id = v_uid and book_id is null and order_id is null;
  end if;

  if v_conv is null then
    insert into public.conversations (user_id, book_id, order_id, subject)
    values (v_uid, p_book_id, case when p_book_id is null then p_order_id end, coalesce(v_subject, ''))
    returning id into v_conv;
  end if;

  insert into public.messages (conversation_id, sender_id, is_admin, body)
  values (v_conv, v_uid, false, v_body);

  return v_conv;
end
$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return;
  end if;
  if public.is_admin() then
    update public.conversations set admin_unread = 0
    where id = p_conversation_id and admin_unread <> 0;
  else
    update public.conversations set user_unread = 0
    where id = p_conversation_id and user_id = v_uid and user_unread <> 0;
  end if;
end
$$;

revoke execute on function public.start_conversation(text, uuid, uuid) from public, anon;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.start_conversation(text, uuid, uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.has_purchased(uuid) to anon, authenticated;
revoke execute on function public.messages_after_insert() from public, anon, authenticated;
revoke execute on function public.reviews_refresh_rating() from public, anon, authenticated;
