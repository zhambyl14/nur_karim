-- Nur Karim: log of automatic notifications (prevents duplicates, e.g. cart reminders)

create table public.notification_log (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete cascade,
  kind text not null check (length(kind) between 1 and 60),
  ref text not null default '',
  created_at timestamptz not null default now()
);

create index notification_log_user_kind_idx on public.notification_log (user_id, kind, created_at desc);
create unique index notification_log_unique_ref on public.notification_log (user_id, kind, ref) where ref <> '';

alter table public.notification_log enable row level security;

create policy notification_log_admin_select on public.notification_log
  for select to authenticated using ((select public.is_admin()));
