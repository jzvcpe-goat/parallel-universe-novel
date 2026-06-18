# P45 Runtime Engine Completion Audit

Date: 2026-06-17

## Goal

建立一份机器可验证的 Runtime Engine 完成度审计。它不把当前产品误报为完全上线，而是把每个关键模块映射到当前文件、测试、脚本、CI artifact 和线上状态。

命令：

```bash
npm run check:runtime-engine-completion
```

该命令会生成 `artifacts/runtime/runtime-engine-completion-*.json`，并验证所有模块都有证据、状态、开放缺口和下一步 gate。

## Status Semantics

- `ready`: 当前 scope 内有测试、脚本或 CI artifact 证明可用，且没有 P45 级开放缺口。
- `partial`: 有可运行证据，但只覆盖候选态、本地 live、静态 Pages、局部服务或非生产链路。
- `blocked`: 关键外部条件未满足，例如远端 API/Agent 未配置、支付/法务/安全未进入生产验收。

`partial` 和 `blocked` 不代表失败；它们代表不能对外宣称该模块完成。

## Current Matrix

| Component ID | Module | Status | Evidence Summary | Open Gap |
| --- | --- | --- | --- | --- |
| `narrative-runtime-engine` | Narrative Runtime Engine | `partial` | `RuntimeArtifact` covers constraint set, kernel selection, scene plan, state preview, time consistency, quality brake, branch result; Reader choices now carry route trace and WorldInstance patch candidates; Reader branch publish candidate consumes TimeEngine candidate events; P59 proves a database transaction rollback fixture; P60 proves branch publish operator authorization as candidate ledger; P61 proves branch commit draft with multi-table rollback fixture; P62 writes a private production branch table row and audit event; P63 writes a Reader-visible `public_branch_releases` row and audit event; P64 writes a `time_engine_telemetry_fits` row; Studio confirmation now carries `studio_trace` into the canon ledger. | Remote live runtime trace is not yet proven. |
| `world-engine` | 世界引擎 | `partial` | Worldpack registry, `WorldBible`, frontend world/template data, Reader route-choice ledger proof, `world_instance_patch_candidate_only` readback, `branch_publish_candidate_ledger_only`, authorization, `branch_commit_draft_ledger_only`, `production_branch_table_private`, `reader_visible_branch_release`, and `production_time_engine_fit` proof exist. | Remote runtime facade is not yet proven. |
| `genre-kernel` | 类型内核 | `ready` | 21 `ConstraintProfile` + 21 `GenreKernel`, P4 scanner, runtime rule handshake, per-profile workflow tests, P67 vault access gate, P80 reference privacy artifact gate. | Keep registry privacy, P4 scanner and reference privacy artifact green. |
| `time-engine` | 时间引擎 | `partial` | deterministic TimeEngine generates Poisson/Hawkes-style candidate event density in Agent Runtime; FastAPI TimeEngine candidate ledger persists rollbackable `time_event_candidate_ledger_only` events for a worldline; Reader branch publish candidate consumes TimeEngine event ids; P64 persists `production_time_engine_fit` after public release. | Remote live runtime trace is not yet proven. |
| `state-writeback` | 状态回写 | `partial` | `stateWritebackPreview`, Tool Bridge `stateDeltaCandidate`, smoke proves preview-only, `/canon/commit` has idempotent canon ledger proof with `studio_trace` and `quality_report_hash`, Reader choices persist to route-choice ledger, WorldInstance relationship/memory patch candidates can be read back, branch publish candidates consume TimeEngine candidates behind `Idempotency-Key`, `database_transaction_rollback_fixture` proves rollback does not persist a probe row, P61 proves branch commit draft rollback across `route_choices` + `analytics_events`, P62 writes `production_branch_commits` plus audit event with `public_publish_enabled = false`, P63 writes `public_branch_releases` plus audit event with `public_publish_enabled = true`, and P64 writes `time_engine_telemetry_fits` plus audit event. | Remote live runtime trace is not yet proven. |
| `model-orchestration` | 多模型编排 | `partial` | Mastra agent contracts, provider abstraction, provider-agnostic config gate. | Public remote model/provider smoke and cost-aware routing are not yet proven. |
| `quality-brake` | 质量刹车 | `partial` | `qualityBrakeWorkflow`, `qualityBrakeReport`, repair tests, canon ledger commit gated by quality plus confirmation with a shared Studio trace, P60 structural branch authorization gate, and P63 release owner/ops/rollback owner gate. | Reader live-generation text quality gate against remote runtime is not yet proven. |
| `agent-eval` | Agent Eval | `partial` | Eval services, quality gate modules, scorer tests and dependency policy exist. | Learned evaluator/reranker are not promoted into public live release gate. |
| `codex-harness` | Codex Harness | `ready` | Root `npm run test`, smoke, CI artifact gate, sync manifest, release identity gate. | Keep CI evidence green on every release. |
| `web-reader-entry` | Web 阅读入口 | `partial` | `Home`, `Library`, `Story`, reader hooks, public UI boundary scan, Reader branch trace gate, backend branch publish candidate gate, and `public_branch_release_summary` exist. | Remote public runtime facade remains disabled; live Reader generation is not proven. |
| `creator-studio` | 创作者工作台 | `partial` | `/create`, `socratic-create`, local live browser QA, 300+ candidate draft and 0-2 questions. | Public Pages still has remote runtime disabled until API/Agent HTTPS origins are configured. |
| `commercial-release-chain` | 商业化发布链路 | `blocked` | GitHub Pages deploy, P69 host target gate, P70 deploy manifest gate, P71 runtime image publish gate, P72 image publish evidence gate, P74 operator handoff, P75 assignment intake, P73 remote origin execution gate, P76 live cutover attestation, P77 live rollback rehearsal, P78 remote activation control, P79 remote assignment execution pack, P80 reference privacy artifact gate, P81 remote assignment fixture gate, P83 backward consistency sweep, P84 runtime completion evidence alignment, P85 remote runtime blocker normalization, P87 remote assignment handoff, P89 remote assignment handoff artifact attestation, P90 remote runtime blocker artifact attestation, P91 remote assignment schema gate, P92 public privacy artifact attestation, P93 remote assignment artifact attestation, P94 local artifact mode coherence, P96 runtime completion blocker convergence, P68 runtime preview compose, `runtime-readiness-ledger`, `live-cutover-attestation`, `live-rollback-rehearsal`, `remote-runtime-activation-control`, `remote-assignment-handoff`, `remote-assignment-schema`, `remote-assignment-execution-pack`, `remote-assignment-fixture-gate`, `remote-runtime-blockers`, `reference-privacy`, `public-projection-privacy`, `local-live-runtime-visual-qa`, `github-pages` artifacts. | P85 blocker ledger is the source of truth for commercial release open gaps; public live runtime, remote service assignments, real payment provider, legal/privacy and production rollback owners remain unresolved. |

