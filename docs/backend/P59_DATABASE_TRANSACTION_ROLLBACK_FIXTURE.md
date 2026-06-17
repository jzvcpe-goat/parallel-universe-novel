# P59 Database Transaction Rollback Fixture

Date: 2026-06-17

## Goal

把 P58 的 Reader branch publish candidate 继续推进到数据库事务边界证明：在不写 canon、不公开发布、不持久化 WorldInstance 的前提下，证明候选发布进入数据库事务后可以被干净回滚。

命令：

```bash
npm run check:branch-publish-rollback-fixture
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
```

## Service Contract

新增接口：

- `POST /v1/timeline/worldlines/{worldline_id}/branches/publish-rollback-fixture`

`POST` 输入：

- Header: `Idempotency-Key`
- `branch_publish_candidate_id`
- `project_id`

`POST` 前置条件：

1. `worldline_id` 必须是存在的 Reader session。
2. 必须已经存在 P58 `branch_publish_candidate_ledger_only`。
3. 如果传入 `branch_publish_candidate_id`，必须与当前 worldline 最新候选一致。
4. 必须提供 `Idempotency-Key`。

`POST` 输出：

- `status = verified`
- `capability_mode = database_transaction_rollback_fixture`
- `write_scope = rollback_fixture_only`
- `transaction_probe_id`
- `insert_visible_before_rollback = true`
- `persisted_after_rollback = false`
- `rollback_verified = true`
- `production_public_publish = false`

## Implementation Boundary

P59 使用现有 `analytics_events` 表作为事务探针：

1. 在同一个数据库 session 中插入 `branch_publish_transaction_fixture`。
2. `flush` 后确认事务内可见。
3. 立即 `rollback`。
4. 重新打开 session 查询同一个 probe id，确认没有持久化。

这样可以证明数据库事务回滚机制已经被 FastAPI runtime facade 调用，但不会污染业务正史。

## Write Boundary

P59 不做：

- not canon
- not branch state
- not production public branch publish
- not production branch table persistence
- not production release-owner approval

它只证明：

- branch publish candidate 可以进入数据库事务探针，
- rollback 后不会留下 probe row，
- 未来生产发布可以基于同一边界继续扩展多表事务。

## Acceptance

1. `backend/src/narrativeos/persistence/repositories.py` 存在 `prove_analytics_event_transaction_rollback`。
2. `backend/src/narrativeos/services/product_runtime.py` 存在 `verify_branch_publish_transaction_rollback`。
3. `backend/src/narrativeos/api/product_runtime.py` 暴露 rollback fixture endpoint。
4. 缺少 `Idempotency-Key` 时返回 `idempotency_key_required`。
5. 缺少 branch publish candidate 时返回 `branch_publish_candidate_required`。
6. candidate id 不匹配时返回 `branch_publish_candidate_mismatch`。
7. 成功调用返回 `rollback_verified = true` 且 `persisted_after_rollback = false`。
8. `check:branch-publish-rollback-fixture` 进入 root `npm run test`。

## Next Gate

P60 已补 **Branch Publish Authorization Gate**：

- operator authorization candidate ledger,
- quality brake hard gate,
- authorization candidate idempotency ledger,
- rollback fixture before authorization.

剩余下一步是 **P61 Durable Multi-table Branch Commit Draft**：

- branch record,
- WorldInstance patch,
- TimeEngine event consumption marker,
- authorization reference,
- all inside one transaction plan,
- still behind production release-owner approval and remote live runtime trace.
