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

P73 Remote Runtime Origin Execution Gate changed execution evidence:

- `deploy/runtime-production/origin-execution-plan.json` binds P70 service
  manifest, P71/P72 image evidence, provider-secret-store evidence, service ids
  and health checks,
- `check:remote-origin-execution` verifies service assignment, remote HTTPS
  origins, provider-secret evidence and health readiness,
- the gate outputs `remote_origin_execution_unassigned`,
  `remote_origin_execution_pending_health`, or
  `remote_origin_execution_ready`,
- current expected state remains `remote_origin_execution_unassigned` until the
  deployment owner provides actual remote service ids, origins and health,
- remaining gap is actual remote service execution, not absence of an execution
  checklist or machine-readable origin execution gate.

P74 Remote Runtime Operator Handoff changed handoff evidence:

- `check:remote-origin-operator-pack` generates JSON and Markdown handoff
  artifacts for the remote deployment owner,
- the pack includes current commit images, service assignment inputs, provider
  secret names, GitHub Pages variable commands, strict verification commands and
  rollback commands,
- the gate outputs `operator_pack_waiting_for_service_assignment` or
  `operator_pack_ready_for_strict_origin_execution`,
- current expected state remains `operator_pack_waiting_for_service_assignment`
  until service ids, HTTPS origins and provider secret-store confirmations are
  supplied,
- remaining gap is actual provider execution, not absence of a no-secret
  operator handoff.

P75 Remote Runtime Assignment Intake changed assignment evidence:

- `deploy/runtime-production/remote-assignment.example.json` gives the remote
  deployment owner a no-secret template,
- `deploy/runtime-production/remote-assignment.local.json` is ignored by Git and
  is the default actual assignment file,
- `check:remote-runtime-assignment-intake` verifies service ids, HTTPS origins,
  image refs, provider-secret-store confirmation flags, Pages variable alignment
  and health readiness,
- the gate outputs `remote_assignment_missing`, `remote_assignment_incomplete`,
  `remote_assignment_pending_health`, or `remote_assignment_ready`,
- current expected state remains `remote_assignment_missing` until a deployment
  owner fills actual service evidence,
- remaining gap is actual remote service assignment, not absence of a durable
  assignment intake path.

P76 Live Cutover Attestation Gate changed live release evidence:

- `check:live-cutover-attestation` joins P75/P73/P66/P23 evidence before public
  live mode,
- Pages workflow receives only non-secret `REMOTE_*` service ids and
  provider-secret-store confirmation flags,
- strict mode outputs `live_cutover_attested` only after assignment, origin
  execution, provisioning and live runtime readiness are all ready,
- current expected state remains `live_cutover_disabled` or
  `live_cutover_assignment_unattested` until remote services exist,
- remaining gap is live provider execution, not absence of a cutover attestation
  contract.

P77 Live Rollback Rehearsal Gate changed rollback evidence:

- `check:live-rollback-rehearsal` verifies rollback commands from the service
  manifest and origin execution plan,
- the gate confirms static GitHub Pages preview remains reachable in disabled
  mode,
- strict mode requires `ROLLBACK_OWNER_ID`,
  `ROLLBACK_REHEARSAL_CONFIRMED=true`, and `ROLLBACK_GITHUB_RUN_ID`,
- Pages workflow uploads a `live-rollback-rehearsal` artifact for the same run,
- current expected state is `live_rollback_static_preview_verified` in disabled
  mode until an operator performs a strict rehearsal,
- remaining gap is live provider execution and operator-confirmed rollback, not
  absence of a rollback rehearsal contract.

P78 Remote Runtime Activation Control changed cutover ownership evidence:

- `check:remote-runtime-activation-control` aggregates P72 image evidence, P75
  assignment intake, P76 live cutover attestation and P77 rollback rehearsal,
- the gate emits a single operator-facing decision such as
  `remote_activation_waiting_for_assignment` or
  `remote_activation_ready_for_cutover`,
- strict mode requires `REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true`,
- current expected state is `remote_activation_waiting_for_assignment` until
  the deployment owner supplies remote service evidence,
- remaining gap is actual remote runtime assignment and health, not absence of
  a cutover control board.

P79 Remote Assignment Execution Pack changed operator execution evidence:

- `check:remote-assignment-execution-pack` converts the ignored P75 assignment
  file into safe health, GitHub Variable, strict-gate and rollback commands,