## Required Evidence Artifacts

The release chain must continue to produce:

- `runtime-readiness-ledger`
- `live-cutover-attestation`
- `live-rollback-rehearsal`
- `remote-runtime-activation-control`
- `remote-assignment-handoff`
- `remote-assignment-schema`
- `remote-assignment-execution-pack`
- `remote-assignment-fixture-gate`
- `remote-runtime-blockers`
- `reference-privacy`
- `public-projection-privacy`
- `local-live-runtime-visual-qa`
- `github-pages`

The current artifact gate is `check:github-actions-artifacts`. P45 consumes the readiness ledger status but does not rewrite it.

## P52 Runtime Completion Matrix Refresh

P52 refreshed this matrix after P49 and P51:

- P49 proves deterministic TimeEngine candidate density in Agent Runtime.
- P51 proves idempotent canon ledger commit with `Idempotency-Key`, `idempotent_replay`, and `rollback_plan`.
- P51 is guarded by `check:state-writeback-safety`.
- `check:runtime-completion-refresh` prevents stale P45 gaps from returning.

The matrix remains conservative: P59 proves the single-probe database transaction rollback fixture, P60 proves candidate operator authorization, P61 proves branch commit draft rollback across two existing tables, P62 proves private production branch table persistence, P63 proves Reader-visible public branch release persistence, and P64 proves production TimeEngine telemetry fitting, while remote live runtime is still a future gate.

## P57 FastAPI TimeEngine Service

P57 moves the TimeEngine from algorithm proof into a FastAPI candidate service without claiming canon/branch publish:

- `/v1/timeline/worldlines/{id}/time-engine/candidates` creates deterministic candidate events from the selected `GenreKernel`, beat plan and run seed.
- The service writes only `time_event_candidate_ledger_only` JSON records under the configured TimeEngine ledger directory.
- Repeating the same request returns `idempotent_replay = true` with the same `time_engine_run_id` and events.
- `/v1/timeline/worldlines/{id}/time-engine` reads the latest candidate ledger record.
- `/v1/timeline/worldlines/{id}/loom` exposes `time_engine_summary` and switches density summary to `fastapi_time_engine` when a candidate ledger exists.
- `check:time-engine-contract` and `check:runtime-engine-completion` require the endpoint, service method, test and document evidence.

Remaining gaps stay explicit: P57 is not canon, not branch write, not production public branch publish, and not production telemetry fitting.

## P53 Reader Branch Trace Gate

P53 proves the Reader side of branch persistence without claiming production public branch publish:

- `/v1/scene/advance` writes the selected reader choice into the existing `route_choices` ledger.
- Each branch ledger record carries `source_run_id`, `branch_id`, `worldline_id`, and rollback metadata.
- `/v1/reader/snapshot` and `/v1/timeline/worldlines/{id}/loom` expose a `branch_writeback_summary`.
- `check:reader-branch-trace` prevents Reader branch persistence from regressing to local-only state.

Remaining gaps are still explicit: this is `route_choice_ledger_only`, not branch publish candidate, not durable multi-table WorldInstance writeback, and not remote live runtime proof.

