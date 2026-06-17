# P60 Branch Publish Authorization Gate

Date: 2026-06-17

## Goal

在 P58 branch publish candidate 和 P59 transaction rollback fixture 之后，补上正式发布前的 operator authorization gate。P60 仍不做 production public branch publish，也不写 production branch tables；它只生成可审计的授权候选账本。

命令：

```bash
npm run check:branch-publish-authorization
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
```

## Service Contract

新增接口：

- `POST /v1/timeline/worldlines/{worldline_id}/branches/publish-authorization`
- `GET /v1/timeline/worldlines/{worldline_id}/branches/publish-authorization`

`POST` 输入：

- Header: `Idempotency-Key`
- `branch_publish_candidate_id`
- `operator_id`
- `confirmed`
- `project_id`

`POST` 前置条件：

1. `worldline_id` 必须是存在的 Reader session。
2. 必须已经存在 P58 `branch_publish_candidate_ledger_only`。
3. 必须提供 `Idempotency-Key`。
4. `operator_id` 必须存在。
5. `confirmed` 必须为 `true`。
6. 分支候选必须通过结构质量硬门禁。
7. 授权前再次运行 rollback fixture，确认探针不会持久化。

`POST` 输出：

- `status = authorized_candidate`
- `capability_mode = branch_publish_authorization_gate`
- `write_scope = branch_publish_authorization_ledger_only`
- `authorization_id`
- `operator_confirmation = confirmed`
- `quality_gate.can_authorize_branch_publish = true`
- `rollback_fixture.rollback_verified = true`
- `production_public_publish = false`

## Quality Gate

P60 当前的 hard gate 是结构质量门禁，不代替完整文本质量刹车。它检查：

- branch publish candidate 仍处于 `candidate`；
- write scope 必须是 `branch_publish_candidate_ledger_only`；
- 已消费 TimeEngine candidate events；
- 已携带 `world_instance_patch_candidate_only`。

完整文本级质量刹车仍由 Studio/Reader 生成链路和后续 production publish gate 承接。

## Write Boundary

P60 的唯一写入是 `branch_publish_authorization_ledger_only`：

- not canon
- not branch state
- not production public branch publish
- not production branch table persistence
- not remote live runtime proof

## Acceptance

1. `backend/src/narrativeos/services/product_runtime.py` 存在 `authorize_branch_publish_candidate`。
2. API 暴露 publish authorization POST/GET。
3. 缺少 `Idempotency-Key` 返回 `idempotency_key_required`。
4. 缺少 branch publish candidate 返回 `branch_publish_candidate_required`。
5. 缺少 operator 返回 `operator_id_required`。
6. 未确认返回 `operator_confirmation_required`。
7. 成功授权写入 `branch_publish_authorization_ledger_only`。
8. 重复同一 `Idempotency-Key` 返回 `idempotent_replay = true`。
9. `/loom` 暴露 `branch_publish_authorization_summary`。
10. `check:branch-publish-authorization` 进入 root `npm run test`。

## Next Gate

P61 已补 **Branch Commit Draft Gate**：

- branch record,
- WorldInstance patch,
- TimeEngine event consumption marker,
- operator authorization reference,
- all inside one transaction plan,
- still behind production release-owner approval and remote live runtime trace.

剩余下一步是 **P62 Production Release Owner Gate**：

- release-owner approval,
- remote live runtime trace reference,
- production branch table migration plan,
- public publish kill switch,
- audit trail export for ops/legal review.
