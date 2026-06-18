create table if not exists time_engine_telemetry_fits (
  telemetry_fit_id text primary key,
  worldline_id text not null,
  session_id text not null references sessions(session_id),
  world_id text,
  world_version_id text,
  time_engine_run_id text not null,
  public_release_id text not null references public_branch_releases(public_release_id),
  branch_commit_id text not null,
  fit_operator_id text not null,
  status text not null default 'fitted_candidate',
  write_scope text not null default 'production_time_engine_fit',
  sample_size integer not null default 0,
  fit_summary_json jsonb,
  idempotency_key_hash text not null,
  payload_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_time_engine_telemetry_fits_worldline_created_at on time_engine_telemetry_fits(worldline_id, created_at);
create index if not exists idx_time_engine_telemetry_fits_time_engine_run_id on time_engine_telemetry_fits(time_engine_run_id);
create index if not exists idx_time_engine_telemetry_fits_public_release_id on time_engine_telemetry_fits(public_release_id);
create index if not exists idx_time_engine_telemetry_fits_session_id on time_engine_telemetry_fits(session_id);
create index if not exists idx_time_engine_telemetry_fits_world_id on time_engine_telemetry_fits(world_id);
create index if not exists idx_time_engine_telemetry_fits_world_version_id on time_engine_telemetry_fits(world_version_id);
create index if not exists idx_time_engine_telemetry_fits_branch_commit_id on time_engine_telemetry_fits(branch_commit_id);
create index if not exists idx_time_engine_telemetry_fits_fit_operator_id on time_engine_telemetry_fits(fit_operator_id);
create index if not exists idx_time_engine_telemetry_fits_idempotency_key_hash on time_engine_telemetry_fits(idempotency_key_hash);