## P55 WorldInstance Writeback Candidate Gate

P55 proves the candidate layer of WorldInstance relationship and memory
writeback:

- `/v1/scene/advance` derives `world_instance_patch_candidate` from
  `StepRecord.state_before` and `StepRecord.state_after`.
- The patch includes world facts, open promises, relationship graph changes,
  route fingerprint changes, snapshot counts, and rollback metadata.
- `/v1/reader/snapshot` and `/v1/timeline/worldlines/{id}/loom` expose
  `world_instance_writeback_summary`.
- `check:world-instance-writeback` prevents this from regressing.

Remaining gaps stay explicit: P55 is `world_instance_patch_candidate_only`, not
branch publish candidate, not canon write, and not production transaction rollback
proof.

## P56 Studio Canon Trace Gate

P56 proves the local Studio confirmation chain without claiming production
publish:

- `/v1/quality/evaluate` returns `studio_trace` and `quality_report_hash`.
- `/v1/canon/commit` stores the same trace in the `canon_ledger_only` record.
- Idempotent replay returns the same ledger record.
- Rollback metadata remains `available_before_public_publish`.
- `check:studio-canon-trace` prevents Studio from regressing to an unlinked
  quality/commit flow.

Remaining gaps stay explicit: P56 is not remote live runtime, not production
operator authorization, and not durable multi-table canon publishing.

## P58 Reader Branch Publish Candidate Gate

P58 proves the candidate layer of Reader branch publishing without claiming
production public publish:

- `/v1/timeline/worldlines/{id}/branches/publish-candidate` requires
  `Idempotency-Key`.
- The gate requires an existing `route_choice_ledger_only` record and latest
  `time_event_candidate_ledger_only` record.
- Successful calls write only `branch_publish_candidate_ledger_only`.
- The candidate ledger carries `route_choice_event_id`, `time_engine_run_id`,
  consumed TimeEngine event ids, WorldInstance patch candidate and rollback
  metadata.
- `/v1/timeline/worldlines/{id}/branches/publish-candidate` reads back the
  latest candidate.
- `/v1/timeline/worldlines/{id}/loom` exposes `branch_publish_summary`.
- `check:reader-branch-publish` prevents this from regressing.

Remaining gaps stay explicit: P58 is not canon, not production public branch
publish, not production branch table persistence, and not release-owner approval.

## P59 Database Transaction Rollback Fixture

P59 proves the database rollback boundary for Reader branch publish candidates
without claiming public publish:

- `/v1/timeline/worldlines/{id}/branches/publish-rollback-fixture` requires
  `Idempotency-Key`.
- The fixture requires the latest `branch_publish_candidate_ledger_only` record.
- The repository inserts a `branch_publish_transaction_fixture` probe into
  `analytics_events`, flushes it, verifies it is visible inside the transaction,
  then rolls back.
- A fresh session confirms `persisted_after_rollback = false` and
  `rollback_verified = true`.
- `check:branch-publish-rollback-fixture` prevents this proof from regressing.

Remaining gaps stay explicit: P59 is not canon, not production public branch
publish, not production branch table persistence, and not release-owner approval.

## P60 Branch Publish Authorization Gate

P60 proves the operator authorization candidate layer without claiming public
publish:

- `/v1/timeline/worldlines/{id}/branches/publish-authorization` requires
  `Idempotency-Key`.
- The gate requires latest `branch_publish_candidate_ledger_only`.
- The request must include `operator_id` and `confirmed = true`.
- The service runs a structural quality gate and a rollback fixture before
  writing `branch_publish_authorization_ledger_only`.
- `/v1/timeline/worldlines/{id}/branches/publish-authorization` reads back the
  latest authorization candidate.
- `/v1/timeline/worldlines/{id}/loom` exposes
  `branch_publish_authorization_summary`.
- `check:branch-publish-authorization` prevents this proof from regressing.

Remaining gaps stay explicit: P60 is not canon, not production public branch
publish, not production branch table persistence, and not remote live runtime
proof.

## P61 Branch Commit Draft Gate

P61 proves the branch commit draft layer without claiming public publish:

- `/v1/timeline/worldlines/{id}/branches/commit-draft` requires
  `Idempotency-Key`.
- The gate requires latest `branch_publish_authorization_ledger_only`.
- The repository inserts synthetic `route_choices` and `analytics_events` probe
  rows in one transaction, flushes both, then rolls back.
- A fresh session confirms both probes were not persisted.
- Successful calls write only `branch_commit_draft_ledger_only`.
- `/v1/timeline/worldlines/{id}/branches/commit-draft` reads back the latest
  draft.
- `/v1/timeline/worldlines/{id}/loom` exposes `branch_commit_draft_summary`.
- `check:branch-commit-draft` prevents this proof from regressing.

Remaining gaps stay explicit: P61 is not canon, not production public branch
publish, not production branch table persistence, and not remote live runtime
proof.

## P62 Production Branch Commit Gate

