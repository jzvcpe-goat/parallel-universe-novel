create table if not exists public_branch_releases (
  public_release_id text primary key,
  worldline_id text not null,
  session_id text not null references sessions(session_id),
  world_id text,
  world_version_id text,
  branch_id text not null,
  branch_commit_id text not null references production_branch_commits(branch_commit_id),
  commit_draft_id text not null,
  authorization_id text not null,
  branch_publish_candidate_id text not null,
  release_owner_id text not null,
  ops_reviewer_id text not null,
  rollback_owner_id text not null,
  visibility_status text not null default 'reader_visible',
  write_scope text not null default 'reader_visible_branch_release',
  public_publish_enabled text not null default 'true',
  idempotency_key_hash text not null,
  rollback_plan_json jsonb,
  payload_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_public_branch_releases_worldline_created_at on public_branch_releases(worldline_id, created_at);
create index if not exists idx_public_branch_releases_session_created_at on public_branch_releases(session_id, created_at);
create index if not exists idx_public_branch_releases_visibility_created_at on public_branch_releases(visibility_status, created_at);
create index if not exists idx_public_branch_releases_branch_commit_id on public_branch_releases(branch_commit_id);
create index if not exists idx_public_branch_releases_world_id on public_branch_releases(world_id);
create index if not exists idx_public_branch_releases_world_version_id on public_branch_releases(world_version_id);
create index if not exists idx_public_branch_releases_branch_id on public_branch_releases(branch_id);
create index if not exists idx_public_branch_releases_commit_draft_id on public_branch_releases(commit_draft_id);
create index if not exists idx_public_branch_releases_authorization_id on public_branch_releases(authorization_id);
create index if not exists idx_public_branch_releases_branch_publish_candidate_id on public_branch_releases(branch_publish_candidate_id);
create index if not exists idx_public_branch_releases_release_owner_id on public_branch_releases(release_owner_id);
create index if not exists idx_public_branch_releases_ops_reviewer_id on public_branch_releases(ops_reviewer_id);
create index if not exists idx_public_branch_releases_rollback_owner_id on public_branch_releases(rollback_owner_id);
create index if not exists idx_public_branch_releases_idempotency_key_hash on public_branch_releases(idempotency_key_hash);
