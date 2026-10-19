-- Nur Karim: storage buckets & policies, realtime publication, cron jobs

-- ---------------------------------------------------------------------------
-- Buckets
--   covers, banners      public read, admin write
--   ebook-pages          private (served only through the watermarking reader API)
--   ebook-sources        private (original PDFs, admin only)
--   receipts             private (client uploads into <user_id>/..., admin reads all)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('covers', 'covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('banners', 'banners', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('ebook-pages', 'ebook-pages', false, 8388608, array['image/webp', 'image/jpeg', 'image/png']),
  ('ebook-sources', 'ebook-sources', false, 52428800, array['application/pdf']),
  ('receipts', 'receipts', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "nk admin read" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('covers', 'banners', 'ebook-pages', 'ebook-sources', 'receipts')
    and (select public.is_admin())
  );

create policy "nk admin insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('covers', 'banners', 'ebook-pages', 'ebook-sources')
    and (select public.is_admin())
  );

create policy "nk admin update" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('covers', 'banners', 'ebook-pages', 'ebook-sources')
    and (select public.is_admin())
  )
  with check (
    bucket_id in ('covers', 'banners', 'ebook-pages', 'ebook-sources')
    and (select public.is_admin())
  );

create policy "nk admin delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('covers', 'banners', 'ebook-pages', 'ebook-sources', 'receipts')
    and (select public.is_admin())
  );

create policy "nk receipts own insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "nk receipts own read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- Realtime (chat)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Cron: cancel unpaid orders after store_settings.order_auto_cancel_hours,
-- clean old reader logs and expired Telegram tokens.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.cleanup_housekeeping()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.ebook_access_log where created_at < now() - interval '120 days';
  delete from public.telegram_tokens where expires_at < now() - interval '7 days';
$$;

revoke execute on function public.cleanup_housekeeping() from public, anon, authenticated;

select cron.schedule('nk-cancel-stale-orders', '17 * * * *', $cron$select public.cancel_stale_orders()$cron$);
select cron.schedule('nk-housekeeping', '43 3 * * *', $cron$select public.cleanup_housekeeping()$cron$);