P62 proves private production branch table persistence without claiming public
publish:

- `/v1/timeline/worldlines/{id}/branches/commit` requires
  `Idempotency-Key`.
- The gate requires latest `branch_commit_draft_ledger_only`.
- The request must include `release_owner_id` and `confirmed = true`.
- `public_publish_enabled = true` is explicitly blocked for P62.
- The repository writes `production_branch_commits` and `analytics_events` in
  one transaction.
- Successful calls return `write_scope = production_branch_table_private`.
- `/v1/timeline/worldlines/{id}/branches/commit` reads back the latest private
  production branch commit.
- `/v1/timeline/worldlines/{id}/loom` exposes
  `production_branch_commit_summary`.
- `check:production-branch-commit` prevents this proof from regressing.

Remaining gaps stay explicit: P62 is not canon, not Reader-visible public
publish, and not remote live runtime proof. P63 is the next gate that proves
Reader visibility.

## P63 Production Public Publish Gate

P63 proves Reader-visible public branch release without claiming remote live
runtime or paid commercial launch:

- `/v1/timeline/worldlines/{id}/branches/public-publish` requires
  `Idempotency-Key`.
- The gate requires latest P62 `production_branch_table_private`.
- The request must include `release_owner_id`, `ops_reviewer_id`,
  `rollback_owner_id`, `confirmed = true`, and `public_publish_enabled = true`.
- The repository writes `public_branch_releases` and `analytics_events` in one
  transaction.
- Successful calls return `write_scope = reader_visible_branch_release`.
- `/v1/timeline/worldlines/{id}/branches/public-publish` reads back the latest
  Reader-visible release.
- `/v1/timeline/worldlines/{id}/loom` exposes `public_branch_release_summary`.
- `check:public-branch-publish` prevents this proof from regressing.

Remaining gaps stay explicit: P63 is not remote live runtime and not a paid
commercial release/legal packet. P64 now carries the follow-up proof for
production TimeEngine telemetry fitting.

## P64 TimeEngine Telemetry Fit Gate

P64 proves production TimeEngine telemetry fitting without claiming remote live
runtime:

- `/v1/timeline/worldlines/{id}/time-engine/telemetry-fit` requires
  `Idempotency-Key`.
- The gate requires latest P63 `reader_visible_branch_release`.
- The gate requires latest `time_event_candidate_ledger_only`.
- The request must include `fit_operator_id` and `confirmed = true`.
- The repository writes `time_engine_telemetry_fits` and `analytics_events` in
  one transaction.
- Successful calls return `write_scope = production_time_engine_fit`.
- `/v1/timeline/worldlines/{id}/time-engine/telemetry-fit` reads back the latest
  fit.
- `/v1/timeline/worldlines/{id}/loom` exposes `time_engine_fit_summary`.
- `check:time-engine-telemetry-fit` prevents this proof from regressing.

Remaining gaps stay explicit: P64 is not remote live runtime and not a paid
commercial release/legal packet.

## P65 Remote Live Runtime Trace Gate

P65 consumes P23/P46/P47 evidence and decides whether the public Pages app may
claim a remote live runtime trace:

- P23 provides the latest `live-runtime-readiness` ledger.
- P46 provides the latest `remote-runtime-activation` release decision.
- P47 provides Creator, Reader, and Studio trace continuity status.
- `check:remote-live-runtime-trace` writes a `remote-live-runtime-trace`
  artifact.

Current conservative decision is `hold_remote_live_trace_unproven` until remote
FastAPI, remote Agent Runtime, and GitHub Pages runtime variables are proven.

Remaining gaps stay explicit: P65 is a release evidence gate, not an
infrastructure deploy, paid commercial launch, or legal/privacy release packet.

## P66 Remote Runtime Origin Provisioning Gate

P66 turns the remote origin blockers into a machine-checkable provisioning gate:

- `deploy/runtime-production/origin.env.example` separates service secrets from
  public Pages variables.
- `check:remote-origin-provisioning` checks remote API origin, remote Agent
  origin, health endpoints, Pages runtime mode and fallback boundary.
- It outputs `remote_origin_unprovisioned`,
  `remote_origin_health_ready`, `pages_variables_ready`, or
  `ready_for_public_live_runtime`.

Current conservative decision is `remote_origin_unprovisioned` until remote API
and Agent HTTPS origins are configured.

Remaining gaps stay explicit: P66 is a provisioning gate, not a cloud provider
deployment, paid commercial launch, or legal/privacy release packet.

## P67 Reference Vault Access Hardening Gate

P67 hardens the representative-work legal/privacy boundary:

- `check:reference-vault-access` verifies AES-256-GCM vault metadata,
  anonymous public refs, runtime `sourceRefs`, local key location and local key
  file permissions.
- `.gitignore` blocks `private/` and `reference-work-vault.key`.
- `scan:reference-privacy` still performs the broader leak scan across public
  files, build output, runtime artifacts and Git history.

