# P52 Runtime Completion Matrix Refresh

Date: 2026-06-17

## Goal

Refresh the P45 completion audit after P49 and P51. The matrix must not keep stale gaps after new proof exists, and it must not overclaim production readiness.

## Updates

P49 changed time-engine status evidence:

- deterministic TimeEngine exists in Agent Runtime,
- candidate event density uses Poisson/Hawkes-style pressure,
- `candidateEvents.source = time_engine`,
- P57/P58 now add FastAPI candidate ledger plus branch publish candidate consumption,
- remaining gap is fitted event-density in production public branch publish, not absence of simulation or candidate service.

P51 changed state-writeback and quality-brake evidence:

- `/v1/canon/commit` requires `Idempotency-Key` for confirmed writes,
- repeated keys replay the same idempotent canon ledger record,
- commit records declare `write_scope = canon_ledger_only`,
- commit records include `rollback_plan`,
- P59 now proves a single-probe database transaction rollback fixture for Reader branch publish candidates,
- P62 proves private production branch table persistence and P63 proves Reader-visible public release,
- P64 proves production TimeEngine telemetry fitting after Reader-visible public release,
- remaining gap is remote live runtime trace and paid/legal release packet.

P55 changed world-engine/state-writeback evidence:

- Reader choices now produce `world_instance_patch_candidate_only`,
- snapshot/worldline endpoints expose `world_instance_writeback_summary`,
- P58 now adds branch publish candidate linkage,
- remaining gap is production public branch publish plus durable multi-table writeback, not absence of a WorldInstance patch candidate.

P56 changed Studio/state-writeback evidence:

- `/v1/quality/evaluate` returns `studio_trace` and `quality_report_hash`,
- `/v1/canon/commit` stores the same trace in the `canon_ledger_only` record,
- idempotent replay returns the same ledger record,
- remaining gap is remote live commit, production release-owner approval and durable production publish, not absence of a Studio confirmation trace.

P57 changed time-engine evidence:

- FastAPI now exposes `/v1/timeline/worldlines/{id}/time-engine/candidates`,
- candidate events are persisted as `time_event_candidate_ledger_only`,
- repeated requests replay the same `time_engine_run_id`,
- `/v1/timeline/worldlines/{id}/time-engine` and `/loom` expose the latest candidate ledger,
- production public branch publish and production telemetry fitting are now proven by P63/P64, so the remaining gap is remote live runtime trace, not absence of a durable FastAPI candidate service or P59 rollback fixture.

P58 changed Reader branch publish evidence:

- FastAPI now exposes `/v1/timeline/worldlines/{id}/branches/publish-candidate`,
- the gate requires `Idempotency-Key`,
- the gate consumes existing `route_choice_ledger_only` and latest `time_event_candidate_ledger_only`,
- successful calls write only `branch_publish_candidate_ledger_only`,
- `/loom` exposes `branch_publish_summary`.

P59 Database Transaction Rollback Fixture changed rollback evidence:

- FastAPI now exposes `/v1/timeline/worldlines/{id}/branches/publish-rollback-fixture`,
- the fixture requires `Idempotency-Key`,
- the fixture requires latest `branch_publish_candidate_ledger_only`,
- repository `prove_analytics_event_transaction_rollback` verifies insert-visible-before-rollback and `persisted_after_rollback = false`,
- successful calls return `write_scope = rollback_fixture_only`,
- remaining gap is Reader-visible release after rollback proof, not absence of rollback proof.

P60 Branch Publish Authorization Gate changed authorization evidence:

- FastAPI now exposes `/v1/timeline/worldlines/{id}/branches/publish-authorization`,
- the gate requires `Idempotency-Key`,
- the gate requires latest `branch_publish_candidate_ledger_only`,
- the request must include `operator_id` and `confirmed = true`,
- successful calls write only `branch_publish_authorization_ledger_only`,
- `/loom` exposes `branch_publish_authorization_summary`,
- remaining gap is Reader-visible release after operator authorization, not absence of operator authorization proof.

P61 Branch Commit Draft Gate changed commit-draft evidence:

- FastAPI now exposes `/v1/timeline/worldlines/{id}/branches/commit-draft`,
- the gate requires `Idempotency-Key`,
- the gate requires latest `branch_publish_authorization_ledger_only`,
- the repository proves rollback across `route_choices` and `analytics_events`,
- successful calls write only `branch_commit_draft_ledger_only`,
- `/loom` exposes `branch_commit_draft_summary`,
- remaining gap is private production persistence and Reader-visible release, not absence of a branch commit draft.

P62 Production Branch Commit Gate changed production branch persistence evidence:

