-- 0 元内测 PMF 闭环 schema
-- Target: Supabase public schema for Reader Web + Local Creator App.
-- Boundary: no cloud AI runtime, no provider key storage, no prompt/provider response storage.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'reader' check (role in ('reader', 'creator')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_authorizations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.works (
  id text primary key,
  author_id uuid references public.profiles(id) on delete set null,
  title text not null,
  summary text,
  cover_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  author_notice text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.branches (
  id text primary key,
  work_id text not null references public.works(id) on delete cascade,
  parent_branch_id text references public.branches(id) on delete set null,
  parent_chapter_id uuid,
  branch_type text not null default 'main' check (branch_type in ('main', 'if', 'alt', 'bonus')),
  title text not null,
  summary text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  work_id text not null references public.works(id) on delete cascade,
  branch_id text not null references public.branches(id) on delete cascade,
  chapter_no integer not null,
  title text not null,
  content text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  source_request_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, chapter_no)
);

create table if not exists public.reader_requests (
  id uuid primary key default gen_random_uuid(),
  reader_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  work_id text not null references public.works(id) on delete cascade,
  branch_id text references public.branches(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  request_type text not null check (request_type in ('next_chapter', 'if_branch', 'continue_branch')),
  request_text text not null check (char_length(request_text) between 1 and 280),
  status text not null default 'pending' check (status in ('pending', 'acknowledged', 'in_progress', 'published', 'rejected')),
  vote_count integer not null default 0 check (vote_count >= 0),
  handled_by uuid references public.profiles(id) on delete set null,
  creator_client_id uuid,
  local_draft_ref text,
  published_chapter_id uuid references public.chapters(id) on delete set null,
  published_branch_id text references public.branches(id) on delete set null,
  publish_event_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.request_votes (
  reader_request_id uuid not null references public.reader_requests(id) on delete cascade,
  reader_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (reader_request_id, reader_id)
);

create table if not exists public.publish_events (
  id uuid primary key default gen_random_uuid(),
  reader_request_id uuid references public.reader_requests(id) on delete set null,
  work_id text not null references public.works(id) on delete cascade,
  branch_id text not null references public.branches(id) on delete cascade,
  published_chapter_id uuid references public.chapters(id) on delete set null,
  published_branch_id text references public.branches(id) on delete set null,
  local_draft_ref text,
  event_type text not null check (event_type in ('chapter_published', 'branch_published')),
  published_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_clients (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  client_label text not null default 'Local Creator App',
  app_mode text not null default 'localhost' check (app_mode in ('localhost')),
  version text not null default 'p0-localhost',
  online_status text not null default 'online' check (online_status in ('online', 'offline')),
  last_seen_at timestamptz not null default now(),
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_works_status_updated_at on public.works(status, updated_at desc);
create index if not exists idx_branches_work_status on public.branches(work_id, status);
create index if not exists idx_chapters_work_branch_status on public.chapters(work_id, branch_id, status, chapter_no);
create index if not exists idx_reader_requests_work_status on public.reader_requests(work_id, status, created_at desc);
create index if not exists idx_reader_requests_reader_created on public.reader_requests(reader_id, created_at desc);
create index if not exists idx_publish_events_request on public.publish_events(reader_request_id, created_at desc);
create index if not exists idx_creator_clients_creator_seen on public.creator_clients(creator_id, last_seen_at desc);

alter table public.profiles enable row level security;
alter table public.creator_authorizations enable row level security;
alter table public.works enable row level security;
alter table public.branches enable row level security;
alter table public.chapters enable row level security;
alter table public.reader_requests enable row level security;
alter table public.request_votes enable row level security;
alter table public.publish_events enable row level security;
alter table public.creator_clients enable row level security;
alter table public.feature_flags enable row level security;

grant usage on schema public to anon, authenticated;
grant select (id, title, summary, cover_url, status, author_notice, updated_at) on public.works to anon, authenticated;
grant select (id, work_id, branch_type, title, summary, status, updated_at) on public.branches to anon, authenticated;
grant select (id, work_id, branch_id, chapter_no, title, content, status, published_at) on public.chapters to anon, authenticated;
grant select (id, work_id, branch_id, chapter_id, request_type, request_text, status, vote_count, published_chapter_id, published_branch_id, publish_event_id, created_at, updated_at) on public.reader_requests to anon, authenticated;
grant select (id, reader_request_id, work_id, branch_id, published_chapter_id, published_branch_id, local_draft_ref, event_type, created_at) on public.publish_events to authenticated;
grant select on public.feature_flags to anon, authenticated;
grant select (user_id, created_at) on public.creator_authorizations to authenticated;
grant select, insert, update on public.profiles, public.creator_clients to authenticated;
grant insert, update on public.works, public.branches, public.chapters, public.reader_requests to authenticated;
grant insert on public.request_votes, public.publish_events to authenticated;

-- Supabase Anonymous Sign-Ins use the authenticated Postgres role too.
-- Reader request/vote flows may be anonymous, but creator privileges require a
-- non-anonymous and explicitly allowlisted author session from the Local Creator App.
-- See auth.jwt()->>'is_anonymous'.

drop policy if exists "creator authorizations self select" on public.creator_authorizations;
create policy "creator authorizations self select"
on public.creator_authorizations for select
to authenticated
using (
  user_id = (select auth.uid())
  and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
);

drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

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

drop policy if exists "published works are public" on public.works;
create policy "published works are public"
on public.works for select
to anon, authenticated
using (status = 'published' or author_id = (select auth.uid()));

drop policy if exists "creators create own works" on public.works;
create policy "creators create own works"
on public.works for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'creator'
  )
);

drop policy if exists "creators update own works" on public.works;
create policy "creators update own works"
on public.works for update
to authenticated
using (
  not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  and (
    author_id = (select auth.uid())
    or (
      author_id is null
      and id in ('beacon-beyond', 'rain-bridge', 'jade-contract')
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid()) and p.role = 'creator'
      )
    )
  )
)
with check (
  author_id = (select auth.uid())
  and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
);

drop policy if exists "published branches are public" on public.branches;
create policy "published branches are public"
on public.branches for select
to anon, authenticated
using (
  status = 'published'
  and exists (select 1 from public.works w where w.id = work_id and w.status = 'published')
);

drop policy if exists "creators write own branches" on public.branches;
create policy "creators write own branches"
on public.branches for all
to authenticated
using (
  not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  and exists (select 1 from public.works w where w.id = work_id and w.author_id = (select auth.uid()))
)
with check (
  not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  and exists (select 1 from public.works w where w.id = work_id and w.author_id = (select auth.uid()))
);

drop policy if exists "published chapters are public" on public.chapters;
create policy "published chapters are public"
on public.chapters for select
to anon, authenticated
using (
  status = 'published'
  and exists (select 1 from public.works w where w.id = work_id and w.status = 'published')
);

drop policy if exists "creators write own chapters" on public.chapters;
create policy "creators write own chapters"
on public.chapters for all
to authenticated
using (
  not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  and exists (select 1 from public.works w where w.id = work_id and w.author_id = (select auth.uid()))
)
with check (
  not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  and exists (select 1 from public.works w where w.id = work_id and w.author_id = (select auth.uid()))
);

drop policy if exists "public request status is readable" on public.reader_requests;
create policy "public request status is readable"
on public.reader_requests for select
to anon, authenticated
using (exists (select 1 from public.works w where w.id = work_id and w.status = 'published'));

drop policy if exists "readers create own requests" on public.reader_requests;
create policy "readers create own requests"
on public.reader_requests for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and reader_id = (select auth.uid())
  and status = 'pending'
  and vote_count = 0
  and handled_by is null
  and creator_client_id is null
  and local_draft_ref is null
  and published_chapter_id is null
  and published_branch_id is null
  and publish_event_id is null
);