Current decision is `team_only_decryption` plus `zero_plaintext_public_refs`:
public users and non-team members see only anonymous `rwref_*` ids, not
representative work names.

Remaining gaps stay explicit: P67 is a privacy/access gate, not legal counsel or
a replacement for team access governance.

## P68 Runtime Preview Compose Gate

P68 closes the deployable package smoke gap:

- `check:runtime-preview-compose` builds and starts the checked-in FastAPI and
  Agent Runtime containers with Docker Compose.
- The gate verifies both `/health` endpoints.
- It runs one Socratic creator workflow and requires the run trace to include a
  successful FastAPI Tool Bridge turn.
- The generated artifact records health, draft length, question count and Tool
  Bridge acceptance, but not candidate prose or secrets.

Current decision after a successful local/CI run is
`runtime_preview_compose_passed`.

Remaining gaps stay explicit: P68 proves local deployable containers, not remote
HTTPS hosting, production database, paid model credentials, or commercial launch.

## P69 Remote Runtime Host Target Gate

P69 turns the remote runtime host choice into an auditable target package before
P66 checks actual remote origins:

- `deploy/runtime-production/host-profiles.json` defines the allowed host
  profiles and the preferred `docker-compatible-two-service-paas` target.
- API and Agent remain separate services with separate HTTPS origins.
- `provider_secret_store_only` keeps Tool Bridge tokens, database URLs and
  future model keys out of GitHub Pages variables.
- Agent Runtime direct database access remains forbidden.
- `check:remote-host-target` validates the deployment target before P66 origin
  provisioning and live runtime QA.

Current decision is that P69 is ready as a host-target gate, while P66 remains
`remote_origin_unprovisioned` until real remote API and Agent origins exist.

Remaining gaps stay explicit: P69 does not deploy infrastructure and does not
replace P66 health checks, P65 remote trace proof, paid model credentials or
commercial launch ownership.

## P70 Remote Runtime Deploy Manifest Gate

P70 materializes the P69 host target into a concrete two-service deploy manifest:

- `deploy/runtime-production/service-manifest.json` defines API and Agent
  service names, Dockerfiles, ports, health paths and public origin variables.
- API requires `DATABASE_URL` and `NARRATIVEOS_TOOL_BRIDGE_TOKEN` as provider
  secrets.
- Agent requires `MASTRA_TOOL_BRIDGE_TOKEN` as a provider secret and depends on
  the API Tool Bridge URL.
- GitHub Pages variables are limited to public `VITE_*` runtime config.
- `check:remote-deploy-manifest` validates the service manifest before P66
  checks remote origins.

Current decision is that P70 is ready as a provider-neutral deployment
manifest gate, while P66 remains `remote_origin_unprovisioned` until real
remote API and Agent origins exist.

Remaining gaps stay explicit: P70 does not create cloud resources, does not set
secrets, and does not replace P66 health checks or P65 remote trace proof.

## P71 Runtime Image Publish Gate

P71 publishes the checked runtime containers so the P70 deploy manifest can be
executed by a Docker-compatible remote host:

- `.github/workflows/runtime-images.yml` builds `deploy/api/Dockerfile` and
  `deploy/agent-runtime/Dockerfile`.
- The workflow pushes `ghcr.io/jzvcpe-goat/parallel-universe-novel-api` and
  `ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime` with both
  `<commit-sha>` and `runtime-latest` tags.
- `check:runtime-image-workflow` validates workflow permissions, Docker image
  names, service manifest image fields and secret boundaries.
- The workflow has `packages: write` but does not receive provider secrets,
  database URLs, Tool Bridge tokens or reference-vault keys.

Current decision is that P71 is ready as a runtime image publishing gate once
the GitHub workflow completes successfully. P66 remains
`remote_origin_unprovisioned` until those images are actually deployed behind
remote HTTPS origins.

Remaining gaps stay explicit: P71 does not create cloud resources, does not set
Pages live variables, does not enable public live runtime, and does not replace
P66 health checks or P65 remote trace proof.

## P72 Runtime Image Publish Evidence Gate

P72 turns the successful P71 workflow run into machine-readable evidence:

- `check:runtime-image-publish-evidence` finds the latest successful
  `Publish Runtime Images` run for the current commit.
- The gate checks workflow logs for API and Agent Runtime image refs,
  `runtime-latest` refs and digest lines.
- It avoids GitHub package version APIs, so operators do not need
  `read:packages` just to prove image publication.
- Default mode records `passed_with_publish_blockers` before image publication;
  strict mode requires a successful current-head publish run.

Current decision is that P72 is ready as an evidence gate after P71 succeeds.
It still does not pull, run, provision or expose those images publicly.

Remaining gaps stay explicit: P72 does not replace P66 remote origin readiness
or P65 remote live trace proof.

## P73 Remote Runtime Origin Execution Gate

P73 binds the P70 service manifest and P71/P72 image evidence into an
operator-executable remote-origin plan:

- `deploy/runtime-production/origin-execution-plan.json` names the API and
  Agent services, image names, container ports, health paths and operator
  evidence inputs.
