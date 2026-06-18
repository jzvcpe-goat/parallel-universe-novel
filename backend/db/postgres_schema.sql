-- NarrativeOS platform schema (minimum viable)

create table if not exists worlds (
  world_id text primary key,
  latest_version text,
  title text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists world_versions (
  world_version_id text primary key,
  world_id text not null references worlds(world_id),
  version text not null,
  author_id text not null,
  status text not null default 'draft',
  risk_rating text,
  manifest_json jsonb not null,
  worldpack_json jsonb not null,
  validation_report_json jsonb,
  simulation_report_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  session_id text primary key,
  reader_id text,
  world_version_id text not null references world_versions(world_version_id),
  status text not null default 'active',
  chapter_index int not null default 0,
  story_phase text,
  narrative_state_json jsonb not null,
  entitlements_snapshot_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chapters (
  chapter_id text primary key,
  session_id text not null references sessions(session_id),
  world_version_id text not null references world_versions(world_version_id),
  chapter_index int not null,
  plan_json jsonb,
  rendered_body text,
  choices_json jsonb,
  cost_estimate numeric,
  review_flags_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists route_choices (
  choice_event_id bigserial primary key,
  session_id text not null references sessions(session_id),
  chapter_id text not null references chapters(chapter_id),
  choice_id text not null,
  selected_at timestamptz not null default now(),
  payload_json jsonb
);

create table if not exists entitlements (
  entitlement_id text primary key,
  account_id text,
  reader_id text not null,
  world_id text,
  entitlement_type text not null,
  wallet_type text,
  tier_id text,
  status text not null default 'active',
  balance numeric,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists usage_meters (
  meter_id text primary key,
  account_id text,
  reader_id text,
  session_id text,
  chapter_id text,
  world_version_id text,
  action_type text not null,
  usage_units numeric not null,
  estimated_cost numeric,
  wallet_type text,
  subscription_tier text,
  provider text,
  model_policy_version text,
  created_at timestamptz not null default now()
);

create table if not exists review_records (
  review_id text primary key,
  asset_type text not null,
  asset_id text not null,
  status text not null,
  reviewer_id text,
  risk_rating text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists analytics_events (
  event_id bigserial primary key,
  event_name text not null,
  reader_id text,
  session_id text,
  world_version_id text,
  payload_json jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists author_comment_threads (
  thread_id text primary key,
  world_version_id text not null references world_versions(world_version_id),
  revision_id text,
  anchor_type text not null,
  anchor_key text not null,
  status text not null default 'open',
  severity text not null default 'normal',
  assignee_id text,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_author_comment_threads_world_version_id on author_comment_threads(world_version_id);
create index if not exists idx_author_comment_threads_revision_id on author_comment_threads(revision_id);
create index if not exists idx_author_comment_threads_assignee_id on author_comment_threads(assignee_id);

create table if not exists author_comment_messages (
  message_id text primary key,
  thread_id text not null references author_comment_threads(thread_id),
  actor_id text not null,
  actor_role text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_author_comment_messages_thread_id on author_comment_messages(thread_id);

create table if not exists author_approval_records (
  approval_id text primary key,
  world_version_id text not null references world_versions(world_version_id),
  revision_id text,
  status text not null,
  reviewer_id text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_author_approval_records_world_version_id on author_approval_records(world_version_id);
create index if not exists idx_author_approval_records_revision_id on author_approval_records(revision_id);

create table if not exists author_notifications (
  notification_id text primary key,
  world_version_id text not null references world_versions(world_version_id),
  thread_id text references author_comment_threads(thread_id),
  approval_id text references author_approval_records(approval_id),
  recipient_id text not null,
  recipient_role text not null default 'reviewer',
  notification_type text not null,
  status text not null default 'unread',
  actor_id text,
  actor_role text,
  title text not null,
  body text not null,
  anchor_type text,
  anchor_key text,
  metadata_json jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_author_notifications_world_version_id on author_notifications(world_version_id);
create index if not exists idx_author_notifications_thread_id on author_notifications(thread_id);
create index if not exists idx_author_notifications_approval_id on author_notifications(approval_id);
create index if not exists idx_author_notifications_recipient_id on author_notifications(recipient_id);
create index if not exists idx_author_notifications_status on author_notifications(status);

create table if not exists author_thread_watchers (
  watcher_record_id text primary key,
  thread_id text not null references author_comment_threads(thread_id),
  watcher_id text not null,
  added_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_author_thread_watchers_thread_id on author_thread_watchers(thread_id);
create index if not exists idx_author_thread_watchers_watcher_id on author_thread_watchers(watcher_id);

create table if not exists author_draft_watchers (
  watcher_record_id text primary key,
  world_version_id text not null references world_versions(world_version_id),
  watcher_id text not null,
  added_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_author_draft_watchers_world_version_id on author_draft_watchers(world_version_id);
create index if not exists idx_author_draft_watchers_watcher_id on author_draft_watchers(watcher_id);

create table if not exists author_notification_preferences (
  preference_id text primary key,
  actor_id text not null,
  notification_type text not null,
  in_app_enabled text not null default 'true',
  async_mirror_enabled text not null default 'true',
  async_sink_name text,
  delivery_target text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_author_notification_preferences_actor_id on author_notification_preferences(actor_id);
create index if not exists idx_author_notification_preferences_notification_type on author_notification_preferences(notification_type);

create table if not exists auth_identities (
  actor_id text primary key,
  account_id text,
  actor_role text not null,
  display_name text,
  password_hash text not null,
  password_salt text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_auth_identities_account_id on auth_identities(account_id);

create table if not exists auth_tokens (
  token_id text primary key,
  actor_id text not null references auth_identities(actor_id),
  account_id text,
  actor_role text not null,
  token_hash text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  last_used_at timestamptz
);

create index if not exists idx_auth_tokens_actor_id on auth_tokens(actor_id);
create index if not exists idx_auth_tokens_account_id on auth_tokens(account_id);
create index if not exists idx_auth_tokens_token_hash on auth_tokens(token_hash);

create table if not exists billing_checkout_sessions (
  checkout_session_id text primary key,
  account_id text not null,
  tier_id text not null,
  provider text not null,
  provider_ref text,
  subscription_id text,
  status text not null default 'created',
  checkout_url text,
  idempotency_key text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_billing_checkout_sessions_account_id on billing_checkout_sessions(account_id);
create index if not exists idx_billing_checkout_sessions_provider_ref on billing_checkout_sessions(provider_ref);
create index if not exists idx_billing_checkout_sessions_idempotency_key on billing_checkout_sessions(idempotency_key);

create table if not exists billing_lifecycle_events (
  event_id text primary key,
  event_type text not null,
  provider text not null,
  provider_event_id text not null,
  account_id text,
  subscription_id text,
  checkout_session_id text,
  status text not null default 'received',
  payload_json jsonb,
  processing_result jsonb,
  occurred_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_billing_lifecycle_events_provider_event_id on billing_lifecycle_events(provider_event_id);
create index if not exists idx_billing_lifecycle_events_account_id on billing_lifecycle_events(account_id);
create index if not exists idx_billing_lifecycle_events_subscription_id on billing_lifecycle_events(subscription_id);
create index if not exists idx_billing_lifecycle_events_checkout_session_id on billing_lifecycle_events(checkout_session_id);

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

create table if not exists billing_retry_attempts (
  retry_attempt_id text primary key,
  account_id text,
  subscription_id text,
  checkout_session_id text,
  source_event_id text,
  status text not null default 'planned',
  retry_reason text,
  attempt_count integer not null default 1,
  next_retry_at timestamptz,
  payload_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_billing_retry_attempts_account_id on billing_retry_attempts(account_id);
create index if not exists idx_billing_retry_attempts_subscription_id on billing_retry_attempts(subscription_id);
create index if not exists idx_billing_retry_attempts_checkout_session_id on billing_retry_attempts(checkout_session_id);
create index if not exists idx_billing_retry_attempts_source_event_id on billing_retry_attempts(source_event_id);

create index if not exists idx_sessions_world_version_updated_at on sessions(world_version_id, updated_at);
create index if not exists idx_sessions_reader_updated_at on sessions(reader_id, updated_at);
create index if not exists idx_sessions_status_updated_at on sessions(status, updated_at);

create index if not exists idx_chapters_session_chapter_index on chapters(session_id, chapter_index);
create index if not exists idx_chapters_world_version_created_at on chapters(world_version_id, created_at);

create index if not exists idx_review_records_asset_type_status_updated_at on review_records(asset_type, status, updated_at);
create index if not exists idx_review_records_asset_type_asset_id_updated_at on review_records(asset_type, asset_id, updated_at);
create index if not exists idx_review_records_reviewer_updated_at on review_records(reviewer_id, updated_at);

create table if not exists subscriptions (
  subscription_id text primary key,
  account_id text not null,
  tier_id text not null,
  provider text not null,
  provider_ref text,
  status text not null default 'trialing',
  period_start timestamptz,
  period_end timestamptz,
  cancel_at_period_end text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_account_status_updated_at on subscriptions(account_id, status, updated_at);

create index if not exists idx_usage_meters_account_created_at on usage_meters(account_id, created_at);
create index if not exists idx_usage_meters_session_created_at on usage_meters(session_id, created_at);
create index if not exists idx_usage_meters_world_version_created_at on usage_meters(world_version_id, created_at);

create index if not exists idx_analytics_events_event_name_occurred_at on analytics_events(event_name, occurred_at);
create index if not exists idx_analytics_events_session_occurred_at on analytics_events(session_id, occurred_at);
create index if not exists idx_analytics_events_world_version_occurred_at on analytics_events(world_version_id, occurred_at);
