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

Machine anchors: scene advance, time engine, quality evaluate, canon commit.

| Product path | Backend endpoint | Test responsibility |
| --- | --- | --- |
| Reader choice | `/scene/advance` | 返回 candidate scene、quality trace、harness trace，并写入 route-choice branch ledger，不直接写 canon。 |
| Reader worldline | `/timeline/worldlines/{id}/loom` | 读回 persisted choice trace 和 `branch_writeback_summary`，仍不声明 public branch publish。 |
| Runtime time engine | `/timeline/worldlines/{id}/time-engine/candidates` | 生成并持久化 `time_event_candidate_ledger_only`，只作为候选时间事件，不写 canon/branch。 |
| Runtime time engine snapshot | `/timeline/worldlines/{id}/time-engine` | 读回最新 TimeEngine candidate ledger，供后续 Reader branch publish gate 使用。 |
| Studio quality evaluate | `/quality/evaluate` | 生成 quality gate、blocking reasons、canon commit readiness。 |
| Studio canon commit | `/canon/commit` | 没有人工确认或质量未过时必须 blocked；通过后才允许 committed。 |

## Acceptance

1. Root `npm run test` 执行 `backend/tests/test_product_runtime_api.py`。
2. `package.json` 暴露 `check:product-runtime-coverage`。
3. Root `npm run test` 包含 `check:product-runtime-coverage`。
4. `app/src/api/runtime.ts` 继续暴露 `advanceScene`、`evaluateQuality`、`commitCanon`。
5. TimeEngine 只进入后端 coverage，不要求 Reader/Creator public UI 暴露入口。
6. P48 artifact 不包含 candidate 正文、secret、system prompt 或代表作品。