- `check:remote-origin-execution` verifies that the execution plan matches the
  service manifest and records whether remote service ids, provider-secret-store
  evidence, HTTPS origins and health checks are ready.
- Default mode records `remote_origin_execution_unassigned` or
  `remote_origin_execution_pending_health` without blocking static Pages CI.
- Strict mode uses `REQUIRE_REMOTE_ORIGIN_EXECUTED=true` and fails until both
  remote services are assigned, health-checked and safe for live variable
  activation.

Current decision is that P73 is ready as an execution-evidence gate. It still
does not choose a cloud provider, store secrets, enable Pages live mode, replace
P66 origin provisioning or replace P65 remote trace proof.

## P74 Remote Runtime Operator Handoff

P74 turns the remote execution contract into a no-secret operator handoff:

- `scripts/check-remote-origin-operator-pack.mjs` generates JSON and Markdown
  artifacts under `artifacts/runtime/remote-origin-operator-pack-*`.
- The pack includes the current commit SHA images for API and Agent Runtime.
- The pack lists service assignment inputs, provider secret names, public Pages
  variable commands, strict verification commands and rollback commands.
- The gate outputs `operator_pack_waiting_for_service_assignment` until the
  deployment owner supplies service ids, HTTPS origins and provider secret-store
  confirmation; strict mode can require
  `operator_pack_ready_for_strict_origin_execution`.

Current decision is that P74 is ready as a handoff-evidence gate. It still does
not choose a provider, store secrets, create remote services, or enable live
public runtime.

## P75 Remote Runtime Assignment Intake

P75 adds the durable intake file for the deployment owner:

- `deploy/runtime-production/remote-assignment.example.json` is committed as the
  no-secret template.
- `deploy/runtime-production/remote-assignment.local.json` is ignored by Git and
  is the only default place for actual service assignment evidence.
- `scripts/check-remote-runtime-assignment-intake.mjs` validates service ids,
  remote HTTPS origins, image refs, provider-secret-store confirmation flags,
  Pages origin variables and `/health` readiness.
- The gate outputs `remote_assignment_missing`,
  `remote_assignment_incomplete`, `remote_assignment_pending_health`, or
  `remote_assignment_ready`.

Current decision is that P75 is ready as an assignment-intake gate. It still does
not choose a provider, create services, store secrets, or enable public live
runtime.

## P76 Live Cutover Attestation Gate

P76 joins the final public-live evidence:

- P75 assignment intake or non-secret CI repository-variable attestation,
- P73 remote origin execution,
- P66 remote origin provisioning,
- P23 live runtime readiness.

`scripts/check-live-cutover-attestation.mjs` outputs
`live_cutover_disabled`, `live_cutover_assignment_unattested`,
`live_cutover_pending_runtime_evidence`, or `live_cutover_attested`.

Current decision is that P76 is ready as a cutover-attestation gate. It still
does not deploy remote services, create secrets, choose a provider, or make the
public runtime commercially launched.

## P77 Live Rollback Rehearsal Gate

P77 turns rollback from runbook text into a current-run evidence artifact:

- `scripts/check-live-rollback-rehearsal.mjs` verifies the rollback command
  bundle, public static preview reachability and owner/run-id strict mode.
- Default disabled mode outputs `live_rollback_static_preview_verified`.
- Strict rehearsal can output `live_rollback_rehearsed` only when
  `ROLLBACK_OWNER_ID`, `ROLLBACK_REHEARSAL_CONFIRMED=true` and
  `ROLLBACK_GITHUB_RUN_ID` are supplied.
- Pages workflow uploads the `live-rollback-rehearsal` artifact next to
  `runtime-readiness-ledger` and `live-cutover-attestation`.

Current decision is that P77 is ready as a rollback-rehearsal evidence gate. It
does not execute destructive GitHub variable changes by default and does not
roll back remote cloud services.

## P78 Remote Runtime Activation Control

P78 turns the final remote runtime cutover into a single read-only control
board:

- `scripts/check-remote-runtime-activation-control.mjs` aggregates P72 image
  evidence, P75 assignment intake, P76 live cutover attestation and P77 rollback
  rehearsal.
- Default mode reports blockers without failing normal CI.
- Strict mode requires `REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true` and fails
  until the control board reaches `remote_activation_ready_for_cutover`.
- Current expected blocker is `remote_activation_waiting_for_assignment` until
  the deployment owner fills the ignored `remote-assignment.local.json` with
  non-secret remote service evidence.

Current decision is that P78 is ready as an activation-control evidence gate. It
does not write GitHub variables, provision remote services, store secrets, or
replace the operator handoff.

## P79 Remote Assignment Execution Pack

P79 turns an ignored P75 assignment file into an operator command bundle:

- `scripts/check-remote-assignment-execution-pack.mjs` reads
  `remote-assignment.local.json` and emits JSON plus Markdown artifacts.
- Missing assignment files produce `assignment_execution_waiting_for_assignment`
  without failing normal CI.