- the gate outputs `assignment_execution_waiting_for_assignment`,
  `assignment_execution_incomplete`, or `assignment_execution_pack_ready`,
- the check emits both JSON and Markdown artifacts for the deployment owner,
- current expected state is `assignment_execution_waiting_for_assignment` until
  actual remote service evidence exists,
- remaining gap is actual provider execution and health, not absence of an
  operator command bundle.

P80 Reference Privacy Artifact Gate changed privacy release evidence:

- `scan:reference-privacy` now writes a redacted JSON artifact under
  `artifacts/runtime/reference-privacy-*.json`,
- the artifact includes scan counts and public ref count, but never includes
  titles, authors, decrypted mappings, key values or violation detail strings,
- Pages workflow runs the scan after `app/dist` is built and uploads
  `reference-privacy`,
- `check:github-actions-artifacts` requires `reference-privacy` in current-run
  mode,
- remaining gap is team legal/access governance, not absence of an engineering
  privacy release artifact.

P81 Remote Assignment Fixture Gate changed remote assignment evidence:

- `deploy/runtime-production/remote-assignment.fixture.json` provides a
  committed no-secret assignment fixture with reserved `.invalid` origins,
- `check:remote-assignment-fixture` proves P79 strict execution-pack generation
  can reach `assignment_execution_pack_ready`,
- the same gate proves P75 remains at `remote_assignment_pending_health` because
  the fixture is not a real remote service,
- Pages workflow uploads `remote-assignment-fixture-gate`,
- remaining gap is actual provider assignment and health, not absence of a
  safe contract fixture.

P67 Reference Vault Access Hardening Gate changed privacy evidence:

- `.gitignore` explicitly ignores `private/` and `reference-work-vault.key`,
- `check:reference-vault-access` verifies AES-256-GCM vault metadata,
  anonymous public refs, runtime `sourceRefs`, local key location and key file
  permissions,
- `scan:reference-privacy` remains the leak scan across public files, build
  output, runtime artifacts and Git history,
- current expected state is `team_only_decryption` and
  `zero_plaintext_public_refs`,
- remaining gap is team governance/legal review, not absence of an engineering
  privacy gate for representative work names.

P68 Runtime Preview Compose Gate changed deployment evidence:

- `check:runtime-preview-compose` now builds and starts the FastAPI and Agent
  Runtime containers from the checked-in Dockerfiles,
- the local preview compose uses configurable host ports to avoid developer port
  collisions while keeping container ports stable,
- the smoke verifies API health, Agent health and one Socratic creator workflow
  through FastAPI Tool Bridge,
- current expected passing state is `runtime_preview_compose_passed`,
- remaining gap is remote HTTPS hosting and cloud secrets, not absence of a
  deployable two-service container proof.

## Verification

Run:

```bash
npm run check:runtime-engine-completion
npm run check:runtime-completion-refresh
npm run check:remote-live-runtime-trace
npm run check:remote-origin-provisioning
npm run check:remote-origin-operator-pack
npm run check:remote-runtime-assignment-intake
npm run check:remote-origin-execution
npm run check:live-cutover-attestation
npm run check:live-rollback-rehearsal
npm run check:remote-runtime-activation-control
npm run check:remote-assignment-execution-pack
npm run check:reference-vault-access
npm run scan:reference-privacy
npm run check:runtime-preview-compose
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
- Remote origin execution gate missing after P70/P71/P72 materials exist.
- Remote runtime operator handoff missing after P72/P73 materials exist.
- Remote runtime assignment intake missing after P74 materials exist.
- Live cutover attestation missing after P75/P73/P66/P23 materials exist.
- Reference vault access hardening missing after anonymous ref scans exist.
- Runtime preview compose smoke missing after Docker deployment files exist.

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

That is intentional: P49/P51/P57/P58/P59/P60/P61/P62/P63/P64/P65/P66/P67/P68/P73/P74/P75/P76/P77/P78/P79 improve proof quality, but they do not replace live remote runtime infrastructure, legal/payment readiness, or paid commercial launch.
## P96 Runtime Completion Blocker Convergence Refresh

P96 extends this refresh contract by making the commercial release row consume
the P85 blocker ledger instead of keeping an independent blocker taxonomy.

- P45 runtime completion artifacts include `remoteRuntimeBlockerLedger`.
- `commercial-release-chain.openGaps` mirrors P85 blocked stage ids when a P85
  artifact exists.
- `check:runtime-completion-blocker-convergence` runs after P90 in root
  `npm run test`.
