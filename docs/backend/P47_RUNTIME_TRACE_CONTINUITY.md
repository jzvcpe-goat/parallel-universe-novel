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
| Reader | `session_id`, `candidate_scene`, `quality_brake`, `harness_trace`, snapshot | 选择只生成 candidate next scene；确认前不覆盖主线。 |
| Studio | `quality/evaluate`, `canon/commit`, `confirmed`, `quality_report` | 发布必须先质量评价，再人工确认；失败时只能 blocked/branch，不能静默写 canon。 |

## Current Status

- Creator: `ready` for local/CI candidate trace.
- Reader: `partial`; DTO 和页面调用已存在，但 public live Reader choice 尚未穿过远端 Agent Runtime facade。
- Studio: `partial`; 质量评价和确认提交入口已存在，但 shared run ledger、rollback 和远端 commit E2E 未完成。

## Acceptance

1. `package.json` 暴露 `check:runtime-trace-continuity`。
2. Root `npm run test` 包含 `check:runtime-trace-continuity`。
3. Creator public projection 继续隐藏 runtime internals。
4. Reader route 必须经过 `advanceScene` + snapshot，而不是只改本地分支。
5. Studio commit 必须包含 `confirmed: true` 和 `quality_report`。
6. Artifact 不包含 secret、system prompt、代表作品或 candidate 全文。
