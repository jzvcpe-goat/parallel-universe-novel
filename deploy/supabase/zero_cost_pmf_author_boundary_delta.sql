-- 0 元内测 PMF 作者边界增量 SQL
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
  and app_mode = 'localhost'
  and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'creator'
  )
);
