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
| `narrative-runtime-engine` | Narrative Runtime Engine | `partial` | `RuntimeArtifact` covers constraint set, kernel selection, scene plan, state preview, time consistency, quality brake, branch result; Reader choices now carry route trace and WorldInstance patch candidates; Reader branch publish candidate consumes TimeEngine candidate events; Studio confirmation now carries `studio_trace` into the canon ledger. | Production public branch publish, durable transaction rollback and remote live runtime trace are not yet proven. |
| `world-engine` | 世界引擎 | `partial` | Worldpack registry, `WorldBible`, frontend world/template data, Reader route-choice ledger proof, `world_instance_patch_candidate_only` readback, and `branch_publish_candidate_ledger_only` proof exist. | Production public branch publish and durable multi-table WorldInstance writeback are not yet proven through runtime facade. |
| `genre-kernel` | 类型内核 | `ready` | 21 `ConstraintProfile` + 21 `GenreKernel`, P4 scanner, runtime rule handshake, per-profile workflow tests. | Keep registry privacy and P4 scanner green. |
| `time-engine` | 时间引擎 | `partial` | deterministic TimeEngine generates Poisson/Hawkes-style candidate event density in Agent Runtime; FastAPI TimeEngine candidate ledger persists rollbackable `time_event_candidate_ledger_only` events for a worldline; Reader branch publish candidate consumes TimeEngine event ids. | Production public branch publish does not yet apply fitted event-density or aftershock state; production telemetry fitting remains a future gate. |
| `state-writeback` | 状态回写 | `partial` | `stateWritebackPreview`, Tool Bridge `stateDeltaCandidate`, smoke proves preview-only, `/canon/commit` has idempotent canon ledger proof with `studio_trace` and `quality_report_hash`, Reader choices persist to route-choice ledger, WorldInstance relationship/memory patch candidates can be read back, and branch publish candidates consume TimeEngine candidates behind `Idempotency-Key`. | Transactional multi-table write, production public branch publish, and database rollback fixtures are not yet proven. |
| `model-orchestration` | 多模型编排 | `partial` | Mastra agent contracts, provider abstraction, provider-agnostic config gate. | Public remote model/provider smoke and cost-aware routing are not yet proven. |
| `quality-brake` | 质量刹车 | `partial` | `qualityBrakeWorkflow`, `qualityBrakeReport`, repair tests, and canon ledger commit gated by quality plus confirmation with a shared Studio trace. | Production operator auth and Reader live-generation quality gate are not yet proven. |
| `agent-eval` | Agent Eval | `partial` | Eval services, quality gate modules, scorer tests and dependency policy exist. | Learned evaluator/reranker are not promoted into public live release gate. |
| `codex-harness` | Codex Harness | `ready` | Root `npm run test`, smoke, CI artifact gate, sync manifest, release identity gate. | Keep CI evidence green on every release. |
| `web-reader-entry` | Web 阅读入口 | `partial` | `Home`, `Library`, `Story`, reader hooks, public UI boundary scan, Reader branch trace gate, and backend branch publish candidate gate exist. | Reader branch publish candidate is backend-only; remote public runtime facade and production public branch publish are still disabled. |
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

The matrix remains conservative: database transaction rollback, production public branch publish, durable multi-table WorldInstance writeback, production TimeEngine telemetry fitting, production operator authorization, and remote live runtime are still future gates.

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
publish, not durable multi-table WorldInstance writeback, and not production
operator authorization.

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
