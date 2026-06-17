# P47 Runtime Trace Continuity

Date: 2026-06-17

## Goal

让 Creator、Reader、Studio 使用同一套 runtime trace 语义，不再各自生成孤立状态。P47 仍然是候选态门禁：它证明三端的字段和调用边界一致，但不声称远端 live、canon commit 或 reader branch mutation 已经生产可写。当前原则是 candidate-only until explicit confirmation。

命令：

```bash
npm run check:runtime-trace-continuity
```

该命令生成：

```text
artifacts/runtime/runtime-trace-continuity-*.json
```

## Same Trace Vocabulary

| Surface | Required Fields | Boundary |
| --- | --- | --- |
| Creator | `runId`, `projectId`, `sessionId`, `candidateDraft`, `qualityPreview` | 公共 UI 可见候选正文和追问，但不暴露 `runtimeArtifact`、ledger、cost、raw state。 |
| Reader | `session_id`, `candidate_scene`, `quality_brake`, `harness_trace`, `branch_writeback`, snapshot | 选择生成 candidate next scene，并写入 route-choice ledger；确认前不覆盖主线。 |
| Studio | `quality/evaluate`, `canon/commit`, `confirmed`, `quality_report` | 发布必须先质量评价，再人工确认；失败时只能 blocked/branch，不能静默写 canon。 |

## Current Status

- Creator: `ready` for local/CI candidate trace.
- Reader: `partial`; 本地服务合同已证明 route-choice ledger 和 worldline summary，但 public live Reader choice 尚未穿过远端 Agent Runtime facade。
- Studio: `ready` for local product runtime trace; P56 proves `quality/evaluate`
  returns `studio_trace` and `quality_report_hash`, and `canon/commit` writes the
  same trace into the `canon_ledger_only` record with rollback metadata. Remote
  live commit, production operator authorization and durable multi-table publish
  remain future gates.

## P56 Studio Canon Trace Gate

P56 adds a machine-checked Studio confirmation proof:

- `quality/evaluate` returns `studio_trace` with `source_run_id` and
  `quality_report_hash`.
- `canon/commit` requires explicit confirmation and `Idempotency-Key`.
- The canon ledger record stores the same `studio_trace`.
- Idempotent replay returns the same ledger record.
- Rollback remains `available_before_public_publish`.

## Acceptance

1. `package.json` 暴露 `check:runtime-trace-continuity`。
2. Root `npm run test` 包含 `check:runtime-trace-continuity`。
3. Creator public projection 继续隐藏 runtime internals。
4. Reader route 必须经过 `advanceScene` + snapshot，并能读回 `branch_writeback_summary`，而不是只改本地分支。
5. Studio commit 必须包含 `confirmed: true`、`quality_report`、`studio_trace` 和
   `quality_report_hash`。
6. Artifact 不包含 secret、system prompt、代表作品或 candidate 全文。
