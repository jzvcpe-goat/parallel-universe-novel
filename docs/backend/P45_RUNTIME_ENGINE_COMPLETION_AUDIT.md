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
| `genre-kernel` | 类型内核 | `ready` | 21 `ConstraintProfile` + 21 `GenreKernel`, P4 scanner, runtime rule handshake, per-profile workflow tests. | Keep registry privacy and P4 scanner green. |
| `time-engine` | 时间引擎 | `partial` | deterministic TimeEngine generates Poisson/Hawkes-style candidate event density in Agent Runtime; FastAPI TimeEngine candidate ledger persists rollbackable `time_event_candidate_ledger_only` events for a worldline; Reader branch publish candidate consumes TimeEngine event ids; P64 persists `production_time_engine_fit` after public release. | Remote live runtime trace is not yet proven. |
| `state-writeback` | 状态回写 | `partial` | `stateWritebackPreview`, Tool Bridge `stateDeltaCandidate`, smoke proves preview-only, `/canon/commit` has idempotent canon ledger proof with `studio_trace` and `quality_report_hash`, Reader choices persist to route-choice ledger, WorldInstance relationship/memory patch candidates can be read back, branch publish candidates consume TimeEngine candidates behind `Idempotency-Key`, `database_transaction_rollback_fixture` proves rollback does not persist a probe row, P61 proves branch commit draft rollback across `route_choices` + `analytics_events`, P62 writes `production_branch_commits` plus audit event with `public_publish_enabled = false`, P63 writes `public_branch_releases` plus audit event with `public_publish_enabled = true`, and P64 writes `time_engine_telemetry_fits` plus audit event. | Remote live runtime trace is not yet proven. |
| `model-orchestration` | 多模型编排 | `partial` | Mastra agent contracts, provider abstraction, provider-agnostic config gate. | Public remote model/provider smoke and cost-aware routing are not yet proven. |
| `quality-brake` | 质量刹车 | `partial` | `qualityBrakeWorkflow`, `qualityBrakeReport`, repair tests, canon ledger commit gated by quality plus confirmation with a shared Studio trace, P60 structural branch authorization gate, and P63 release owner/ops/rollback owner gate. | Reader live-generation text quality gate against remote runtime is not yet proven. |
| `agent-eval` | Agent Eval | `partial` | Eval services, quality gate modules, scorer tests and dependency policy exist. | Learned evaluator/reranker are not promoted into public live release gate. |
| `codex-harness` | Codex Harness | `ready` | Root `npm run test`, smoke, CI artifact gate, sync manifest, release identity gate. | Keep CI evidence green on every release. |
| `web-reader-entry` | Web 阅读入口 | `partial` | `Home`, `Library`, `Story`, reader hooks, public UI boundary scan, Reader branch trace gate, backend branch publish candidate gate, and `public_branch_release_summary` exist. | Remote public runtime facade remains disabled; live Reader generation is not proven. |
| `creator-studio` | 创作者工作台 | `partial` | `/create`, `socratic-create`, local live browser QA, 300+ candidate draft and 0-2 questions. | Public Pages still has remote runtime disabled until API/Agent HTTPS origins are configured. |
| `commercial-release-chain` | 商业化发布链路 | `blocked` | GitHub Pages deploy, `runtime-readiness-ledger`, `local-live-runtime-visual-qa`, `github-pages` artifacts. | Public live runtime, real payment provider, legal/privacy and production rollback owners remain unresolved. |

## Required Evidence Artifacts

The release chain must continue to produce:

- `runtime-readiness-ledger`
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
