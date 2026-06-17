# P61 Branch Commit Draft Gate

Date: 2026-06-17

## Goal

在 P60 branch publish authorization 之后，补上 durable multi-table branch commit 的草案层。P61 仍不做 production public branch publish；它只证明当前 runtime 能把授权候选、WorldInstance patch、TimeEngine consumption marker 和分支提交计划放入同一个可审计草案，并用双表事务探针证明回滚边界。

命令：

```bash
npm run check:branch-commit-draft
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
```

## Service Contract

新增接口：

- `POST /v1/timeline/worldlines/{worldline_id}/branches/commit-draft`
- `GET /v1/timeline/worldlines/{worldline_id}/branches/commit-draft`

`POST` 输入：

- Header: `Idempotency-Key`
- `authorization_id`
- `project_id`

`POST` 前置条件：

1. `worldline_id` 必须是存在的 Reader session。
2. 必须已经存在 P58 `branch_publish_candidate_ledger_only`。
3. 必须已经存在 P60 `branch_publish_authorization_ledger_only`。
4. 如果传入 `authorization_id`，必须与当前 worldline 最新授权一致。
5. 必须提供 `Idempotency-Key`。
6. 双表 transaction fixture 必须通过。

`POST` 输出：

- `status = drafted_candidate`
- `capability_mode = branch_commit_draft_gate`
- `write_scope = branch_commit_draft_ledger_only`
- `commit_draft_id`
- `authorization_id`
- `transaction_plan.status = draft_only`
- `multitable_rollback_fixture.rollback_verified = true`
- `production_public_publish = false`

## Multi-table Fixture

P61 使用现有表做双表事务探针：

1. 在同一个 transaction 内插入 synthetic `route_choices` row。
2. 在同一个 transaction 内插入 synthetic `analytics_events` row。
3. `flush` 后确认两张表内的 probe 都可见。
4. 立即 rollback。
5. 用新 session 确认两张表都没有持久化 probe。

这证明了 commit draft 可以走多表事务边界，但没有创建生产 branch 表，也没有修改 WorldInstance 正史。

## Write Boundary

P61 的唯一持久写入是 `branch_commit_draft_ledger_only`：

- not canon
- not production public branch publish
- not durable production branch tables
- not durable WorldInstance mutation
- not remote live runtime proof

## Acceptance

1. `backend/src/narrativeos/persistence/repositories.py` 存在 `prove_branch_commit_multitable_transaction_rollback`。
2. `backend/src/narrativeos/services/product_runtime.py` 存在 `draft_branch_commit`。
3. API 暴露 commit draft POST/GET。
4. 缺少 `Idempotency-Key` 返回 `idempotency_key_required`。
5. 缺少 branch publish candidate 返回 `branch_publish_candidate_required`。
6. 缺少 authorization 返回 `branch_publish_authorization_required`。
7. authorization id 不匹配返回 `authorization_mismatch`。
8. 成功调用写入 `branch_commit_draft_ledger_only`。
9. 双表 probe 返回 `route_persisted_after_rollback = false` 与 `analytics_persisted_after_rollback = false`。
10. `/loom` 暴露 `branch_commit_draft_summary`。
11. `check:branch-commit-draft` 进入 root `npm run test`。

## Next Gate

P61 后的下一步是 **P62 Production Release Owner Gate**：

- release-owner approval,
- remote live runtime trace reference,
- production branch table migration plan,
- public publish kill switch,
- audit trail export for ops/legal review.