- FastAPI now exposes `/v1/timeline/worldlines/{id}/branches/commit`,
- the gate requires `Idempotency-Key`,
- the gate requires latest `branch_commit_draft_ledger_only`,
- the request must include `release_owner_id` and `confirmed = true`,
- `public_publish_enabled = true` is blocked for P62,
- successful calls write `production_branch_table_private` into `production_branch_commits` plus an `analytics_events` audit record,
- `/loom` exposes `production_branch_commit_summary`,
- remaining gap is production public branch publish and remote live runtime trace, not absence of production branch table persistence.

P63 Production Public Publish Gate changed Reader visibility evidence:

- FastAPI now exposes `/v1/timeline/worldlines/{id}/branches/public-publish`,
- the gate requires `Idempotency-Key`,
- the gate requires latest P62 `production_branch_table_private`,
- the request must include `release_owner_id`, `ops_reviewer_id`, `rollback_owner_id`, `confirmed = true`, and `public_publish_enabled = true`,
- successful calls write `reader_visible_branch_release` into `public_branch_releases` plus an `analytics_events` audit record,
- `/loom` exposes `public_branch_release_summary`,
- P64 resolves the production telemetry fitting follow-up, so the current remaining gap is remote live runtime trace, not absence of Reader-visible branch release.

P64 TimeEngine Telemetry Fit Gate changed production fitting evidence:

- FastAPI now exposes `/v1/timeline/worldlines/{id}/time-engine/telemetry-fit`,
- the gate requires `Idempotency-Key`,
- the gate requires latest P63 `reader_visible_branch_release`,
- the gate requires latest `time_event_candidate_ledger_only`,
- the request must include `fit_operator_id` and `confirmed = true`,
- successful calls write `production_time_engine_fit` into `time_engine_telemetry_fits` plus an `analytics_events` audit record,
- `/loom` exposes `time_engine_fit_summary`,
- remaining gap is remote live runtime trace, not absence of production TimeEngine telemetry fitting.

P65 Remote Live Runtime Trace Gate changed remote evidence semantics:

- the gate reads latest P23 `live-runtime-readiness` artifact,
- the gate reads latest P46 `remote-runtime-activation` artifact,
- the gate reads latest P47 `runtime-trace-continuity` artifact,
- the gate outputs `hold_remote_live_trace_unproven`,
  `creator_remote_trace_ready_reader_partial`, or `remote_live_trace_ready`,
- current expected state remains `hold_remote_live_trace_unproven` until remote
  FastAPI, remote Agent Runtime and GitHub Pages runtime variables are proven,
- remaining gap is remote infrastructure/runtime configuration, not absence of a
  machine-readable remote live runtime trace decision.

P66 Remote Runtime Origin Provisioning Gate changed provisioning evidence:

- `deploy/runtime-production/origin.env.example` separates service secrets from
  public Pages variables,
- `check:remote-origin-provisioning` verifies remote API origin, remote Agent
  origin, health readiness, Pages runtime mode and fallback boundary,
- the gate outputs `remote_origin_unprovisioned`,
  `remote_origin_health_ready`, `pages_variables_ready`, or
  `ready_for_public_live_runtime`,
- current expected state remains `remote_origin_unprovisioned` until remote API
  and Agent HTTPS origins are provisioned,
- remaining gap is actual remote service hosting, not absence of a provisioning
  checklist or machine-readable origin gate.

## Verification

Run:

```bash
npm run check:runtime-engine-completion
npm run check:runtime-completion-refresh
npm run check:remote-live-runtime-trace
npm run check:remote-origin-provisioning
```

`check:runtime-completion-refresh` prevents these stale claims from returning:

- time simulation not implemented,
- canon commit and rollback not proven at all,
- quality brake not connected to author confirmation.
- Studio quality evaluation and canon commit not linked by a shared trace.
- TimeEngine not implemented as a durable backend candidate ledger.
- Reader branch publish candidate gate not connected to TimeEngine candidate events.
- Database transaction rollback fixture not proven after branch publish candidate.
- Branch publish release-owner gate not proven after commit draft.
- Branch commit draft not proven after authorization.
- Production branch table persistence not proven after commit draft.
- Reader-visible public branch release not proven after private production commit.
- The formerly stale claim that Production TimeEngine telemetry fitting is missing after public branch release.
- Remote live runtime trace gate missing after P23/P46/P47 evidence exists.
- Remote origin provisioning gate missing after P65 blockers are known.

## Boundary

The refreshed matrix keeps these modules partial:

- Narrative Runtime Engine,
- World Engine,
- Time Engine,
- State Writeback,
- Quality Brake,
- Reader Web,
- Creator Studio,
- Commercial Release Chain.

That is intentional: P49/P51/P57/P58/P59/P60/P61/P62/P63/P64/P65/P66 improve proof quality, but they do not replace live remote runtime infrastructure, legal/payment readiness, or paid commercial launch.
