# P58 Reader Branch Publish Candidate Gate

Date: 2026-06-17

## Goal

把 Reader route-choice ledger、WorldInstance patch candidate 和 P57 FastAPI TimeEngine candidate ledger 接成一个可审计的 Reader branch publish candidate gate。P58 只生成候选发布账本，不写 canon，不做 production public branch publish，不做 durable multi-table WorldInstance mutation。

命令：

```bash
npm run check:reader-branch-publish
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
```

## Service Contract

新增接口：

- `POST /v1/timeline/worldlines/{worldline_id}/branches/publish-candidate`
- `GET /v1/timeline/worldlines/{worldline_id}/branches/publish-candidate`

`POST` 输入：

- Header: `Idempotency-Key`
- `branch_id`
- `route_choice_event_id`
- `source_run_id`
- `project_id`

`POST` 前置条件：

1. `worldline_id` 必须是存在的 Reader session。
2. 必须已经存在 `route_choice_ledger_only`。
3. 必须已经存在 `time_event_candidate_ledger_only`。
4. 必须提供 `Idempotency-Key`。

`POST` 输出：

- `status = candidate`
- `capability_mode = branch_publish_candidate_gate`
- `write_scope = branch_publish_candidate_ledger_only`
- `branch_publish_candidate_id`
- `route_choice_event_id`
- `time_engine_run_id`
- `consumed_time_event_ids`
- `world_instance_patch_candidate`
- `transaction_plan`
- `rollback_plan`

## Write Boundary

P58 的唯一写入是 `branch_publish_candidate_ledger_only`：

- not canon
- not branch state
- not production public branch publish
- not durable multi-table WorldInstance writeback
- not production operator authorization

它的价值是把“读者选择已经进入 ledger”和“时间引擎候选密度已经持久化”接成一个可回放的候选发布点，为下一轮数据库事务和生产发布门禁做准备。

## Acceptance

1. `backend/src/narrativeos/services/product_runtime.py` 存在 `publish_branch_candidate` 与 `branch_publish_snapshot`。
2. `backend/src/narrativeos/api/product_runtime.py` 暴露 branch publish candidate POST/GET。
3. POST 缺少 `Idempotency-Key` 时返回 `idempotency_key_required`，不写 ledger。
4. POST 缺少 TimeEngine candidate 时返回 `time_engine_candidate_required`，不写 ledger。
5. 成功 POST 写入 `branch_publish_candidate_ledger_only`，并消费 route choice 与 TimeEngine candidate event ids。
6. 重复同一个 `Idempotency-Key` 返回 `idempotent_replay = true`。
7. `/loom` 暴露 `branch_publish_summary`。
8. `check:reader-branch-publish` 进入 root `npm run test`。

## Next Gate

P58 后的下一步是 **P59 Database Transaction Rollback Fixture**：

- branch publish candidate 进入数据库事务草案，
- route choice、branch record、WorldInstance patch 和 TimeEngine event consumption 必须在同一 rollback fixture 内证明，
- 仍需生产 operator authorization 才能进入 public publish。
