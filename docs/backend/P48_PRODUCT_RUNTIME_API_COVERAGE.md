# P48 Product Runtime API Coverage

Date: 2026-06-17

## Goal

P47 证明 Creator、Reader、Studio 的 runtime trace 词汇一致；P48 把 Reader/Studio 所依赖的后端合同测试纳入根测试，避免只做静态检查。

命令：

```bash
npm run check:product-runtime-coverage
```

根测试必须直接执行：

```bash
backend/tests/test_product_runtime_api.py
```

## Covered Product Runtime Surface

Machine anchors: scene advance, time engine, branch publish candidate, rollback fixture, branch publish authorization, branch commit draft, production branch commit, public branch publish, quality evaluate, canon commit.

| Product path | Backend endpoint | Test responsibility |
| --- | --- | --- |
| Reader choice | `/scene/advance` | 返回 candidate scene、quality trace、harness trace，并写入 route-choice branch ledger，不直接写 canon。 |
| Reader worldline | `/timeline/worldlines/{id}/loom` | 读回 persisted choice trace 和 `branch_writeback_summary`，仍不声明 public branch publish。 |
| Runtime time engine | `/timeline/worldlines/{id}/time-engine/candidates` | 生成并持久化 `time_event_candidate_ledger_only`，只作为候选时间事件，不写 canon/branch。 |
| Runtime time engine snapshot | `/timeline/worldlines/{id}/time-engine` | 读回最新 TimeEngine candidate ledger，供后续 Reader branch publish gate 使用。 |
| Reader branch publish candidate | `/timeline/worldlines/{id}/branches/publish-candidate` | 消费 route choice 与 TimeEngine candidate events，写入 `branch_publish_candidate_ledger_only`，不做生产 public publish。 |
| Reader branch rollback fixture | `/timeline/worldlines/{id}/branches/publish-rollback-fixture` | 要求已有 branch publish candidate 与 `Idempotency-Key`，证明 `rollback_fixture_only` 探针不会持久化。 |
| Reader branch publish authorization | `/timeline/worldlines/{id}/branches/publish-authorization` | 要求已有 branch publish candidate、operator 确认、结构质量门禁和 rollback fixture，写入 `branch_publish_authorization_ledger_only`，不做生产 public publish。 |
| Reader branch commit draft | `/timeline/worldlines/{id}/branches/commit-draft` | 要求已有授权候选，证明 `route_choices` + `analytics_events` 双表 rollback fixture，写入 `branch_commit_draft_ledger_only`。 |
| Reader production branch commit | `/timeline/worldlines/{id}/branches/commit` | 要求已有 commit draft 和 release-owner 确认，写入 `production_branch_table_private`，保持 `public_publish_enabled = false`。 |
| Reader public branch publish | `/timeline/worldlines/{id}/branches/public-publish` | 要求已有 private production commit、release-owner、ops reviewer、rollback owner、确认和发布开关，写入 `reader_visible_branch_release`。 |
| Studio quality evaluate | `/quality/evaluate` | 生成 quality gate、blocking reasons、canon commit readiness。 |
| Studio canon commit | `/canon/commit` | 没有人工确认或质量未过时必须 blocked；通过后才允许 committed。 |

## Acceptance

1. Root `npm run test` 执行 `backend/tests/test_product_runtime_api.py`。
2. `package.json` 暴露 `check:product-runtime-coverage`。
3. Root `npm run test` 包含 `check:product-runtime-coverage`。
4. `app/src/api/runtime.ts` 继续暴露 `advanceScene`、`evaluateQuality`、`commitCanon`。
5. TimeEngine 只进入后端 coverage，不要求 Reader/Creator public UI 暴露入口。
6. P48 artifact 不包含 candidate 正文、secret、system prompt 或代表作品。
