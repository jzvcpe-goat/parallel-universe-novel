create table if not exists production_branch_commits (
  branch_commit_id text primary key,
  worldline_id text not null,
  session_id text not null references sessions(session_id),
  world_id text,
  world_version_id text,
  branch_id text not null,
  chapter_id text references chapters(chapter_id),
  route_choice_event_id text,
  time_engine_run_id text,
  branch_publish_candidate_id text not null,
  authorization_id text not null,
  commit_draft_id text not null,
  release_owner_id text not null,
  source_run_id text,
  status text not null default 'persisted_private',
  write_scope text not null default 'production_branch_table_private',
  public_publish_enabled text not null default 'false',
  idempotency_key_hash text not null,
  payload_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_production_branch_commits_worldline_created_at on production_branch_commits(worldline_id, created_at);
create index if not exists idx_production_branch_commits_session_created_at on production_branch_commits(session_id, created_at);
create index if not exists idx_production_branch_commits_status_created_at on production_branch_commits(status, created_at);
create index if not exists idx_production_branch_commits_commit_draft_id on production_branch_commits(commit_draft_id);
create index if not exists idx_production_branch_commits_world_id on production_branch_commits(world_id);
create index if not exists idx_production_branch_commits_world_version_id on production_branch_commits(world_version_id);
create index if not exists idx_production_branch_commits_branch_id on production_branch_commits(branch_id);
create index if not exists idx_production_branch_commits_chapter_id on production_branch_commits(chapter_id);
create index if not exists idx_production_branch_commits_route_choice_event_id on production_branch_commits(route_choice_event_id);
create index if not exists idx_production_branch_commits_time_engine_run_id on production_branch_commits(time_engine_run_id);
create index if not exists idx_production_branch_commits_branch_publish_candidate_id on production_branch_commits(branch_publish_candidate_id);
create index if not exists idx_production_branch_commits_authorization_id on production_branch_commits(authorization_id);
create index if not exists idx_production_branch_commits_release_owner_id on production_branch_commits(release_owner_id);
create index if not exists idx_production_branch_commits_source_run_id on production_branch_commits(source_run_id);
create index if not exists idx_production_branch_commits_idempotency_key_hash on production_branch_commits(idempotency_key_hash);
