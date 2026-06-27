-- Author boundary delta SQL.
-- Purpose: apply the minimal live Supabase change required after Anonymous Sign-Ins are enabled.
-- Boundary: authenticated is a transport role; creator privileges require a non-anonymous allowlisted author.
-- Safe to rerun: all statements are idempotent or replace existing policies.

create table if not exists public.creator_authorizations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

alter table public.creator_authorizations enable row level security;

grant select (user_id, created_at) on public.creator_authorizations to authenticated;

alter table public.creator_clients drop constraint if exists creator_clients_app_mode_check;
update public.creator_clients set app_mode = 'local' where app_mode = 'localhost';
update public.creator_clients set client_label = 'Creator App' where client_label = 'Local Creator App';
update public.creator_clients set version = 'local-v1' where version = 'p0-localhost';
alter table public.creator_clients
  alter column client_label set default 'Creator App',
  alter column app_mode set default 'local',
  alter column version set default 'local-v1';
alter table public.creator_clients
  add constraint creator_clients_app_mode_check check (app_mode in ('local'));

drop policy if exists "creator authorizations self select" on public.creator_authorizations;
create policy "creator authorizations self select"
on public.creator_authorizations for select
to authenticated
using (
  user_id = (select auth.uid())
  and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
);

drop policy if exists "profiles self upsert" on public.profiles;
create policy "profiles self upsert"
on public.profiles for insert
to authenticated
with check (
  (select auth.uid()) = id
  and (
    role <> 'creator'
    or (
      not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
      and exists (select 1 from public.creator_authorizations a where a.user_id = (select auth.uid()))
    )
  )
);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check (
  (select auth.uid()) = id
  and (
    role <> 'creator'
    or (
      not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
      and exists (select 1 from public.creator_authorizations a where a.user_id = (select auth.uid()))
    )
  )
);

drop policy if exists "creators manage own clients" on public.creator_clients;
create policy "creators manage own clients"
on public.creator_clients for all
to authenticated
using (
  creator_id = (select auth.uid())
  and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'creator'
  )
)
with check (
  creator_id = (select auth.uid())
  and app_mode = 'local'
  and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'creator'
  )
);

insert into public.feature_flags (key, enabled, description)
select
  'creator_app_enabled',
  enabled,
  'Creators can handle reader requests through the creator app.'
from public.feature_flags
where key = 'local_creator_app_enabled'
on conflict (key) do update
set enabled = excluded.enabled,
    description = excluded.description,
    updated_at = now();

delete from public.feature_flags where key = 'local_creator_app_enabled';

-- Refresh PostgREST so the Data API sees the newly created table immediately.
-- Supabase docs recommend this when REST returns PGRST204/PGRST205 after schema changes.
notify pgrst, 'reload schema';
select pg_notification_queue_usage();
