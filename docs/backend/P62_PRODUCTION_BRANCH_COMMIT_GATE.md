# P62 Production Branch Commit Gate

Date: 2026-06-17

## Goal

P62 moves the Reader branch chain beyond `branch_commit_draft_ledger_only` into a private production branch table write. It still does not publish the branch publicly, does not write canon, and does not enable remote live runtime. The goal is to prove durable production branch table persistence behind an explicit release-owner gate.

Command:

```bash
npm run check:production-branch-commit
PYTHON_BIN=/Users/james/Documents/PUF/workspaces/integration-harness/backend/.venv/bin/python node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
```

## Service Contract

新增接口：

- `POST /v1/timeline/worldlines/{worldline_id}/branches/commit`
- `GET /v1/timeline/worldlines/{worldline_id}/branches/commit`

`POST` 输入：

- Header: `Idempotency-Key`
- `commit_draft_id`
- `release_owner_id`
- `confirmed`
- `public_publish_enabled`
- `project_id`

`POST` 前置条件：

1. `worldline_id` 必须是存在的 Reader session。
2. 必须已经存在 P61 `branch_commit_draft_ledger_only`。
3. 如果传入 `commit_draft_id`，必须与当前 worldline 最新 commit draft 一致。
4. 必须提供 `release_owner_id`。
5. 必须显式 `confirmed = true`。
6. 必须提供 `Idempotency-Key`。
7. `public_publish_enabled` 必须保持 false。

`POST` 输出：

- `status = persisted_private`
- `capability_mode = production_branch_persistence_gate`
- `write_scope = production_branch_table_private`
- `branch_commit_id`
- `commit_draft_id`
- `authorization_id`
- `branch_publish_candidate_id`
- `release_owner_id`
- `tables_written = ["production_branch_commits", "analytics_events"]`
- `public_publish_enabled = false`
- `production_public_publish = false`

## Database Boundary

P62 introduces `production_branch_commits`:

- ORM row: `ProductionBranchCommitRow`
- Migration: `backend/db/migrations/0013_production_branch_commits.sql`
- Bootstrap schema: `backend/db/postgres_schema.sql`

The repository writes `production_branch_commits` and an `analytics_events`
audit event in the same transaction. Idempotent replay returns the same
`branch_commit_id` and does not create a second branch commit record.

## Write Boundary

P62 is a private production branch persistence gate:

- writes durable production branch table row,
- writes audit event,
- keeps `public_publish_enabled = false`,
- keeps `production_public_publish = false`,
- does not write canon,
- does not expose the branch to public Reader Web,
- does not prove remote live runtime trace.

## Acceptance

1. `backend/src/narrativeos/persistence/db.py` defines `ProductionBranchCommitRow`.
2. `backend/db/migrations/0013_production_branch_commits.sql` exists.
3. `backend/db/postgres_schema.sql` includes `production_branch_commits`.
4. `backend/src/narrativeos/persistence/repositories.py` exposes `persist_production_branch_commit`.
5. `backend/src/narrativeos/services/product_runtime.py` exposes `commit_production_branch`.
6. API exposes commit POST/GET.
7. Missing `Idempotency-Key` returns `idempotency_key_required`.
8. Missing commit draft returns `branch_commit_draft_required`.
9. Missing release owner returns `release_owner_id_required`.
10. Missing confirmation returns `release_owner_confirmation_required`.
11. Attempting `public_publish_enabled = true` returns `public_publish_disabled_for_p62`.
12. Successful call writes `production_branch_table_private`.
13. `/loom` exposes `production_branch_commit_summary`.
14. `check:production-branch-commit` is part of root `npm run test`.

## Next Gate Status

P63 now implements **Production Public Publish Gate**:

- public publish kill switch,
- Reader Web visibility switch,
- release owner + ops/legal audit export,
- rollback owner and public unpublish plan.

The next unresolved gate should move to remote live runtime trace:

- remote FastAPI HTTPS origin,
- remote Agent Runtime HTTPS origin,
- public Pages live variables,
- live Creator/Reader workflow evidence.