- A complete assignment can produce `assignment_execution_pack_ready`.
- The generated pack includes health commands, GitHub Variable commands, strict
  P75/P73/P76/P78 gate commands, rollback commands and an ordered checklist.

Current decision is that P79 is ready as an operator execution-pack gate. It
does not execute the generated commands and does not store secrets.

## P80 Reference Privacy Artifact Gate

P80 turns representative-work privacy scanning into release evidence:

- `scan:reference-privacy` writes
  `artifacts/runtime/reference-privacy-*.json` with redacted pass/fail metadata.
- Pages workflow runs the scan after `app/dist` is built and uploads the
  `reference-privacy` artifact.
- `check:github-actions-artifacts` requires `reference-privacy` in current-run
  mode.
- The artifact includes scan counts and public ref counts only; it does not
  include titles, author names, decrypted mappings, key values, system prompts
  or violation detail strings.

Current decision is that P80 is ready as a release-evidence privacy gate. It is
not legal advice and does not replace team-only access governance.

## P92 Public Privacy Artifact Attestation

`scripts/check-public-privacy-artifacts.mjs` downloads or reads the
`reference-privacy` and `public-projection-privacy` artifacts and validates
their JSON content:

Command: `npm run check:public-privacy-artifacts`.

- P80 and public projection artifact contracts,
- `status = passed` and zero violations,
- redaction flags proving no titles, authors, decrypted mappings, prompt text,
  provider payloads, vault metadata or violation details are included,
- every JSON file in the current-run artifacts, not just a single local file.

Current decision is that P92 is a content attestation gate for public privacy
evidence. It does not decrypt the vault in CI and does not replace team-only
legal/access governance.

## P84 Runtime Completion Evidence Alignment

P84 closes the drift created when P83 added a second public privacy artifact:

- `public-projection-privacy` is now a required Pages evidence artifact beside
  `reference-privacy`.
- `check:runtime-engine-completion` validates the P45 matrix contains both
  privacy artifacts and that the commercial release chain evidence points to
  the Pages upload step.
- `check:runtime-completion-refresh` validates the completion checker and P45
  document both mention `public-projection-privacy`.

Current decision is that P45 completion evidence is aligned with the P83 public
projection privacy gate. The live runtime remains blocked until remote API and
Agent origins are configured.

## P85 Remote Runtime Blocker Normalization

P85 converts scattered remote-runtime blockers into a single operator ledger:

- `check:remote-runtime-blockers` reads the latest P23/P65/P66/P72/P75/P76/P78
  and P79 artifacts.
- It emits `remote-runtime-blockers` JSON and Markdown artifacts with owner,
  gate, required input, current decision and strict command per stage.
- Pages uploads the ledger and the current-run artifact gate requires it.
- `check:remote-runtime-blockers-artifact` validates the P85 artifact content
  after P89 so stale or contradictory blocker ledgers cannot be handed off.

Current decision is that remote launch blockers are normalized and safe to hand
to a deployment owner. Public live runtime is still blocked until the listed
operator inputs are supplied and strict gates pass.

## P87 Remote Assignment Handoff

`scripts/check-remote-assignment-handoff.mjs` turns current P72 image evidence
into a no-secret deployment handoff for the operator who must fill
`deploy/runtime-production/remote-assignment.local.json`.

P87 adds:

- current API and Agent Runtime image refs,
- target assignment path,
- a no-secret assignment template,
- strict validation command order from P72 through P78,
- explicit boundary flags proving it did not write the ignored assignment file
  or treat fixture evidence as ready.

Current decision is that P87 is ready as the assignment handoff once P72 image
evidence is ready. It still leaves P75/P79/P73/P66/P23/P76/P78 blocked until
real service ids, HTTPS origins, provider secret-store confirmations and health
checks exist.

## P89 Remote Assignment Handoff Artifact Attestation

`scripts/check-remote-assignment-handoff-artifact.mjs` downloads or reads the
P87 `remote-assignment-handoff` artifact and validates its JSON content:

Command: `npm run check:remote-assignment-handoff-artifact`.

- artifact gate, repository and head sha,
- current-head API and Agent Runtime image refs,
- assignment template image refs and Agent -> API dependency,
- P87 public boundary flags,
- absence of secrets, reference work names, `sourceRefs`, `profile.id`,
  `kernel.id`, raw state and provider prompt plumbing,
- ready artifacts must point to passed P72 image evidence for the same head,
- non-ready artifacts must remain explicitly blocked on image evidence.

Current decision is that P89 is a content attestation gate. It does not change
the remote runtime blocker ledger and does not mark assignment or live cutover
ready.

## P91 Remote Assignment Schema Gate

`scripts/check-remote-assignment-schema.mjs` validates the committed assignment
schema, example, fixture and optional ignored local assignment before P75/P79
consume it.

Command: `npm run check:remote-assignment-schema`.

