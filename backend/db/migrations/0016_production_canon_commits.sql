create table if not exists production_canon_commits (
  canon_commit_id text primary key,
  project_id text,
  session_id text,
  worldline_id text,
  world_id text,
  world_version_id text,
  chapter_id text,
  candidate_id text,
  source_run_id text,
  confirmed_by text not null,
  target_status text not null default 'canon',
  status text not null default 'committed',
  write_scope text not null default 'production_canon_promotion',
  idempotency_key_hash text not null,
  quality_report_hash text not null,
  rollback_plan_json jsonb,
  studio_trace_json jsonb,
  payload_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_production_canon_commits_project_created_at on production_canon_commits(project_id, created_at);
create index if not exists idx_production_canon_commits_session_created_at on production_canon_commits(session_id, created_at);
create index if not exists idx_production_canon_commits_world_created_at on production_canon_commits(world_id, created_at);
create index if not exists idx_production_canon_commits_candidate_id on production_canon_commits(candidate_id);
create index if not exists idx_production_canon_commits_source_run_id on production_canon_commits(source_run_id);
create index if not exists idx_production_canon_commits_idempotency_key_hash on production_canon_commits(idempotency_key_hash);
create index if not exists idx_production_canon_commits_worldline_id on production_canon_commits(worldline_id);
create index if not exists idx_production_canon_commits_world_version_id on production_canon_commits(world_version_id);
create index if not exists idx_production_canon_commits_chapter_id on production_canon_commits(chapter_id);
create index if not exists idx_production_canon_commits_confirmed_by on production_canon_commits(confirmed_by);
create index if not exists idx_production_canon_commits_quality_report_hash on production_canon_commits(quality_report_hash);