drop policy if exists "creators update requests for own works" on public.reader_requests;
create policy "creators update requests for own works"
on public.reader_requests for update
to authenticated
using (
  not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  and exists (select 1 from public.works w where w.id = work_id and w.author_id = (select auth.uid()))
)
with check (
  not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  and exists (select 1 from public.works w where w.id = work_id and w.author_id = (select auth.uid()))
);

drop policy if exists "readers vote once" on public.request_votes;
create policy "readers vote once"
on public.request_votes for insert
to authenticated
with check ((select auth.uid()) is not null and reader_id = (select auth.uid()));

drop policy if exists "publish events are public trace" on public.publish_events;
create policy "publish events are public trace"
on public.publish_events for select
to authenticated
using (
  published_by = (select auth.uid())
  or exists (select 1 from public.works w where w.id = work_id and w.author_id = (select auth.uid()))
);

drop policy if exists "creators write publish events for own works" on public.publish_events;
create policy "creators write publish events for own works"
on public.publish_events for insert
to authenticated
with check (
  published_by = (select auth.uid())
  and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  and exists (select 1 from public.works w where w.id = work_id and w.author_id = (select auth.uid()))
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

drop policy if exists "public feature flags are readable" on public.feature_flags;
create policy "public feature flags are readable"
on public.feature_flags for select
to anon, authenticated
using (true);

create schema if not exists private;

create or replace function private.bump_reader_request_vote_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reader_requests
  set vote_count = vote_count + 1,
      updated_at = now()
  where id = new.reader_request_id;
  return new;
end;
$$;

revoke all on function private.bump_reader_request_vote_count() from public, anon, authenticated;

drop trigger if exists request_votes_bump_vote_count on public.request_votes;
create trigger request_votes_bump_vote_count
after insert on public.request_votes
for each row execute function private.bump_reader_request_vote_count();

insert into public.feature_flags (key, enabled, description)
values
  ('cloud_ai_runtime_enabled', false, 'P0 keeps cloud AI runtime disabled.'),
  ('reader_requests_enabled', true, 'Reader can request next chapters and IF branches.'),
  ('local_creator_app_enabled', true, 'Authors handle requests through localhost mode.')
on conflict (key) do update set enabled = excluded.enabled, description = excluded.description, updated_at = now();

insert into public.works (id, title, summary, cover_url, status, author_notice)
values
  ('beacon-beyond', '灯塔之外', '当远海灯塔在无月夜重启，你必须决定先救人，还是先保住真相。', '/parallel-assets/covers/beacon-beyond.jpg', 'published', '读者请求会同步到作者本地创作端。'),
  ('rain-bridge', '雨夜桥边', '一段桥洞录像能洗清旧案，也会让证人永远消失。', '/parallel-assets/covers/rain-bridge.jpg', 'published', '读者请求会同步到作者本地创作端。'),
  ('jade-contract', '玉京契书', '一纸婚契能稳住宗门，也会把主角推上替罪祭坛。', '/parallel-assets/covers/jade-contract.jpg', 'published', '读者请求会同步到作者本地创作端。')
on conflict (id) do nothing;

insert into public.branches (id, work_id, branch_type, title, summary, status)
values
  ('beacon-beyond:main', 'beacon-beyond', 'main', '主线', '灯塔之外主线', 'published'),
  ('rain-bridge:main', 'rain-bridge', 'main', '主线', '雨夜桥边主线', 'published'),
  ('jade-contract:main', 'jade-contract', 'main', '主线', '玉京契书主线', 'published')
on conflict (id) do nothing;