- template and fixture shape,
- unsupported field rejection,
- Agent -> API dependency,
- API/Agent image ref families,
- Pages variable shape,
- no secrets, reference work names, `sourceRefs`, `profile.id`, `kernel.id`,
  raw state or provider prompt plumbing.

Current decision is that P91 is ready as a preflight. Normal CI may report
`remote_assignment_schema_waiting_for_local_assignment` until the operator
creates the ignored local assignment file.

## P93 Remote Assignment Artifact Attestation

`scripts/check-remote-assignment-artifacts.mjs` downloads or reads the P91/P79/P81
assignment artifacts and validates their JSON and Markdown content:

Command: `npm run check:remote-assignment-artifacts`.

- `remote-assignment-schema` must target the ignored local assignment path and
  must not include assignment contents.
- `remote-assignment-execution-pack` must be a valid P79 artifact; blocked
  local assignment states remain explicit, while the fixture can still generate
  health, GitHub variable, strict gate and rollback commands.
- `remote-assignment-fixture-gate` must prove the fixture is no-secret, uses
  reserved `.invalid` origins, makes P79 ready and keeps P75 pending health.
- JSON and Markdown outputs must not expose secrets, reference work names,
  `sourceRefs`, `profile.id`, `kernel.id`, raw state or provider prompt
  plumbing.

Current decision is that P93 is an assignment-evidence content attestation
gate. It does not create provider services, write `remote-assignment.local.json`
or mark public live runtime ready.

## P94 Local Artifact Mode Coherence

P94 keeps local P85 blocker-ledger generation from mixing stale local artifacts
with current-run attestations:

- `check:remote-runtime-blockers` prefers P72 image evidence whose `headSha`
  equals current git HEAD.
- stale P72 image evidence blocks `runtime-images-published` with
  `runtime-image-evidence-current-head`.
- P89 handoff evidence is selected against the selected P72 image evidence head
  before evaluating `handoff-artifact-content`.
- P90 remains strict: the release-owner blocker artifact must contain
  current-head P72 and P89 evidence before artifact content attestation passes.

Current decision is that P94 is a local evidence-coherence hardening gate. It
does not clear remote assignment, health, cutover or activation blockers.

## P96 Runtime Completion Blocker Convergence

P96 keeps this completion matrix aligned with the P85/P90 blocker ledger:

- `check:runtime-engine-completion` reads the latest P85
  `remote-runtime-blockers` artifact when it exists.
- The `commercial-release-chain` component emits `openGaps` from the P85
  blocked stage ids instead of keeping a separate live-readiness-only wording.
- `check:runtime-completion-blocker-convergence` runs after P90, regenerates P45
  and verifies every P85 blocked stage id appears in
  `commercial-release-chain.openGaps`.

Current decision is that P85 blocker ledger is the source of truth for remote
runtime launch blockers. P45 remains the completion matrix, not a competing
blocker taxonomy.

## P90 Remote Runtime Blocker Artifact Attestation

`scripts/check-remote-runtime-blockers-artifact.mjs` downloads or reads the P85
`remote-runtime-blockers` artifact and validates its JSON content:

Command: `npm run check:remote-runtime-blockers-artifact`.

- artifact gate, repository and head sha,
- complete normalized stage list including `handoff-artifact-content`,
- P72 image evidence and P89 handoff evidence for the same head,
- no secrets, reference work names, `sourceRefs`, `profile.id`, `kernel.id`,
  raw state or provider prompt plumbing,
- `blockerCount` must match blocked stages,
- P72, P80/P83, P81 and P89-cleared stages must not reappear as blockers.

Current decision is that P90 is a blocker-ledger content attestation gate. It
does not require remote assignment to be complete and does not mark public live
runtime ready.

## P81 Remote Assignment Fixture Gate

P81 proves the remote assignment contract before real provider origins exist:

- `deploy/runtime-production/remote-assignment.fixture.json` is a committed
  no-secret assignment fixture using reserved `.invalid` origins.
- `check:remote-assignment-fixture` runs P79 strict mode and requires
  `assignment_execution_pack_ready`.
- The same gate runs P75 against the fixture and requires
  `remote_assignment_pending_health`.
- Pages workflow uploads `remote-assignment-fixture-gate` for the current run.

Current decision is that P81 is ready as a remote assignment contract fixture.
It is not live runtime proof and does not replace a real provider assignment.

## Privacy Boundary

This audit must not expose representative work names. It only accepts the public rule registry shape:

- `representativeWorks = encrypted_vault_only`
- `publicReferenceField = sourceRefs`

Do not paste source titles, author names, provider secrets, system prompts, raw state, candidate text, or private reference mappings into this document or the generated audit artifact.

## Acceptance

1. `package.json` exposes `check:runtime-engine-completion`.
2. Root `npm run test` includes `check:runtime-engine-completion`.
3. The script verifies all 12 P45 components.
4. Every non-ready component has at least one explicit `openGaps` item and a `nextGate`.
5. The script writes a timestamped `runtime-engine-completion` artifact.
6. The audit keeps the representative-work privacy contract intact.
